const { default: ollama } = require('ollama');
const express = require("express");
require('dotenv').config();
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

app.get("/", (req, res) => {
	res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, function () {
	console.log("Started application on port %d", PORT);
});

app.post('/chat', async (req, res) => {
    try {
        const userMessages = req.body.messages;

        // Set the appropriate headers for streaming
        res.setHeader('Content-Type', 'application/json');
        res.flushHeaders(); // This is needed to ensure that the connection remains open

        // Send the message to Ollama API
        const response = await ollama.chat({
            model: process.env.MODEL,
            messages: userMessages,
            stream: true
        });

        // Stream each part of the response
        for await (const part of response) {
            // Send the current part to the frontend
            res.write(JSON.stringify({ reply: part.message.content, done: part.done }));

            // If the message is finished (done), end the stream
            if (part.done) {
                res.end(); // Close the connection after all parts are sent
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong with the AI request.' });
    }
});
  
