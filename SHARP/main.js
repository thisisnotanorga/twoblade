import express from 'express'
import net from 'net'
import cors from 'cors'
import postgres from 'postgres'
import dns from 'dns/promises'

const SHARP_PORT = +process.env.SHARP_PORT || 5000
const HTTP_PORT = +process.env.HTTP_PORT || SHARP_PORT + 1
const DOMAIN = process.env.DOMAIN_NAME || 'localhost'
const sql = postgres(process.env.DATABASE_URL)

const PROTOCOL_VERSION = 'SHARP/1.0'

const verifyUser = (u, d) =>
    sql`SELECT * FROM users WHERE username=${u} AND domain=${d}`.then(r => r[0])
const logEmail = (fa, fd, ta, td, s, b, ct = 'text/plain', hb = null, st = 'pending') =>
    sql`INSERT INTO emails (from_address, from_domain, to_address, to_domain, subject, body, content_type, html_body, status) 
        VALUES (${fa}, ${fd}, ${ta}, ${td}, ${s}, ${b}, ${ct}, ${hb}, ${st}) RETURNING id`

const parseSharpAddress = a => {
    const m = a.match(/^(.+)#([^:]+)(?::(\d+))?$/)
    if (!m) throw new Error('Invalid SHARP address format')
    return { username: m[1], domain: m[2], port: m[3] && +m[3] }
}
const sendJSON = (s, m) => s.writable && s.write(JSON.stringify(m) + '\n')
const sendError = (s, e) => {
    sendJSON(s, { type: 'ERROR', message: e })
    s.end()
}

async function handleSharpMessage(socket, raw, state) {
    try {
        const cmd = JSON.parse(raw)
        switch (state.step) {
            case 'HELLO':
                if (cmd.type !== 'HELLO') {
                    sendError(socket, 'Expected HELLO')
                    return
                }
                if (cmd.protocol !== PROTOCOL_VERSION) {
                    sendError(socket, `Unsupported protocol version: ${cmd.protocol}`)
                    return
                }
                state.from = cmd.server_id
                parseSharpAddress(state.from)
                state.step = 'MAIL_TO'
                sendJSON(socket, { type: 'OK', protocol: PROTOCOL_VERSION })
                return

            case 'MAIL_TO':
                if (cmd.type !== 'MAIL_TO') {
                    sendError(socket, 'Expected MAIL_TO')
                    return
                }
                state.to = cmd.address
                const to = parseSharpAddress(state.to)
                const addr = to.port
                    ? `${to.domain}:${to.port}`
                    : to.domain
                if (addr !== DOMAIN) {
                    sendError(
                        socket,
                        `This server does not handle mail for ${to.domain}`
                    )
                    return
                }
                const user = await verifyUser(to.username, DOMAIN)
                if (!user) {
                    sendError(socket, 'Recipient user not found')
                    return
                }
                state.step = 'DATA'
                sendJSON(socket, { type: 'OK' })
                return

            case 'DATA':
                if (cmd.type !== 'DATA') {
                    sendError(socket, 'Expected DATA')
                    return
                }
                state.step = 'RECEIVING_DATA'
                sendJSON(socket, { type: 'OK' })
                return

            case 'RECEIVING_DATA':
                if (cmd.type === 'EMAIL_CONTENT') {
                    state.subject = cmd.subject;
                    state.body = cmd.body;
                    state.content_type = cmd.content_type || 'text/plain';
                    state.html_body = cmd.html_body || null;
                } else if (cmd.type === 'END_DATA') {
                    await processEmail(state);
                    sendJSON(socket, { type: 'OK', message: 'Email processed' });
                    socket.end();
                } else {
                    sendError(socket, 'Expected EMAIL_CONTENT or END_DATA');
                }
                return;

            default:
                sendError(socket, `Unhandled state: ${state.step}`)
        }
    } catch {
        sendError(socket, 'Invalid message format or processing error')
    }
}

async function processEmail({ from, to, subject, body, content_type, html_body }) {
    const f = parseSharpAddress(from)
    const t = parseSharpAddress(to)
    await logEmail(from, f.domain, to, t.domain, subject, body, content_type, html_body)
}

async function resolveSRV(domain) {
    const recs = await dns.resolveSrv(`_sharp._tcp.${domain}`)
    if (!recs.length) throw new Error('No SHARP server records found')
    const srv = recs[0]
    const hosts = await dns.resolve4(srv.name)
    if (!hosts.length) throw new Error('Could not resolve SHARP server address')
    return { host: hosts[0], port: srv.port }
}

async function validateRemoteServer(domain) {
    for (const proto of ['https://', 'http://']) {
        try {
            const res = await fetch(`${proto}${domain}/api/server/health`)
            if (!res.ok) continue
            const data = await res.json()
            if (data.protocol === 'SHARP/1.0') {
                return { domain: data.domain, protocol: proto, isValid: true }
            }
        } catch { }
    }
    return { isValid: false, error: 'Server not reachable or invalid' }
}

async function sendEmailToRemoteServer(email) {
    const rec = parseSharpAddress(email.to)
    const server = rec.port
        ? { host: rec.domain, port: rec.port }
        : await (async () => {
            const srv = await resolveSRV(rec.domain)
            const v = await validateRemoteServer(rec.domain)
            if (!v.isValid) {
                throw new Error(
                    `Invalid SHARP server config for domain ${rec.domain}: ${v.error}`
                )
            }
            return { host: srv.host, port: srv.port }
        })()
    const client = new net.Socket()

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            client.destroy()
            reject(new Error('Connection timed out'))
        }, 5000)

        client.connect(server.port, server.host, () => {
            clearTimeout(timeout)
            const steps = [
                { type: 'HELLO', server_id: email.from, protocol: PROTOCOL_VERSION },
                { type: 'MAIL_TO', address: email.to },
                { type: 'DATA' },
                {
                    type: 'EMAIL_CONTENT',
                    subject: email.subject,
                    body: email.body,
                    content_type: email.content_type,
                    html_body: email.html_body
                },
                { type: 'END_DATA' }
            ]
            let idx = 0
            const responses = []
            let buf = ''

            client.on('data', d => {
                buf += d
                while (buf.includes('\n')) {
                    const [line, ...rest] = buf.split('\n')
                    buf = rest.join('\n')
                    if (!line.trim()) continue
                    const res = JSON.parse(line)
                    responses.push(res)
                    if (res.type === 'ERROR') {
                        client.end()
                        return reject(new Error(res.message))
                    }
                    if (res.type === 'OK') {
                        if (res.message === 'Email processed') {
                            client.end()
                            return resolve({ success: true, responses })
                        }
                        if (idx < steps.length) {
                            client.write(JSON.stringify(steps[idx++]) + '\n')
                            if (
                                steps[idx - 1].type === 'EMAIL_CONTENT' &&
                                steps[idx?.type] === 'END_DATA'
                            ) {
                                client.write(JSON.stringify(steps[idx++]) + '\n')
                            }
                        }
                    }
                }
            })

            client.on('error', e => reject(new Error(e.message)))
            client.write(JSON.stringify(steps[idx++]) + '\n')
        })

        client.on('error', e => {
            clearTimeout(timeout)
            reject(new Error(e.message))
        })
    })
}

const app = express()
app.use(cors(), express.json())

app.post('/api/send', async (req, res) => {
    let logEntry
    try {
        const { from, to, subject, body, content_type = 'text/plain', html_body } = req.body
        const fp = parseSharpAddress(from)
        const tp = parseSharpAddress(to)

        try {
            await validateRemoteServer(tp.domain)
        } catch (e) {
            await logEmail(from, fp.domain, to, tp.domain, subject, body, content_type, html_body, 'failed')
            throw new Error(`Invalid destination: ${e.message}`)
        }

        logEntry = await logEmail(from, fp.domain, to, tp.domain, subject, body, content_type, html_body, 'sending')
        const id = logEntry[0]?.id

        try {
            const result = await Promise.race([
                sendEmailToRemoteServer({ from, to, subject, body, content_type, html_body }),
                new Promise((_, r) => setTimeout(() => r(new Error('Connection timed out')), 10000))
            ])

            if (result.responses?.some(r => r.type === 'ERROR')) {
                if (id) await sql`UPDATE emails SET status='rejected' WHERE id=${id}`
                return res.status(400).json({ success: false, message: 'Remote server rejected the email' })
            }

            if (id) await sql`UPDATE emails SET status='sent' WHERE id=${id}`
            return res.json(result)
        } catch (e) {
            throw e
        }
    } catch (e) {
        const id = logEntry?.[0]?.id
        if (id) {
            await sql`UPDATE emails SET status='failed', error_message=${e.message} WHERE id=${id}`
        }
        return res.status(400).json({ success: false, message: e.message })
    }
})

app.get('/api/server/health', (_, res) =>
    res.json({ status: 'ok', protocol: PROTOCOL_VERSION, domain: DOMAIN })
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
        socket.on('error', () => { })
        socket.on('end', () => { })
    })
    .listen(SHARP_PORT, () => {
        console.log(
            `SHARP TCP server listening on port ${SHARP_PORT} ` +
            `(HTTP on ${HTTP_PORT})`
        )
        console.log(`Server address format: user#${DOMAIN}:${SHARP_PORT}`)
    })

app.listen(HTTP_PORT, () => {
    console.log(`HTTP server listening on port ${HTTP_PORT}`)
})
