// ===============================================================================
// Vibe Coder Chat Prototype Frontend
// v5.0 (Real-Time UX - Final)
// This version is a complete refactor to a Firestore-driven, real-time
// architecture. It uses onSnapshot listeners to enable a "thinking" indicator,
// displays an automatic welcome message, and shows an agent observability badge.
// ===============================================================================

// ===============================================================================
// Configuration & State
// ===============================================================================

const BACKEND_API_URL = "https://vibe-agent-backend-534939227554.australia-southeast1.run.app";
let conversationId = null;
let unsubscribeMessages = null; // To store the Firestore listener cleanup function

// Firebase is initialized automatically by /__/firebase/init.js
const db = firebase.firestore();
const converter = new showdown.Converter();

// ===============================================================================
// DOM Element References
// ===============================================================================

const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const chatMessages = document.getElementById("chat-messages");
const newChatButton = document.getElementById("new-chat-button");

// ===============================================================================
// Event Listeners & Initialization
// ===============================================================================

document.addEventListener("DOMContentLoaded", () => {
    startNewConversation();
});

chatForm.addEventListener("submit", handleSendMessage);
newChatButton.addEventListener("click", startNewConversation);

// ===============================================================================
// Core Functions - REFACTORED FOR REAL-TIME
// ===============================================================================

function startNewConversation() {
    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }

    conversationId = null;
    chatMessages.innerHTML = "";

    const welcomePayload = {
        reply: "Hi there! I'm the Vibe Coder Project Manager. What amazing idea can I help you bring to life today?"
    };
    addMessageToChat(welcomePayload, 'agent', 'welcome-message');

    console.log("Started new conversation.");
}

async function handleSendMessage(event) {
    event.preventDefault();
    const userMessage = messageInput.value;
    if (!userMessage) return;
    const currentMessage = userMessage;
    messageInput.value = "";

    try {
        if (!conversationId) {
            const convoRef = await db.collection("conversations").add({
                title: currentMessage,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            conversationId = convoRef.id;
            setupConversationListener(conversationId);
        }

        const messagesRef = db.collection("conversations").document(conversationId).collection("messages");
        await messagesRef.add({
            role: 'user',
            content: currentMessage,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // This is now a "fire and forget" request. We don't wait for the response.
        fetch(`${BACKEND_API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: currentMessage, conversation_id: conversationId }),
        });

    } catch (error) {
        console.error("Error sending message:", error);
        addMessageToChat({ error: "Sorry, there was an issue sending your message." }, 'agent', 'error-message');
    }
}

function setupConversationListener(id) {
    const messagesRef = db.collection("conversations").document(id).collection("messages").orderBy("timestamp");

    unsubscribeMessages = messagesRef.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            const messageData = change.doc.data();
            const messageId = change.doc.id;
            const existingEl = document.getElementById(messageId);

            if (change.type === 'added' && !existingEl) {
                if (messageData.role === 'user') {
                    addMessageToChat({ reply: messageData.content }, 'user', messageId);
                } else if (messageData.role === 'assistant') {
                    addMessageToChat(messageData.content, 'agent', messageId, messageData.status);
                }
            } else if (change.type === 'modified' && existingEl) {
                if (messageData.role === 'assistant') {
                    updateMessageInChat(messageData.content, messageId, messageData.status);
                }
            }
        });
    }, error => {
        console.error("Error with real-time listener:", error);
    });
}

// ===============================================================================
// UI Helper Functions - REFACTORED FOR REAL-TIME
// ===============================================================================

function addMessageToChat(payload, sender, messageId, status = 'complete') {
    const messageElement = document.createElement("div");
    messageElement.id = messageId;
    messageElement.classList.add("message", `${sender}-message`);

    if (status === 'thinking') {
        messageElement.innerHTML = `<div class="thinking-dots"><span></span><span></span><span></span></div>`;
    } else {
        messageElement.innerHTML = generateMessageHtml(payload);
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateMessageInChat(payload, messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        messageElement.innerHTML = generateMessageHtml(payload);
    }
}

function generateMessageHtml(payload) {
    let content = "";
    if (payload.invoked_agent) {
        content += `<div class="agent-badge">${payload.invoked_agent.toUpperCase()}</div>`;
    }
    if (payload.reply) {
        content += converter.makeHtml(payload.reply);
    }
    if (payload.plan) {
        content += `<h4>${payload.plan.title}</h4><ol>`;
        payload.plan.steps.forEach(step => { content += `<li>${step}</li>`; });
        content += "</ol>";
    }
    if (payload.error) {
        content += `<p class="error-message">${payload.error}</p>`;
    }
    return content;
}