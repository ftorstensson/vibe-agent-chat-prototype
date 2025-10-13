// ===============================================================================
// Configuration
// ===============================================================================

const BACKEND_API_URL = "https://vibe-agent-backend-534939227554.australia-southeast1.run.app";

// ===============================================================================
// State Management
// ===============================================================================

let conversationId = null;

// ===============================================================================
// DOM Element References
// ===============================================================================

const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const chatMessages = document.getElementById("chat-messages");
const historyList = document.getElementById("history-list");
const newChatButton = document.getElementById("new-chat-button");

// ===============================================================================
// Event Listeners
// ===============================================================================

// Run initialization logic when the page first loads.
document.addEventListener("DOMContentLoaded", () => {
    loadConversationHistory();
});

// Listen for the user to submit a message.
chatForm.addEventListener("submit", handleSendMessage);

// Listen for the user to click the "New Chat" button.
newChatButton.addEventListener("click", startNewConversation);

// ===============================================================================
// Core Functions
// ===============================================================================

/**
 * Fetches the list of conversations from the backend and renders them.
 */
async function loadConversationHistory() {
    try {
        const response = await fetch(`${BACKEND_API_URL}/conversations`);
        if (!response.ok) throw new Error("Failed to fetch history");
        const conversations = await response.json();
        
        historyList.innerHTML = ""; // Clear existing list
        conversations.forEach(convo => {
            const item = document.createElement("div");
            item.classList.add("history-item");
            item.textContent = convo.title;
            item.dataset.id = convo.id; // Store the ID on the element
            item.addEventListener("click", () => {
                // For this version, clicking a chat just starts a new one for simplicity.
                // A future version would load the full chat history.
                startNewConversation();
                alert(`In a future version, this would load conversation:\n${convo.id}\n'${convo.title}'`);
            });
            historyList.appendChild(item);
        });
    } catch (error) {
        console.error("Error loading conversation history:", error);
    }
}

/**
 * Handles the user submitting a message to the agent.
 * @param {Event} event The form submission event.
 */
function handleSendMessage(event) {
    event.preventDefault();
    const userMessage = messageInput.value;
    if (!userMessage) return;

    addMessageToChat(userMessage, "user");
    sendMessageToBackend(userMessage);
    messageInput.value = "";
}

/**
 * Resets the state to start a new conversation.
 */
function startNewConversation() {
    conversationId = null;
    chatMessages.innerHTML = ""; // Clear the chat window
    messageInput.placeholder = "Start a new mission...";
    console.log("Starting new conversation.");
}

/**
 * Sends a message to our Backend Orchestrator API.
 * @param {string} message The user's message.
 */
async function sendMessageToBackend(message) {
    try {
        const payload = { message, conversation_id: conversationId };
        const response = await fetch(`${BACKEND_API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        
        const responseData = await response.json();

        if (responseData.conversation_id) {
            conversationId = responseData.conversation_id;
        }

        renderAgentResponse(responseData);

        // If this was the first message of a new chat, refresh the history.
        if (chatMessages.children.length <= 2) {
             loadConversationHistory();
        }

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
    if (responseData.reply) content += `<p>${responseData.reply}</p>`;
    if (responseData.plan) {
        content += `<h4>${responseData.plan.title}</h4><ol>`;
        responseData.plan.steps.forEach(step => { content += `<li>${step}</li>`; });
        content += "</ol>";
    }
    if (responseData.code_file) {
        content += `<h4>${responseData.code_file.filename}</h4><pre>${escapeHtml(responseData.code_file.code)}</pre>`;
    }
    addMessageToChat(content, "agent");
}

// ===============================================================================
// UI Helper Functions
// ===============================================================================

function addMessageToChat(content, sender) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", `${sender}-message`);
    messageElement.innerHTML = content;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}