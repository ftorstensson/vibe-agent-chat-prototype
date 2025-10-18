// ===============================================================================
// Vibe Coder Chat Prototype Frontend
// v5.1 (Hotfix)
// This version fixes a critical SDK initialization failure by re-introducing
// an explicit firebaseConfig and corrects the Firestore 'doc()' method typo.
// ===============================================================================

// ===============================================================================
// Configuration & State
// ===============================================================================

const BACKEND_API_URL = "https://vibe-agent-backend-534939227554.australia-southeast1.run.app";
let conversationId = null;
let unsubscribeMessages = null;

// [FIXED] Use the explicit, ground-truth Firebase configuration.
const firebaseConfig = {
    apiKey: "AIzaSyCK-8ucH5NcrI5d9px2DSJ7Vrk1Y004PYw",
    authDomain: "vibe-agent-final.firebaseapp.com",
    projectId: "vibe-agent-final",
    storageBucket: "vibe-agent-final.firebasestorage.app",
    messagingSenderId: "534939227554",
    appId: "1:534939227554:web:0bed74dd458e849c028efb",
    measurementId: "G-1SE3NYW08R"
};

// Initialize Firebase and Firestore
firebase.initializeApp(firebaseConfig);
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

        // [FIXED] The method name is doc(), not document()
        const messagesRef = db.collection("conversations").doc(conversationId).collection("messages");
        await messagesRef.add({
            role: 'user',
            content: currentMessage,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
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
    // [FIXED] The method name is doc(), not document()
    const messagesRef = db.collection("conversations").doc(id).collection("messages").orderBy("timestamp");

    unsubscribeMessages = messagesRef.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            const messageData = change.doc.data();
            const messageId = change.doc.id;
            const existingEl = document.getElementById(messageId);

            if (change.type === 'added' && !existingEl) {
                if (messageData.role === 'user') {
                    // User messages are now added directly from handleSendMessage,
                    // so we don't need to re-render them here.
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
// UI Helper Functions
// ===============================================================================

function addMessageToChat(payload, sender, messageId, status = 'complete') {
    const messageElement = document.createElement("div");
    if (messageId) {
        messageElement.id = messageId;
    }
    messageElement.classList.add("message", `${sender}-message`);

    // This logic handles both user plain text and agent rich content
    if (sender === 'user') {
        messageElement.textContent = payload.reply;
    } else {
        if (status === 'thinking') {
            messageElement.innerHTML = `<div class="thinking-dots"><span></span><span></span><span></span></div>`;
        } else {
            messageElement.innerHTML = generateMessageHtml(payload);
        }
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateMessageInChat(payload, messageId, status) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        if (status === 'complete' || status === 'error') {
            messageElement.innerHTML = generateMessageHtml(payload);
        }
    }
}

function generateMessageHtml(payload) {
    let content = "";
    if (payload && payload.invoked_agent) {
        content += `<div class="agent-badge">${payload.invoked_agent.toUpperCase()}</div>`;
    }
    if (payload && payload.reply) {
        content += converter.makeHtml(payload.reply);
    }
    if (payload && payload.plan) {
        content += `<h4>${payload.plan.title}</h4><ol>`;
        payload.plan.steps.forEach(step => { content += `<li>${step}</li>`; });
        content += "</ol>";
    }
    if (payload && payload.error) {
        content += `<p class="error-message">${payload.error}</p>`;
    }
    return content;
}