// ===============================================================================
// Configuration & State
// ===============================================================================

const BACKEND_API_URL = "https://vibe-agent-backend-534939227554.australia-southeast1.run.app";
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
// Event Listeners & Initialization
// ===============================================================================

document.addEventListener("DOMContentLoaded", () => {
    loadConversationHistory();
});

chatForm.addEventListener("submit", handleSendMessage);
newChatButton.addEventListener("click", startNewConversation);

// ===============================================================================
// Core Functions
// ===============================================================================

/**
 * Fetches and displays the list of past conversations.
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
            item.dataset.id = convo.id;
            item.addEventListener("click", () => loadConversation(convo.id));
            historyList.appendChild(item);
        });
    } catch (error) {
        console.error("Error loading conversation history:", error);
    }
}

/**
 * NEW: Fetches and renders the full history of a selected conversation.
 * @param {string} id The ID of the conversation to load.
 */
async function loadConversation(id) {
    try {
        console.log(`Loading conversation: ${id}`);
        const response = await fetch(`${BACKEND_API_URL}/conversation/${id}`);
        if (!response.ok) throw new Error("Failed to fetch conversation details");
        const convoData = await response.json();

        startNewConversation(); // Clear the UI
        conversationId = id; // Set the active conversation ID

        // Render each message from the history
        convoData.messages.forEach(message => {
            if (message.role === 'user') {
                addMessageToChat(message.content, 'user');
            } else if (message.role === 'assistant') {
                renderAgentResponse(message.content);
            }
        });

        // Highlight the selected chat in the history panel
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === id);
        });

    } catch (error) {
        console.error("Error loading conversation:", error);
    }
}

function handleSendMessage(event) {
    event.preventDefault();
    const userMessage = messageInput.value;
    if (!userMessage) return;

    addMessageToChat(userMessage, "user");
    sendMessageToBackend(userMessage);
    messageInput.value = "";
}

function startNewConversation() {
    conversationId = null;
    chatMessages.innerHTML = "";
    messageInput.placeholder = "Start a new mission...";
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('active');
    });
    console.log("Started new conversation.");
}

async function sendMessageToBackend(message) {
    const isNewConversation = !conversationId;
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

        if (isNewConversation) {
             loadConversationHistory();
        }

    } catch (error) {
        console.error("Error sending message:", error);
        addMessageToChat("Sorry, an error occurred. Please check the console.", "agent");
    }
}

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