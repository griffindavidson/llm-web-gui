let messages = [];
const userMessage = document.getElementById('message');
const submitButton = document.getElementById('submit');
const history = document.querySelector('.chat-history');

userMessage.addEventListener("input", () => {
    submitButton.disabled = userMessage.value.trim() === "";
});

userMessage.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !submitButton.disabled) {
        sendMessage();
    }
});

window.onload = function() {
    const storedMessages = sessionStorage.getItem('chatHistory');

    if (storedMessages) {
        messages = JSON.parse(storedMessages);
    }

    messages.forEach(message => {
        const block = document.createElement('div');
        block.classList.add('block', message.role === 'user' ? 'user' : 'ai');
        block.textContent = message.content;
        history.appendChild(block);
    });
}

async function sendMessage() {
    const message = userMessage.value.trim();
    let reply = ''; // Stores the filtered content to display
    let replyCopy = ''; // Stores the unfiltered content to save in history

    if (message !== "") {
        // Display user message in chat history
        const block = document.createElement('div');
        block.classList.add('block', 'user');
        block.textContent = message;
        history.appendChild(block);
        window.scrollTo(0, document.body.scrollHeight);

        userMessage.value = '';
        submitButton.disabled = true;

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

                    // Save unfiltered reply to `replyCopy` before modifying it
                    if (!part.done) {
                        replyCopy += part.reply; // Collect unfiltered message
                        updateChatUI(part.reply); // Display the raw message (for now)
                    }
                }
            } catch (error) {
                console.error('Error reading the stream:', error);
                break; // Exit the loop if there is an error
            }
        }

        // Apply text filtering after message is complete
        reply = replyCopy.replace(/<think>(.*?)<\/think>/gs, ''); // Remove <think> tags
        reply = reply.replace(/(\n\s*-|\n\s*\d+\.)/g, "<br><br>$1"); // Handle list formatting
        reply = reply.replace(/\*\*(.*?)\*\*/gs, `<span style="font-weight: bold;">$1</span>`); // Bold text

        aiMessageDiv.innerHTML = reply; // Update UI with the filtered content

        // Add AI response to messages and save again
        messages.push({ role: "assistant", content: replyCopy }); // Save unfiltered message to history
        sessionStorage.setItem("chatHistory", JSON.stringify(messages));
    } else {
        console.log("ERROR: Blank or Null message");
    }
}
