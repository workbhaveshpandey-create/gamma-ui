
const API_BASE = '/api/knowledge';

/**
 * Teach the system a new Q&A pair.
 * @param {string} question - The user's question or topic
 * @param {string} answer - The correct answer to learn
 * @returns {Promise<boolean>} Success status
 */
export const learnFact = async (question, answer) => {
    try {
        const response = await fetch(`${API_BASE}/learn`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question, answer })
        });

        if (!response.ok) throw new Error('Failed to learn');
        return true;
    } catch (error) {
        console.error('Knowledge Learn Error:', error);
        return false;
    }
};

/**
 * Search the knowledge base for relevant facts.
 * @param {string} query - The user's current query
 * @returns {Promise<Array>} Array of matching {question, answer} objects
 */
export const searchKnowledge = async (query) => {
    try {
        const response = await fetch(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to search');

        const results = await response.json();
        return results || [];
    } catch (error) {
        console.error('Knowledge Search Error:', error);
        return [];
    }
};
