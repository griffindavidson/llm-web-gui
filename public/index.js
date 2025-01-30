let messages = [];
const userMessage = document.getElementById('message');
const history = document.querySelector('.chat-history');

userMessage.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
        userMessage.value = '';
    }
});

window.onload = function() {
    const storedMessages = sessionStorage.getItem('chatHistory');
    userMessage.value = '';

    if (storedMessages) {
        messages = JSON.parse(storedMessages);
    }

    messages.forEach(message => {
        const block = document.createElement('div');
        block.classList.add('block', message.role === 'user' ? 'user' : 'ai');
        block.innerHTML += message.content;
        addName(block);
        history.appendChild(block);
    });
}

function addName(parent) {
    let name = document.createElement('div');
    name.classList.add('name');

    name.style.position = "absolute";
    name.style.left = `0`;
    name.style.top = `-1rem`;
    name.style.fontSize = `0.75rem`;

    if (parent.classList.contains('user')) {
        name.textContent = "You";
    } else {
        name.textContent = "Assistant";
    }

    name.style.color = `#676767`;

    parent.appendChild(name);
}

async function sendMessage() {
    const message = userMessage.value.trim();
    let reply = ''; // Stores the filtered content to display

    if (message !== "") {
        // Display user message in chat history
        const block = document.createElement('div');
        block.classList.add('block', 'user');
        block.textContent = message;
        addName(block);
        history.appendChild(block);
        window.scrollTo(0, document.body.scrollHeight);

        userMessage.value = '';

        // Add message to array and save to sessionStorage
        messages.push({ role: "user", content: message });
        sessionStorage.setItem("chatHistory", JSON.stringify(messages));

        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messages }),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let partialResponse = '';  // Store the accumulated response
        let aiMessageDiv = document.createElement('div');
        aiMessageDiv.classList.add('block', 'ai');
        addName(aiMessageDiv);
        document.querySelector('.chat-history').appendChild(aiMessageDiv);

        // Function to update the chat UI with new content
        function updateChatUI(content) {
            aiMessageDiv.innerHTML += content;
            window.scrollTo(0, document.body.scrollHeight);
        }

        // Read the stream and process it
        while (!done) {
            try {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunk = decoder.decode(value, { stream: true });

                // Append the new chunk to the partial response
                partialResponse += chunk;

                // Check if we have a complete JSON object by checking for a closing brace '}' in the response
                let part;
                let lastOpenBrace = partialResponse.lastIndexOf('{');
                let lastCloseBrace = partialResponse.lastIndexOf('}');

                if (lastCloseBrace > lastOpenBrace) {
                    // We have a valid JSON object between the last open and close brace
                    try {
                        part = JSON.parse(partialResponse); // Parse the full response up to this point
                        partialResponse = ''; // Reset the partial response buffer for the next part
                    } catch (error) {
                        console.error('Error parsing chunk:', error);
                        continue;  // Skip if it's still an invalid JSON object
                    }
                    
                    if (!part.done) {
                        reply += part.reply;
                        updateChatUI(part.reply);
                    }
                }
            } catch (error) {
                console.error('Error reading the stream:', error);
                break; // Exit the loop if there is an error
            }
        }

        // Apply text filtering after message is complete
        reply = reply.replace(/<think>(.*?)<\/think>/gs, ''); // Remove <think> tags
        reply = reply.replace(/(\n\s*-|\n\s*\d+\.)/g, "<br><br>$1"); // Handle list formatting
        reply = reply.replace(/\*\*(.*?)\*\*/gs, `<span style="font-weight: bold;">$1</span>`); // Bold text
        reply = reply.replace(/```([\s\S]*?)```/g, (code) => {
            // Escape HTML characters inside code block
            const escapedCode = code
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        
            return `<pre><code>${escapedCode}</code></pre>`;
        });
        
        aiMessageDiv.innerHTML = reply; // Update UI with the filtered content
        addName(aiMessageDiv);

        // Add AI response to messages and save again
        messages.push({ role: "assistant", content: reply }); // Save unfiltered message to history
        sessionStorage.setItem("chatHistory", JSON.stringify(messages));
    } else {
        console.log("ERROR: Blank or Null message");
    }
}
