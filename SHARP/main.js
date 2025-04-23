const express = require('express');
const net = require('net');
const cors = require('cors');
const postgres = require('postgres');

const args = process.argv.slice(2);
const SHARP_PORT = args[0] ? parseInt(args[0]) : 5000;
const HTTP_PORT = SHARP_PORT + 1;

const sql = postgres(process.env.DATABASE_URL);

// DATABASE
async function getDomainInfo(domainName) {
    const domains = await sql`
        SELECT * FROM domains 
        WHERE domain_name = ${domainName} 
        AND is_active = true
    `;
    return domains[0];
}
async function verifyUser(username, domain) {
    const users = await sql`
        SELECT * FROM users 
        WHERE username = ${username} 
        AND host = ${domain}
    `;
    return users[0];
}
async function logEmail(fromAddress, fromDomain, toAddress, toDomain, subject, body, status = 'pending') {
    return await sql`
        INSERT INTO emails (
            from_address, from_domain, to_address, to_domain, 
            subject, body, status
        ) VALUES (
            ${fromAddress}, ${fromDomain}, ${toAddress}, ${toDomain}, 
            ${subject}, ${body}, ${status}
        ) RETURNING id
    `;
}

// DATABASE END

async function validateRemoteServer(domain) {
    try {
        // Try HTTPS first, fall back to HTTP
        const protocols = ['https://', 'http://'];

        for (const protocol of protocols) {
            try {
                const response = await fetch(`${protocol}${domain}/api/server/health`);
                if (!response.ok) continue;

                const data = await response.json();
                if (data.protocol !== 'SHARP/1.0') {
                    throw new Error('Not a valid SHARP server');
                }

                return {
                    domain: data.domain,
                    protocol,
                    isValid: true
                };
            } catch (e) {
                continue;
            }
        }
        throw new Error('Server not reachable');
    } catch (error) {
        return {
            isValid: false,
            error: error.message
        };
    }
}
//

function parseSharpAddress(address) {
    const match = address.match(/^(.+)#(.+)$/);
    if (!match) throw new Error('Invalid SHARP address format');
    return {
        username: match[1],
        domain: match[2]
    };
}

const app = express();
app.use(cors());
app.use(express.json());

const tcpServer = net.createServer((socket) => {
    let state = {
        currentStep: 'HELLO',
        from: null,
        to: null,
        subject: null,
        body: null,
        buffer: ''
    };

    console.log('Client connected');

    socket.on('data', (data) => {
        state.buffer += data.toString();

        while (true) {
            const messageEnd = state.buffer.indexOf('\n');
            if (messageEnd === -1) break;

            const message = state.buffer.substring(0, messageEnd);
            state.buffer = state.buffer.substring(messageEnd + 1);

            handleSharpMessage(socket, message, state);
        }
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });

    socket.on('end', () => {
        console.log('Client disconnected');
    });
});

async function handleSharpMessage(socket, message, state) {
    try {
        const cmd = JSON.parse(message);
        console.log('Received:', cmd);

        switch (state.currentStep) {
            case 'HELLO':
                if (cmd.type === 'HELLO') {
                    state.from = cmd.server_id;
                    const fromParts = parseSharpAddress(state.from);
                    const fromDomain = await getDomainInfo(fromParts.domain);
                    const fromUser = await verifyUser(fromParts.username, fromParts.domain);

                    if (!fromDomain) {
                        sendError(socket, 'Sender domain not registered');
                        return;
                    }
                    if (!fromUser) {
                        sendError(socket, 'Sender not registered');
                        return;
                    }

                    state.currentStep = 'MAIL_TO';
                    sendResponse(socket, { type: 'OK' });
                } else {
                    sendError(socket, 'Expected HELLO');
                }
                break;

            case 'MAIL_TO':
                if (cmd.type === 'MAIL_TO') {
                    state.to = cmd.address;
                    const toParts = parseSharpAddress(state.to);
                    const toDomain = await getDomainInfo(toParts.domain);
                    const toUser = await verifyUser(toParts.username, toParts.domain);

                    if (!toDomain) {
                        sendError(socket, 'Recipient domain not registered');
                        return;
                    }
                    if (!toUser) {
                        sendError(socket, 'Recipient not registered');
                        return;
                    }

                    state.currentStep = 'DATA';
                    sendResponse(socket, { type: 'OK' });
                } else {
                    sendError(socket, 'Expected MAIL_TO');
                }
                break;

            case 'DATA':
                if (cmd.type === 'DATA') {
                    state.currentStep = 'EMAIL_CONTENT';
                    sendResponse(socket, { type: 'OK' });
                } else {
                    sendError(socket, 'Expected DATA');
                }
                break;

            case 'EMAIL_CONTENT':
                if (cmd.type === 'EMAIL_CONTENT') {
                    state.subject = cmd.subject;
                    state.body = cmd.body;
                    state.currentStep = 'END_DATA';
                    sendResponse(socket, { type: 'OK' });
                } else {
                    sendError(socket, 'Expected EMAIL_CONTENT');
                }
                break;

            case 'END_DATA':
                if (cmd.type === 'END_DATA') {
                    try {
                        await processEmail(state);
                        state.currentStep = 'HELLO';
                        sendResponse(socket, { type: 'OK', message: 'Email processed' });
                    } catch (error) {
                        sendError(socket, error.message);
                    }
                } else {
                    sendError(socket, 'Expected END_DATA');
                }
                break;
        }
    } catch (e) {
        sendError(socket, 'Invalid message format');
    }
}

function sendResponse(socket, response) {
    socket.write(JSON.stringify(response) + '\n');
}

function sendError(socket, message) {
    socket.write(JSON.stringify({ type: 'ERROR', message }) + '\n');
    socket.end();
}

async function processEmail(state) {
    try {
        const fromParts = parseSharpAddress(state.from);
        const toParts = parseSharpAddress(state.to);

        // Log the email
        await logEmail(
            state.from,
            fromParts.domain,
            state.to,
            toParts.domain,
            state.subject,
            state.body
        );

        console.log(`Email processed successfully`);
        console.log(`From: ${state.from}`);
        console.log(`To: ${state.to}`);
        console.log(`Subject: ${state.subject}`);

    } catch (error) {
        throw new Error(`Failed to process email: ${error.message}`);
    }
}

async function sendEmailToRemoteServer(email) {
    const recipient = parseSharpAddress(email.to);

    const serverInfo = await validateRemoteServer(recipient.domain);
    if (!serverInfo.isValid) {
        throw new Error(`Invalid SHARP server at ${recipient.domain}: ${serverInfo.error}`);
    }

    const client = new net.Socket();

    return new Promise((resolve, reject) => {
        client.connect(recipient.port, recipient.host, () => {
            console.log(`Connected to remote SHARP server ${recipient.host}:${recipient.port}`);

            const steps = [
                { type: 'HELLO', server_id: email.from },
                { type: 'MAIL_TO', address: email.to },
                { type: 'DATA' },
                { type: 'EMAIL_CONTENT', subject: email.subject, body: email.body },
                { type: 'END_DATA' }
            ];

            let currentStep = 0;
            let responses = [];

            client.on('data', (data) => {
                const response = JSON.parse(data.toString().trim());
                responses.push(response);

                if (response.type === 'ERROR') {
                    client.end();
                    reject(response);
                    return;
                }

                if (response.type === 'OK' && response.message === 'Email processed') {
                    client.end();
                    resolve({ success: true, responses });
                    return;
                }

                if (response.type === 'OK' && currentStep < steps.length) {
                    client.write(JSON.stringify(steps[currentStep++]) + '\n');
                }
            });

            client.on('error', (err) => {
                reject({ success: false, message: `Connection error: ${err.message}` });
            });

            client.write(JSON.stringify(steps[currentStep++]) + '\n');
        });
    });
}

app.post('/', async (req, res) => {
    const { from, to, subject, body } = req.body;

    try {
        const result = await sendEmailToRemoteServer({ from, to, subject, body });
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to send email'
        });
    }
});

app.get('/api/server/health', (req, res) => {
    res.json({
        status: 'ok',
        protocol: 'SHARP/1.0',
        domain: process.env.DOMAIN_NAME || 'localhost'
    });
});

tcpServer.listen(SHARP_PORT, () => {
    console.log(`SHARP TCP server listening on port ${SHARP_PORT} (HTTP on ${HTTP_PORT})`);
    console.log(`Server address format: user#localhost:${SHARP_PORT}`);
});

app.listen(HTTP_PORT, () => {
    console.log(`HTTP server listening on port ${HTTP_PORT}`);
});