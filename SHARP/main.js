import express from 'express'
import net from 'net'
import cors from 'cors'
import postgres from 'postgres'
import dns from 'dns/promises'

const SHARP_PORT = +process.env.SHARP_PORT || 5000
const HTTP_PORT = +process.env.HTTP_PORT || SHARP_PORT + 1
const DOMAIN = process.env.DOMAIN_NAME || 'localhost'
const sql = postgres(process.env.DATABASE_URL)

const verifyUser = (u, d) =>
    sql`SELECT * FROM users WHERE username=${u} AND domain=${d}`.then(r => r[0])

const logEmail = (fa, fd, ta, td, s, b, st = 'pending') =>
    sql`INSERT INTO emails (from_address, from_domain, to_address, to_domain, subject, body, status) VALUES (${fa}, ${fd}, ${ta}, ${td}, ${s}, ${b}, ${st}) RETURNING id`

const parseSharpAddress = a => {
    const m = a.match(/^(.+)#([^:]+)(?::(\d+))?$/)
    if (!m) throw new Error('Invalid SHARP address format')
    return { username: m[1], domain: m[2], port: m[3] && +m[3] }
}

const sendJSON = (s, m) => s.writable && s.write(JSON.stringify(m) + '\n')
const sendError = (s, e) => (sendJSON(s, { type: 'ERROR', message: e }), s.end())

const app = express();
app.use(cors());
app.use(express.json());

async function handleSharpMessage(socket, raw, state) {
    try {
        const cmd = JSON.parse(raw)
        switch (state.step) {
            case 'HELLO':
                if (cmd.type !== 'HELLO') return sendError(socket, 'Expected HELLO')
                state.from = cmd.server_id
                parseSharpAddress(state.from)
                state.step = 'MAIL_TO'
                return sendJSON(socket, { type: 'OK' })

            case 'MAIL_TO':
                if (cmd.type !== 'MAIL_TO') return sendError(socket, 'Expected MAIL_TO')
                state.to = cmd.address
                const to = parseSharpAddress(state.to)
                const addr = `${to.domain}${to.port ? ':' + to.port : ''}`
                if (addr !== DOMAIN)
                    return sendError(
                        socket,
                        `This server does not handle mail for ${to.domain}`
                    )
                const user = await verifyUser(to.username, DOMAIN)
                if (!user) return sendError(socket, 'Recipient user not found')
                state.step = 'DATA'
                return sendJSON(socket, { type: 'OK' })

            case 'DATA':
                if (cmd.type !== 'DATA') return sendError(socket, 'Expected DATA')
                state.step = 'RECEIVING_DATA'
                return sendJSON(socket, { type: 'OK' })

            case 'RECEIVING_DATA':
                if (cmd.type === 'EMAIL_CONTENT') {
                    state.subject = cmd.subject
                    state.body = cmd.body
                } else if (cmd.type === 'END_DATA') {
                    await processEmail(state)
                    sendJSON(socket, { type: 'OK', message: 'Email processed' })
                    return socket.end()
                } else {
                    return sendError(socket, 'Expected EMAIL_CONTENT or END_DATA')
                }
                break

            default:
                return sendError(socket, `Unhandled state: ${state.step}`)
        }
    } catch (e) {
        sendError(socket, 'Invalid message format or processing error')
    }
}

async function processEmail({ from, to, subject, body }) {
    const f = parseSharpAddress(from)
    const t = parseSharpAddress(to)
    await logEmail(from, f.domain, to, t.domain, subject, body)
}

async function resolveSRV(domain) {
    const recs = await dns.resolveSrv(`_sharp._tcp.${domain}`)
    if (!recs.length) throw new Error('No SHARP server records found')
    const srv = recs[0]
    const hosts = await dns.resolve4(srv.name)
    if (!hosts.length)
        throw new Error('Could not resolve SHARP server address')
    return { host: hosts[0], port: srv.port }
}

async function validateRemoteServer(domain) {
    for (const proto of ['https://', 'http://']) {
        try {
            const res = await fetch(`${proto}${domain}/api/server/health`)
            if (!res.ok) continue
            const data = await res.json()
            if (data.protocol === 'SHARP/1.0')
                return { domain: data.domain, protocol: proto, isValid: true }
        } catch { }
    }
    return { isValid: false, error: 'Server not reachable or invalid' }
}

async function sendEmailToRemoteServer(email) {
    const recipient = parseSharpAddress(email.to)
    const remoteHost = recipient.domain
    const explicitPort = recipient.port

    console.log(`[Client Send] Attempting to send email to ${email.to}`)

    try {
        let serverInfo
        if (explicitPort) {
            console.log(
                `[Client Send] Using explicit address: ${remoteHost}:${explicitPort}`
            )
            serverInfo = {
                host: remoteHost,
                port: explicitPort,
                name: `${remoteHost}:${explicitPort}`
            }

            try {
                const lookupResult = await dns.lookup(serverInfo.host)
                console.log(
                    `[Client Send] DNS lookup for ${serverInfo.host} successful: Address: ${lookupResult.address}, Family: ${lookupResult.family}`
                )
            } catch (dnsError) {
                console.error(
                    `[Client Send] DNS lookup FAILED for ${serverInfo.host}:`,
                    dnsError
                )
                throw new Error(
                    `DNS lookup failed for ${serverInfo.host}: ${dnsError.message}`
                )
            }
        } else {
            console.log(
                `[Client Send] Looking up SHARP server for domain ${remoteHost}...`
            )
            const srv = await resolveSRV(remoteHost)
            const v = await validateRemoteServer(remoteHost)
            if (!v.isValid)
                throw new Error(
                    `Invalid SHARP server config for domain ${remoteHost}: ${v.error}`
                )
            serverInfo = { host: srv.host, port: srv.port, name: remoteHost }
        }

        console.log(
            `[Client Send] Preparing to connect to target SHARP server at ${serverInfo.host}:${serverInfo.port}`
        )
        const client = new net.Socket()

        return new Promise((resolve, reject) => {
            const timeoutDuration = 15000
            console.log(`[Client Send] Setting connection timeout: ${timeoutDuration}ms`)
            const timeout = setTimeout(() => {
                console.error(
                    `[Client Send] Connection attempt timed out after ${timeoutDuration}ms`
                )
                client.destroy()
                reject(
                    new Error(
                        `Connection timed out connecting to ${serverInfo.host}:${serverInfo.port}`
                    )
                )
            }, timeoutDuration)

            console.log(
                `[Client Send] Initiating connection to ${serverInfo.host}:${serverInfo.port}...`
            )

            client.connect(serverInfo.port, serverInfo.host, () => {
                clearTimeout(timeout)
                console.log(
                    `[Client Send] Successfully connected to SHARP server ${serverInfo.name} (${serverInfo.host}:${serverInfo.port})`
                )
                const steps = [
                    { type: 'HELLO', server_id: email.from },
                    { type: 'MAIL_TO', address: email.to },
                    { type: 'DATA' },
                    { type: 'EMAIL_CONTENT', subject: email.subject, body: email.body },
                    { type: 'END_DATA' }
                ]
                let idx = 0
                let buf = ''
                client.on('data', d => {
                    buf += d
                    while (buf.includes('\n')) {
                        const [line, ...rest] = buf.split('\n')
                        buf = rest.join('\n')
                        if (!line.trim()) continue
                        const res = JSON.parse(line)
                        if (res.type === 'ERROR') {
                            client.end()
                            return reject(new Error(res.message))
                        }
                        if (res.type === 'OK') {
                            if (res.message === 'Email processed') {
                                client.end()
                                return resolve({ success: true })
                            }
                            if (idx < steps.length) {
                                client.write(JSON.stringify(steps[idx++]) + '\n')
                            }
                        }
                    }
                })
                client.on('error', e => reject(e))
                client.write(JSON.stringify(steps[idx++]) + '\n')
            })

            client.on('error', err => {
                clearTimeout(timeout)
                console.error(
                    `[Client Send] Connection error for ${serverInfo.host}:${serverInfo.port}: ${err.message}`,
                    err
                )
                if (err.code === 'ECONNREFUSED') {
                    reject(
                        new Error(
                            `Connection refused by ${serverInfo.host}:${serverInfo.port}`
                        )
                    )
                } else if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
                    reject(
                        new Error(
                            `DNS resolution failed for ${serverInfo.host}: ${err.message}`
                        )
                    )
                } else {
                    reject(new Error(`Connection error: ${err.message}`))
                }
            })
        })
    } catch (error) {
        console.error(`[Client Send] Error during setup/lookup for ${email.to}:`, error)
        throw new Error(
            `Failed to resolve or connect to remote server: ${error.message}`
        )
    }
}

app.post('/api/send', async (req, res) => {
    let logEntry
    try {
        const { from, to, subject, body } = req.body
        const fp = parseSharpAddress(from)
        const tp = parseSharpAddress(to)
        logEntry = await logEmail(
            from,
            fp.domain,
            to,
            tp.domain,
            subject,
            body,
            'sending'
        )
        const id = logEntry[0]?.id
        const result = await Promise.race([
            sendEmailToRemoteServer({ from, to, subject, body }),
            new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error('Overall send operation timed out')),
                    16000
                )
            )
        ])
        if (id) await sql`UPDATE emails SET status='sent' WHERE id=${id}`
        return res.json(result)
    } catch (error) {
        const id = logEntry?.[0]?.id
        if (id)
            await sql`UPDATE emails SET status='failed',
        error_message=${error.message} WHERE id=${id}`
        return res.status(400).json({ success: false, message: error.message })
    }
})

app.get('/api/server/health', (_, res) =>
    res.json({ status: 'ok', protocol: 'SHARP/1.0', domain: DOMAIN })
)

net
    .createServer(socket => {
        const state = { step: 'HELLO', buffer: '' }
        socket.on('data', d => {
            state.buffer += d
            let idx
            while ((idx = state.buffer.indexOf('\n')) > -1) {
                const line = state.buffer.slice(0, idx)
                state.buffer = state.buffer.slice(idx + 1)
                handleSharpMessage(socket, line, state)
            }
        })
    })
    .listen(SHARP_PORT, () => {
        console.log(
            `SHARP TCP server listening on port ${SHARP_PORT} (HTTP on ${HTTP_PORT})`
        )
    })

app.listen(HTTP_PORT, () => {
    console.log(`HTTP server listening on port ${HTTP_PORT}`)
})
