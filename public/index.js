let messages = [];
const userMessage = document.getElementById('message');
const submitButton = document.getElementById('submit');
const history = document.querySelector('.chat-history');

userMessage.addEventListener("input", () => {
    if (userMessage.value.trim() === "") {
        submitButton.disabled = true;
    } else {
        submitButton.disabled = false;
    }
})

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

    if (message !== "") {
        // Display user message in chat history
        const block = document.createElement('div');
        block.classList.add('block', 'user');
        block.textContent = message;
        history.appendChild(block);
        window.scrollTo(0, document.body.scrollHeight);

        userMessage.value = '';

        // Add message to array and save to sessionStorage
        messages.push({ role: "user", content: message });
        sessionStorage.setItem("chatHistory", JSON.stringify(messages));

        // Send full chat history to backend
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messages }),
        });

        const data = await response.json();

        let reply = data.reply;
        reply = reply.replace(/<think>(.*?)<\/think>/gs, '');
        reply = reply.replace(/(\n\s*-|\n\s*\d+\.)/g, "<br><br>$1");
        reply = reply.replace(/\*\*(.*?)\*\*/gs, `<span style="font-weight: bold;">$1</span>`);
        reply = reply.trim();

        // Display AI response in chat history
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.classList.add('block', 'ai');
        aiMessageDiv.innerHTML = reply;
        history.appendChild(aiMessageDiv);
        window.scrollTo(0, document.body.scrollHeight);

        // Add AI response to messages and save again
        messages.push({ role: "assistant", content: reply });
        sessionStorage.setItem("chatHistory", JSON.stringify(messages));
    } else {
        console.log("ERROR: Blank or Null message");
    }
}