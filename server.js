const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

let clients = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/call', (req, res) => {
    const payload = JSON.stringify(req.body);
    clients.forEach(c => c.write(`data: ${payload}\n\n`));
    res.sendStatus(200);
});

app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.push(res);
    req.on('close', () => {
        clients = clients.filter(c => c !== res);
    });
});

app.listen(port, () => {
    console.log(`🚀 Queue server running on http://localhost:${port}`);
});
