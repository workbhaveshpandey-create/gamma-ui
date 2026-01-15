const OLLAMA_BASE_URL = '/ollama/api';

/**
 * Pre-load model into memory to eliminate cold start delay.
 * Call this on app initialization.
 * @param {string} model - Model name to warm up
 */
export const warmModel = async (model = 'gemma3:12b') => {
    try {
        console.log(`🔥 Warming up model: ${model}...`);
        await fetch(`${OLLAMA_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'hi' }],
                stream: false,
                keep_alive: '30m',  // Keep model in memory for 30 min
                options: { num_predict: 1 }  // Generate just 1 token (fast)
            })
        });
        console.log(`✅ Model ${model} is warm and ready!`);
    } catch (e) {
        console.warn('Model warm-up failed:', e.message);
    }
};

/**
 * Sends a chat request to Ollama with streaming support.
 * @param {Array} messages - List of message objects {role, content, images?}
 * @param {Object} options - Model parameters (model, temperature, etc.)
 * @param {Function} onChunk - Callback for each streaming chunk
 * @returns {Promise<void>}
 */
export const streamChat = async (messages, options, onChunk) => {
    const { model, temperature, systemPrompt } = options;

    const payload = {
        model: model || 'gemma3:12b',
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages
        ],
        stream: true,
        options: {
            temperature: temperature || 0.7,
            repeat_penalty: options.repeat_penalty || 1.15,
            top_k: options.top_k || 40,
            top_p: options.top_p || 0.9,
            num_ctx: options.num_ctx || 1024,       // Reduced for speed
            num_predict: 2048,                        // Limit max tokens (faster)
            num_gpu: 999,                            // Use all GPU layers (Metal)
            num_thread: 8,                           // Optimize CPU threads
            stop: ["<|end|>", "<|eot_id|>", "</s>", "[END]"]
        }
    };

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API Error: ${error}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // Ollama sends multiple JSON objects in one chunk sometimes
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.done) {
                        return;
                    }
                    if (json.message && json.message.content) {
                        const shouldContinue = await onChunk(json.message.content);
                        if (shouldContinue === false) {
                            reader.cancel();
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Error parsing chunk:", e);
                }
            }
        }
    } catch (error) {
        console.error("Stream Chat failed:", error);
        throw error;
    }
};

/**
 * Converts a File object to Base64 string.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove data:image/png;base64, prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

/**
 * Generates a short chat title using the AI model.
 * @param {string} userMessage - The first user message
 * @param {string} model - The model to use
 * @returns {Promise<string>} Generated title
 */
export const generateChatTitle = async (userMessage, model = 'gemma3:12b') => {
    const payload = {
        model: model,
        messages: [
            {
                role: 'system',
                content: 'You are a title generator. Generate a very short, concise title (max 5-6 words) that captures the essence of the user\'s question or topic. Respond with ONLY the title, no quotes, no punctuation at the end, no explanation.'
            },
            {
                role: 'user',
                content: `Generate a short title for this conversation: "${userMessage.slice(0, 200)}"`
            }
        ],
        stream: false,
        options: {
            temperature: 0.3, // Lower temperature for consistent titles
        }
    };

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Failed to generate title');
        }

        const data = await response.json();
        const title = data.message?.content?.trim() || '';

        // Clean up the title - remove quotes if present
        return title.replace(/^["']|["']$/g, '').slice(0, 50);
    } catch (error) {
        console.error('Error generating chat title:', error);
        return null; // Return null so we can fall back to default
    }
};


