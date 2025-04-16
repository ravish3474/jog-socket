const WebSocket = require('ws');
const express = require('express');
const app = express();
app.use(express.json());

const PORT_WS = 8080;
const PORT_API = 3010;

const wss = new WebSocket.Server({ port: PORT_WS });
const clients = new Map(); // session_token => WebSocket

// WebSocket Connection from Java App
wss.on('connection', ws => {
    console.log('Java App connected. Awaiting session token...');

    ws.on('message', message => {
        try {
            const data = JSON.parse(message);
            if (data.session_token) {
                clients.set(data.session_token, ws);
                console.log(`Registered client with token: ${data.session_token}`);
            } else {
                console.log('Received message:', message);
            }
        } catch (err) {
            console.log('Invalid JSON received:', message);
        }
    });

    ws.on('close', () => {
        for (const [token, client] of clients.entries()) {
            if (client === ws) {
                clients.delete(token);
                console.log(`Client with token ${token} disconnected`);
                break;
            }
        }
    });
});

// API to Notify Java App for Reprint
app.post('/notify-reprint', (req, res) => {
    const { file_id, barcode, printer_id, printer_name, session_token } = req.body;

    if (!file_id || !barcode || !printer_id || !printer_name || !session_token) {
        return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
    }

    const client = clients.get(session_token);
    if (client) {
        client.send(JSON.stringify({
            action: 'reprint_request',
            file_id,
            barcode,
            printer_id,
            printer_name
        }));
        console.log(`Reprint request sent to ${printer_name}`);
        res.json({ status: 'success', message: 'Reprint request sent' });
    } else {
        res.status(500).json({ status: 'error', message: 'Target printer not connected' });
    }
});

// API to Notify Java App for Redesign
app.post('/notify-redesign', (req, res) => {
    const { file_id, barcode, designer_id, designer_name, note, session_token } = req.body;

    if (!file_id || !barcode || !designer_id || !designer_name || !note || !session_token) {
        return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
    }

    const client = clients.get(session_token);
    if (client) {
        client.send(JSON.stringify({
            action: 'redesign_request',
            file_id,
            barcode,
            designer_id,
            designer_name,
            note
        }));
        console.log(`Redesign request sent to ${designer_name}`);
        res.json({ status: 'success', message: 'Redesign request sent' });
    } else {
        res.status(500).json({ status: 'error', message: 'Target designer not connected' });
    }
});

// ✅ API to Send Files to a Specific Java App
app.post('/send-files', (req, res) => {
    const { file_paths, file_ids, order_code, session_token } = req.body;

    if (!file_paths || !file_ids || !session_token || file_paths.length !== file_ids.length) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid data. Ensure session_token, file paths and IDs are provided with matching lengths.'
        });
    }

    const client = clients.get(session_token);
    if (client) {
        client.send(JSON.stringify({
            action: 'upload_files',
            file_paths,
            file_ids,
            order_code
        }));
        console.log(`Emitted file paths: ${file_paths.join(', ')} to token: ${session_token}`);
        res.json({ status: 'success', message: 'Data sent to Java app' });
    } else {
        res.status(500).json({ status: 'error', message: 'Target client not connected' });
    }
});

// Start REST API Server
app.listen(PORT_API, () => {
    console.log(`Express API listening on port ${PORT_API}`);
});

// Start WebSocket Server
console.log(`WebSocket server listening on port ${PORT_WS}`);
