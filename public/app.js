// ===============================================================================
// Vibe Coder Chat Prototype Frontend
// v3.0 (Observability UI)
// This version introduces the 'Observability Badge'. It now visually displays
// which agent was invoked for a given response, fulfilling a key strategic goal.
// ===============================================================================

// ===============================================================================
// Configuration & State
// ===============================================================================

const BACKEND_API_URL = "https://vibe-agent-backend-534939227554.australia-southeast1.run.app";
let conversationId = null;

const converter = new showdown.Converter();

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

async function loadConversationHistory() {
    try {
        const response = await fetch(`${BACKEND_API_URL}/conversations`);
        if (!response.ok) throw new Error("Failed to fetch history");
        const conversations = await response.json();
        
        historyList.innerHTML = "";
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

async function loadConversation(id) {
    try {
        console.log(`Loading conversation: ${id}`);
        const response = await fetch(`${BACKEND_API_URL}/conversation/${id}`);
        if (!response.ok) throw new Error("Failed to fetch conversation details");
        const convoData = await response.json();

        startNewConversation();
        conversationId = id;

        convoData.messages.forEach(message => {
            if (message.role === 'user') {
                addMessageToChat({ text: message.content }, 'user');
            } else if (message.role === 'assistant') {
                renderAgentResponse(message.content);
            }
        });

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

    addMessageToChat({ text: userMessage }, "user");
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
        addMessageToChat({ error: "Sorry, an error occurred. Please check the console." }, "agent");
    }
}

/**
 * [REFACTORED] Renders the agent's response, now with Observability Badge.
 * @param {object} responseData The structured data from the backend.
 */
function renderAgentResponse(responseData) {
    let contentPayload = {
        text: responseData.reply || "",
        plan: responseData.plan || null,
        code: responseData.code_file || null,
        invoked_agent: responseData.invoked_agent || null, // Capture the agent name
    };
    addMessageToChat(contentPayload, "agent");
}


// ===============================================================================
// UI Helper Functions
// ===============================================================================

/**
 * [REFACTORED] Adds a message to the chat UI. Now handles a payload object.
 * @param {object} payload The content payload for the message.
 * @param {string} sender 'user' or 'agent'.
 */
function addMessageToChat(payload, sender) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", `${sender}-message`);

    let content = "";

    // [NEW] Add the Observability Badge if an agent was invoked
    if (sender === 'agent' && payload.invoked_agent) {
        content += `<div class="agent-badge">${payload.invoked_agent.toUpperCase()}</div>`;
    }

    if (payload.text) {
        const htmlReply = converter.makeHtml(payload.text);
        content += htmlReply;
    }

    if (payload.plan) {
        content += `<h4>${payload.plan.title}</h4><ol>`;
        payload.plan.steps.forEach(step => { content += `<li>${step}</li>`; });
        content += "</ol>";
    }
    
    if (payload.code) {
        content += `<h4>${payload.code.filename}</h4><pre>${escapeHtml(payload.code.code)}</pre>`;
    }

    if (payload.error) {
        content += `<p class="error-message">${payload.error}</p>`;
    }

    messageElement.innerHTML = content;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}