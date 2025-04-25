import express from 'express';
import net from 'net';
import cors from 'cors';
import postgres from 'postgres';
import dns from 'dns/promises';

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
        AND domain = ${domain}
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
    const match = address.match(/^(.+)#([^:]+)(?::(\d+))?$/);
    if (!match) throw new Error('Invalid SHARP address format. Expected user#host or user#host:port');
    return {
        username: match[1],
        domain: match[2],
        port: match[3] ? parseInt(match[3]) : null
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
    const clientAddress = socket.remoteAddress + ':' + socket.remotePort;
    try {
        console.log(`[${clientAddress}] Raw message: ${message}`);
        const cmd = JSON.parse(message);
        console.log(`[${clientAddress}] Received command:`, cmd);

        switch (state.currentStep) {
            case 'HELLO':
                console.log(`[${clientAddress}] Handling HELLO state`);
                if (cmd.type === 'HELLO') {
                    state.from = cmd.server_id;
                    console.log(`[${clientAddress}] From address set: ${state.from}`);

                    let fromParts;
                    try {
                        fromParts = parseSharpAddress(state.from);
                        console.log(`[${clientAddress}] Parsed from address:`, fromParts);
                    } catch (parseError) {
                        console.error(`[${clientAddress}] Error parsing 'from' address: ${state.from}`, parseError);
                        sendError(socket, `Invalid 'from' address format: ${state.from}`);
                        return; // Stop processing
                    }

                    let fromUser;
                    try {
                        console.log(`[${clientAddress}] Verifying user: ${fromParts.username} on domain ${fromParts.domain}`);

                        console.log(`[${clientAddress}] Proceeding to MAIL_TO state.`);
                        state.currentStep = 'MAIL_TO';
                        console.log(`[${clientAddress}] Sending OK response.`);
                        sendResponse(socket, { type: 'OK' });
                        console.log(`[${clientAddress}] OK response sent.`);

                    } catch (dbError) {
                        console.error(`[${clientAddress}] Database or other error during user verification:`, dbError);
                        sendError(socket, 'Internal server error during user verification');
                        return;
                    }

                } else {
                    console.warn(`[${clientAddress}] Expected HELLO, got ${cmd.type}`);
                    sendError(socket, 'Expected HELLO');
                }
                break;

            case 'MAIL_TO':
                console.log(`[${clientAddress}] Handling MAIL_TO state`);
                if (cmd.type === 'MAIL_TO') {
                    state.to = cmd.address;
                    console.log(`[${clientAddress}] To address set: ${state.to}`);
                    let toParts;
                    try {
                        toParts = parseSharpAddress(state.to);
                        console.log(`[${clientAddress}] Parsed to address:`, toParts);
                    } catch (parseError) {
                        console.error(`[${clientAddress}] Error parsing 'to' address: ${state.to}`, parseError);
                        sendError(socket, `Invalid 'to' address format: ${state.to}`);
                        return;
                    }

                    try {
                        const expectedDomain = process.env.DOMAIN_NAME;
                        const isLocalDomain = toParts.domain + (toParts.port ? `:${toParts.port}` : '') === expectedDomain;

                        if (isLocalDomain) {
                            console.log(`[${clientAddress}] Verifying local recipient: ${toParts.username}`);
                            const toUser = await verifyUser(toParts.username, expectedDomain);
                            if (!toUser) {
                                console.log(`[${clientAddress}] Local recipient ${state.to} not found.`);
                                sendError(socket, 'Recipient user not found');
                                return;
                            }
                            console.log(`[${clientAddress}] Local recipient ${state.to} verified.`);
                        } else {
                            console.warn(`[${clientAddress}] Received MAIL_TO for non-local domain ${toParts.domain}. This server should not handle it directly via TCP.`);
                            sendError(socket, `This server does not handle mail for ${toParts.domain}`);
                            return;
                        }

                        state.currentStep = 'DATA';
                        console.log(`[${clientAddress}] Sending OK response for MAIL_TO.`);
                        sendResponse(socket, { type: 'OK' });
                        console.log(`[${clientAddress}] OK response sent.`);

                    } catch (dbError) {
                        console.error(`[${clientAddress}] Database or other error during recipient verification:`, dbError);
                        sendError(socket, 'Internal server error during recipient verification');
                        return;
                    }

                } else {
                    console.warn(`[${clientAddress}] Expected MAIL_TO, got ${cmd.type}`);
                    sendError(socket, 'Expected MAIL_TO');
                }
                break;

            case 'DATA':
                console.log(`[${clientAddress}] Handling DATA state`);
                if (cmd.type === 'DATA') {
                    // Acknowledge the DATA command
                    state.currentStep = 'RECEIVING_DATA'; // Set state to expect email content
                    console.log(`[${clientAddress}] Received DATA command. Sending OK.`);
                    sendResponse(socket, { type: 'OK' });
                    console.log(`[${clientAddress}] OK response sent for DATA.`);
                } else {
                    console.warn(`[${clientAddress}] Expected DATA, got ${cmd.type}`);
                    sendError(socket, 'Expected DATA');
                }
                break;

            case 'RECEIVING_DATA':
                console.log(`[${clientAddress}] Handling RECEIVING_DATA state`);
                if (cmd.type === 'EMAIL_CONTENT') {
                    state.subject = cmd.subject;
                    state.body = cmd.body;
                    console.log(`[${clientAddress}] Received EMAIL_CONTENT. Subject: ${state.subject}`);
                    // Don't send OK yet, wait for END_DATA
                } else if (cmd.type === 'END_DATA') {
                    console.log(`[${clientAddress}] Received END_DATA. Processing email.`);
                    try {
                        // Process the complete email
                        await processEmail(state); // Use your existing function
                        console.log(`[${clientAddress}] Email processed successfully. Sending final OK.`);
                        // Send final confirmation
                        sendResponse(socket, { type: 'OK', message: 'Email processed' });
                        console.log(`[${clientAddress}] Final OK sent. Ending connection.`);
                        socket.end(); // Close the connection after successful processing
                    } catch (processingError) {
                        console.error(`[${clientAddress}] Error processing email:`, processingError);
                        sendError(socket, `Failed to process email: ${processingError.message}`);
                    }
                    // Reset state or handle connection end
                    state.currentStep = 'CLOSED'; // Or similar terminal state
                } else {
                    console.warn(`[${clientAddress}] Expected EMAIL_CONTENT or END_DATA, got ${cmd.type}`);
                    sendError(socket, 'Expected EMAIL_CONTENT or END_DATA');
                }
                break;

            default:
                console.warn(`[${clientAddress}] Unhandled state: ${state.currentStep}`);
                sendError(socket, `Unhandled server state: ${state.currentStep}`);
                break;
        }
    } catch (e) {
        // Catch JSON parsing errors or other synchronous errors
        console.error(`[${clientAddress}] Error processing message: ${message}`, e);
        // Check if socket is still writable before sending error
        if (socket.writable) {
            sendError(socket, 'Invalid message format or processing error');
        } else {
            console.error(`[${clientAddress}] Socket not writable, cannot send error response.`);
        }
    }
}

function sendResponse(socket, response) {
    const clientAddress = socket.remoteAddress + ':' + socket.remotePort;
    if (socket.writable) {
        socket.write(JSON.stringify(response) + '\n');
    } else {
        console.warn(`[${clientAddress}] Socket not writable when trying to send response:`, response);
    }
}

function sendError(socket, message) {
    const clientAddress = socket.remoteAddress + ':' + socket.remotePort;
    if (socket.writable) {
        console.log(`[${clientAddress}] Sending ERROR: ${message}`);
        socket.write(JSON.stringify({ type: 'ERROR', message }) + '\n');
        console.log(`[${clientAddress}] Ending socket after error.`);
        socket.end(); // End the connection after sending the error
    } else {
        console.warn(`[${clientAddress}] Socket not writable when trying to send ERROR: ${message}`);
    }
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

async function resolveSRV(domain) {
    try {
        const srvRecords = await dns.resolveSrv(`_sharp._tcp.${domain}`);
        if (!srvRecords || srvRecords.length === 0) {
            throw new Error('No SHARP server records found');
        }

        const srv = srvRecords[0];

        const addresses = await dns.resolve4(srv.name);
        if (!addresses || addresses.length === 0) {
            throw new Error('Could not resolve SHARP server address');
        }

        return {
            host: addresses[0],
            port: srv.port,
            name: srv.name
        };
    } catch (error) {
        throw new Error(`DNS lookup failed: ${error.message}`);
    }
}

async function sendEmailToRemoteServer(email) {
    let recipient;
    try {
        recipient = parseSharpAddress(email.to);
    } catch (e) {
        throw new Error(`Invalid recipient address format: ${email.to}`);
    }
    const remoteHost = recipient.domain;
    const explicitPort = recipient.port;

    console.log(`Attempting to send email to ${email.to}`);

    try {
        let serverInfo;

        if (explicitPort) {
            console.log(`Using explicit address: ${remoteHost}:${explicitPort}`);
            if (!net.isIP(remoteHost) && remoteHost.toLowerCase() !== 'localhost') {
                console.warn(`Warning: Using non-IP hostname "${remoteHost}" with explicit port. Ensure it resolves correctly.`);
            }
            serverInfo = {
                host: remoteHost,
                port: explicitPort,
                name: `${remoteHost}:${explicitPort}`
            };
        } else {
            console.log(`Looking up SHARP server for domain ${remoteHost}...`);
            serverInfo = await resolveSRV(remoteHost);
            console.log(`Found SHARP server via SRV at ${serverInfo.name} (${serverInfo.host}:${serverInfo.port})`);

            const validation = await validateRemoteServer(remoteHost); // Validate the original domain
            if (!validation.isValid) {
                throw new Error(`Invalid SHARP server configuration for domain ${remoteHost}: ${validation.error}`);
            }
        }

        console.log(`Connecting to target SHARP server at ${serverInfo.host}:${serverInfo.port}`);

        const client = new net.Socket();

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                client.destroy();
                reject(new Error('Connection timed out'));
            }, 5000);

            client.connect(serverInfo.port, serverInfo.host, () => {
                clearTimeout(timeout);
                console.log(`Connected to SHARP server ${serverInfo.name} (${serverInfo.host}:${serverInfo.port})`);

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
    } catch (error) {
        throw new Error(`Failed to resolve or connect to remote server: ${error.message}`);
    }
}

app.post('/api/send', async (req, res) => {
    console.log('Received email request:', req.body);
    const { from, to, subject, body } = req.body;

    try {
        parseSharpAddress(from);
        parseSharpAddress(to);
    } catch (e) {
        console.error('Address parsing error:', e);
        return res.status(400).json({
            success: false,
            message: e.message || 'Invalid address format in request body'
        });
    }

    try {
        // Set a timeout for the remote server connection
        const result = await Promise.race([
            sendEmailToRemoteServer({ from, to, subject, body }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timed out')), 10000)
            )
        ]);

        console.log('Email sent successfully:', result);
        res.json(result);
    } catch (error) {
        console.error('Email sending error:', error);
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