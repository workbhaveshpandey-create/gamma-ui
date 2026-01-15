// Simple localStorage-based chat storage

const STORAGE_KEY = 'gamma_chats';

/**
 * Get all saved chats
 * @returns {Array} Array of chat objects {id, title, messages, createdAt, updatedAt}
 */
export const getAllChats = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading chats:', e);
        return [];
    }
};

/**
 * Get a single chat by ID
 * @param {string} chatId 
 * @returns {Object|null}
 */
export const getChatById = (chatId) => {
    const chats = getAllChats();
    return chats.find(c => c.id === chatId) || null;
};

/**
 * Create a new chat
 * @param {string} firstMessage - First user message (used for fallback title if AI fails)
 * @returns {Object} The new chat object
 */
export const createChat = (firstMessage) => {
    const chats = getAllChats();
    const newChat = {
        id: `chat_${Date.now()}`,
        title: 'New Chat', // Temporary title - will be updated by AI
        fallbackTitle: firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : ''), // Fallback
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    chats.unshift(newChat); // Add to beginning
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    return newChat;
};

/**
 * Update chat title
 * @param {string} chatId 
 * @param {string} title 
 */
export const updateChatTitle = (chatId, title) => {
    const chats = getAllChats();
    const index = chats.findIndex(c => c.id === chatId);
    if (index !== -1) {
        chats[index].title = title;
        chats[index].updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
        console.log('Chat title updated:', chats[index]);
        return true;
    }
    return false;
};

/**
 * Update chat messages
 * @param {string} chatId 
 * @param {Array} messages 
 */
export const updateChatMessages = (chatId, messages) => {
    console.log('updateChatMessages called:', { chatId, messageCount: messages.length });
    const chats = getAllChats();
    const index = chats.findIndex(c => c.id === chatId);
    if (index !== -1) {
        chats[index].messages = messages;
        chats[index].updatedAt = new Date().toISOString();
        // Update title from first user message if current title is empty
        if (!chats[index].title && messages.length > 0) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                chats[index].title = firstUserMsg.content.slice(0, 40);
            }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
        console.log('Chat updated in storage:', chats[index]);
    } else {
        console.warn('Chat not found for update:', chatId);
    }
};

/**
 * Delete a chat
 * @param {string} chatId 
 */
export const deleteChat = (chatId) => {
    const chats = getAllChats().filter(c => c.id !== chatId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
};

/**
 * Group chats by date (Today, Yesterday, Previous 7 Days, Older)
 * @returns {Object}
 */
export const getGroupedChats = () => {
    const chats = getAllChats();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = {
        'Today': [],
        'Yesterday': [],
        'Previous 7 Days': [],
        'Older': []
    };

    chats.forEach(chat => {
        const chatDate = new Date(chat.updatedAt);
        if (chatDate >= today) {
            groups['Today'].push(chat);
        } else if (chatDate >= yesterday) {
            groups['Yesterday'].push(chat);
        } else if (chatDate >= weekAgo) {
            groups['Previous 7 Days'].push(chat);
        } else {
            groups['Older'].push(chat);
        }
    });

    return groups;
};

/**
 * Get context from recent chats to help the AI remember past interactions.
 * @param {string} currentChatId 
 * @param {number} limit 
 * @returns {string}
 */
export const getRecentContext = (currentChatId, limit = 5) => {
    try {
        const chats = getAllChats();
        // Get recent chats excluding current one
        const recentChats = chats
            .filter(c => c.id !== currentChatId && c.messages && c.messages.length > 0)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, limit);

        if (recentChats.length === 0) return '';

        let contextParts = [];

        recentChats.forEach(chat => {
            // Find last user message
            let lastUserMsg = null;
            for (let i = chat.messages.length - 1; i >= 0; i--) {
                if (chat.messages[i].role === 'user') {
                    lastUserMsg = chat.messages[i];
                    break;
                }
            }

            if (lastUserMsg) {
                const date = new Date(chat.updatedAt).toLocaleDateString();
                const snippet = lastUserMsg.content.slice(0, 150).replace(/\n/g, ' ');
                contextParts.push(`- [${date}] Topic: "${chat.title || 'Untitled'}". User asked: "${snippet}..."`);
            }
        });

        if (contextParts.length === 0) return '';

        return "RECENT CONVERSATION HISTORY (for context only - do not mention unless relevant):\n" + contextParts.join('\n') + "\n\n";
    } catch (error) {
        console.error("Error generating recent context:", error);
        return '';
    }
};


