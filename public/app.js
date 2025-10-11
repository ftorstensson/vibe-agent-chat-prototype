// ===============================================================================
// Configuration
// ===============================================================================

// This is the URL of our deployed Backend Orchestrator.
const BACKEND_API_URL = "https://vibe-agent-backend-534939227554.australia-southeast1.run.app/chat";

// ===============================================================================
// State Management
// ===============================================================================

// We store the current conversation_id in a global variable.
// This is the "memory" of our frontend.
let conversationId = null;

// ===============================================================================
// DOM Element References
// ===============================================================================

const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const chatMessages = document.getElementById("chat-messages");

// ===============================================================================
// Event Listeners
// ===============================================================================

// Listen for when the user submits the form (presses Send or Enter).
chatForm.addEventListener("submit", (event) => {
    // Prevent the default browser action of reloading the page.
    event.preventDefault();

    const userMessage = messageInput.value;
    if (!userMessage) return; // Don't send empty messages.

    // Display the user's message in the chat window.
    addMessageToChat(userMessage, "user");

    // Send the message to the backend and handle the response.
    sendMessageToBackend(userMessage);

    // Clear the input box for the next message.
    messageInput.value = "";
});

// ===============================================================================
// Core Functions
// ===============================================================================

/**
 * Sends a message to our Backend Orchestrator API.
 * @param {string} message The user's message.
 */
async function sendMessageToBackend(message) {
    try {
        const payload = {
            message: message,
            // Include the conversation_id if we have one.
            conversation_id: conversationId, 
        };

        const response = await fetch(BACKEND_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const responseData = await response.json();

        // The backend ALWAYS returns a conversation_id. We must save it.
        if (responseData.conversation_id) {
            conversationId = responseData.conversation_id;
        }

        // Render the agent's response based on what it contains.
        renderAgentResponse(responseData);

    } catch (error) {
        console.error("Error sending message to backend:", error);
        addMessageToChat("Sorry, I encountered an error. Please check the console.", "agent");
    }
}

/**
 * Renders the different types of responses from the agent.
 * @param {object} responseData The JSON data from the backend.
 */
function renderAgentResponse(responseData) {
    let content = "";

    if (responseData.reply) {
        content += `<p>${responseData.reply}</p>`;
    }

    if (responseData.plan) {
        content += `<h4>${responseData.plan.title}</h4>`;
        content += "<ol>";
        responseData.plan.steps.forEach(step => {
            content += `<li>${step}</li>`;
        });
        content += "</ol>";
    }

    if (responseData.code_file) {
        content += `<h4>${responseData.code_file.filename}</h4>`;
        content += `<pre>${escapeHtml(responseData.code_file.code)}</pre>`;
    }
    
    addMessageToChat(content, "agent");
}

// ===============================================================================
// UI Helper Functions
// ===============================================================================

/**
 * Creates a new message element and adds it to the chat window.
 * @param {string} content The HTML content of the message.
 * @param {'user' | 'agent'} sender The sender of the message.
 */
function addMessageToChat(content, sender) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", `${sender}-message`);
    messageElement.innerHTML = content;
    chatMessages.appendChild(messageElement);

    // Automatically scroll to the bottom to show the new message.
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * A simple utility to escape HTML special characters to prevent rendering issues
 * when displaying code.
 * @param {string} unsafe The raw string.
 * @returns {string} The escaped string.
 */
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}