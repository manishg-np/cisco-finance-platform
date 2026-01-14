document.addEventListener("DOMContentLoaded", () => {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");

    const addMessage = (message, sender) => {
        const messageElement = document.createElement("div");
        messageElement.classList.add("chat-message", `${sender}-message`);
        messageElement.textContent = message;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const handleSend = async () => {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage(message, "user");
        userInput.value = "";
        userInput.disabled = true;
        sendBtn.disabled = true;

        try {
            const response = await fetch("http://127.0.0.1:5000/api/chatbot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ question: message }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            addMessage(data.answer, "bot");

        } catch (error) {
            console.error("Error fetching response:", error);
            addMessage("Sorry, something went wrong. Please check the console and try again.", "bot");
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
        }
    };

    sendBtn.addEventListener("click", handleSend);
    userInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            handleSend();
        }
    });

    addMessage("Hello! How can I help you with your Attio data today?", "bot");
});
