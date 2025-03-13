const WebSocket = require('ws');
const express = require('express');

const app = express();
app.use(express.json());

// WebSocket Server (Separate Port)
const wss = new WebSocket.Server({ port: 8080 });

let connectedClient = null; // Track connected Java desktop app

wss.on('connection', ws => {
    console.log('Java Desktop App connected');
    connectedClient = ws;

    ws.on('message', message => {
        console.log(`Received from Java App: ${message}`);
    });

    ws.on('close', () => {
        console.log('Java Desktop App disconnected');
        connectedClient = null;
    });
});

// Endpoint to send file paths and IDs from PHP API to Java app
app.post('/send-files', (req, res) => {
    const { file_paths, file_ids ,order_code} = req.body;

    if (!file_paths || !file_ids || file_paths.length !== file_ids.length) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid data. Ensure file paths and IDs are provided with matching lengths.'
        });
    }

    if (connectedClient) {
        connectedClient.send(JSON.stringify({
            action: 'upload_files',
            file_paths,
            file_ids,
            order_code
        }));
        console.log(`Emitted file paths: ${file_paths.join(', ')}`);
        res.json({ status: 'success', message: 'Data sent to Java app' });
    } else {
        res.status(500).json({ status: 'error', message: 'No Java app connected' });
    }
});

// Start Express API
app.listen(3010, () => console.log('Node.js API running on port 3010'));
