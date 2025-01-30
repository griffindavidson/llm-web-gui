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
	  // No need to stringify the message, just use it directly
	  const userMessages = req.body.messages;
  
	  // Send the message to Ollama API
	  const response = await ollama.chat({
		model: process.env.MODEL,
		messages: userMessages  // Pass as an object with role and content
	  });
  
	  // Send the response back to the frontend
	  res.json({ reply: response.message.content });
  
	} catch (error) {
	  console.error(error);
	  res.status(500).json({ error: 'Something went wrong with the AI request.' });
	}
});
  
