const express = require('express');
const net = require('net');
const cors = require('cors');

const args = process.argv.slice(2);
const SHARP_PORT = args[0] ? parseInt(args[0]) : 5000;
const HTTP_PORT = SHARP_PORT + 1;

function parseSharpAddress(address) {
    const match = address.match(/^(.+)#(.+?)(?::(\d+))?$/);
    if (!match) throw new Error('Invalid SHARP address format');
    return {
        username: match[1],
        host: match[2],
        port: match[3] ? parseInt(match[3]) : 5000
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
                    state.currentStep = 'MAIL_TO';
                    sendResponse(socket, { type: 'OK' });
                } else {
                    sendError(socket, 'Expected HELLO');
                }
                break;

            case 'MAIL_TO':
                if (cmd.type === 'MAIL_TO') {
                    state.to = cmd.address;
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
        const recipient = parseSharpAddress(state.to);
        console.log(`Processing email for: ${recipient.username} at ${recipient.host}:${recipient.port}`);

        if ((recipient.host === 'localhost' || recipient.host === '127.0.0.1') && recipient.port === SHARP_PORT) {
            console.log(`Handling local delivery for ${recipient.username}`);
            console.log('Received local email:', {
                from: state.from,
                to: state.to,
                subject: state.subject,
                body: state.body
            });
            return Promise.resolve();
        }

        console.log(`Forwarding to remote SHARP server: ${recipient.host}:${recipient.port}`);
        return new Promise((resolve, reject) => {
            const remoteClient = new net.Socket();

            remoteClient.connect(recipient.port, recipient.host, () => {
                console.log('Connected to remote SHARP server');

                const steps = [
                    { type: 'HELLO', server_id: state.from },
                    { type: 'MAIL_TO', address: state.to },
                    { type: 'DATA' },
                    { type: 'EMAIL_CONTENT', subject: state.subject, body: state.body },
                    { type: 'END_DATA' }
                ];

                let currentStep = 0;
                let responses = [];

                remoteClient.on('data', (data) => {
                    const response = JSON.parse(data.toString().trim());
                    responses.push(response);

                    if (response.type === 'ERROR') {
                        remoteClient.end();
                        reject(new Error(response.message));
                        return;
                    }

                    if (response.type === 'OK') {
                        if (currentStep < steps.length) {
                            remoteClient.write(JSON.stringify(steps[currentStep++]) + '\n');
                        } else {
                            remoteClient.end(() => {
                                resolve();
                            });
                        }
                    }
                });

                remoteClient.on('error', (err) => {
                    remoteClient.end();
                    reject(new Error(`Failed to connect to remote SHARP server: ${err.message}`));
                });
            });

            remoteClient.on('error', (err) => {
                reject(new Error(`Failed to connect to remote SHARP server: ${err.message}`));
            });
        });
    } catch (error) {
        throw new Error(`Failed to process email: ${error.message}`);
    }
}

app.post('/', async (req, res) => {
    const { from, to, subject, body } = req.body;

    try {
        parseSharpAddress(to);

        const client = new net.Socket();

        client.connect(SHARP_PORT, 'localhost', () => {
            console.log(`HTTP handler connected to local TCP server on port ${SHARP_PORT}`);
            const steps = [
                { type: 'HELLO', server_id: from },
                { type: 'MAIL_TO', address: to },
                { type: 'DATA' },
                { type: 'EMAIL_CONTENT', subject, body },
                { type: 'END_DATA' }
            ];

            let currentStep = 0;
            let responses = [];
            let responseSent = false;

            client.on('data', (data) => {
                const messages = data.toString().trim().split('\n');
                for (const message of messages) {
                    if (!message) continue;

                    try {
                        const response = JSON.parse(message);
                        console.log('HTTP handler received TCP response:', response);
                        responses.push(response);

                        if (response.type === 'ERROR') {
                            if (!responseSent) {
                                res.status(400).json(response);
                                responseSent = true;
                            }
                            client.end();
                            return;
                        }

                        if (response.type === 'OK' && response.message === 'Email processed') {
                            if (!responseSent) {
                                res.json({ success: true, responses });
                                responseSent = true;
                            }
                            client.end();
                            return;
                        } else if (response.type === 'OK') {
                            if (client.writable && currentStep < steps.length) {
                                client.write(JSON.stringify(steps[currentStep++]) + '\n');
                            }
                        }
                    } catch (parseError) {
                        console.error('HTTP handler failed to parse TCP response:', message, parseError);
                        if (!responseSent) {
                            res.status(500).json({ success: false, message: 'Internal server error: Invalid TCP response' });
                            responseSent = true;
                        }
                        client.end();
                        return;
                    }
                }
            });

            client.on('end', () => {
                console.log('HTTP handler connection to local TCP server ended.');
                if (!responseSent) {
                    console.warn('TCP connection ended before final response was received/sent.');
                    if (responses.length > 0 && responses[responses.length - 1].type === 'OK' && responses[responses.length - 1].message === 'Email processed') {
                        res.json({ success: true, responses });
                    } else {
                        res.status(500).json({ success: false, message: 'Connection closed unexpectedly', responses });
                    }
                    responseSent = true;
                }
            });

            client.on('error', (err) => {
                console.error('HTTP handler connection error:', err);
                if (!responseSent) {
                    res.status(500).json({ success: false, message: `TCP Connection Error: ${err.message}` });
                    responseSent = true;
                }
                client.destroy();
            });

            // Start the protocol flow
            client.write(JSON.stringify(steps[currentStep++]) + '\n');
        });

        client.on('error', (err) => {
            if (!res.headersSent && !responseSent) {
                console.error('HTTP handler failed to connect to local TCP server:', err);
                res.status(500).json({ success: false, message: `Failed to connect to local SHARP server: ${err.message}` });
                responseSent = true;
            } else if (!responseSent) {
                console.error('HTTP handler connection error after headers sent, but response flag not set:', err);
            }
        });

    } catch (error) {
        console.error('Error processing HTTP request:', error);
        if (!res.headersSent) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
});

tcpServer.listen(SHARP_PORT, () => {
    console.log(`SHARP TCP server listening on port ${SHARP_PORT} (HTTP on ${HTTP_PORT})`);
    console.log(`Server address format: user#localhost:${SHARP_PORT}`);
});

app.listen(HTTP_PORT, () => {
    console.log(`HTTP server listening on port ${HTTP_PORT}`);
});