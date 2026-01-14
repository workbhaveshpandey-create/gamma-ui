import { useState, useRef, useEffect } from 'react';
import InputArea from './InputArea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamChat, generateChatTitle, searchWeb } from '../services/ollamaService';
import { createChat, getChatById, updateChatMessages, updateChatTitle, getRecentContext, saveUserMemory, getUserMemoryContext } from '../services/chatStorage';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

// File Attachment Card Component - clean display for attached files
const FileAttachmentCard = ({ file }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Get file extension for styling
    const getFileExtension = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        return ext;
    };

    const ext = getFileExtension(file.name);

    // Color coding based on file type
    const getExtensionColor = (ext) => {
        const colors = {
            'js': 'text-yellow-400 bg-yellow-400/10',
            'jsx': 'text-cyan-400 bg-cyan-400/10',
            'ts': 'text-blue-400 bg-blue-400/10',
            'tsx': 'text-blue-400 bg-blue-400/10',
            'py': 'text-green-400 bg-green-400/10',
            'html': 'text-orange-400 bg-orange-400/10',
            'css': 'text-purple-400 bg-purple-400/10',
            'json': 'text-yellow-300 bg-yellow-300/10',
            'md': 'text-gray-300 bg-gray-300/10',
            'txt': 'text-gray-400 bg-gray-400/10',
        };
        return colors[ext] || 'text-zinc-400 bg-zinc-400/10';
    };

    return (
        <div className="mb-2">
            <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-600/50 bg-zinc-700/50 cursor-pointer hover:bg-zinc-700 transition-colors ${isExpanded ? 'rounded-b-none' : ''}`}
                onClick={() => file.content && setIsExpanded(!isExpanded)}
            >
                <div className={`p-1.5 rounded ${getExtensionColor(ext)}`}>
                    <FileText size={14} />
                </div>
                <span className="text-sm font-medium truncate flex-1">{file.name}</span>
                {file.content && (
                    <button className="text-zinc-400 hover:text-zinc-200 transition-colors">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                )}
            </div>

            {/* Expandable Preview */}
            {isExpanded && file.content && (
                <div className="border border-t-0 border-zinc-600/50 rounded-b-lg bg-zinc-900/80 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-zinc-300 p-3 overflow-x-auto whitespace-pre-wrap break-all">
                        {file.content.length > 1000
                            ? file.content.substring(0, 1000) + '\n\n... (content truncated)'
                            : file.content
                        }
                    </pre>
                </div>
            )}
        </div>
    );
};

const ChatWindow = ({ chatId, settings, onChatCreated, onChatUpdated }) => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeChatId, setActiveChatId] = useState(chatId);
    const [isFirstMessage, setIsFirstMessage] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load existing chat or reset when chatId changes
    useEffect(() => {
        // If chatId is null, reset to empty state (New Chat mode)
        if (chatId === null) {
            setMessages([]);
            setActiveChatId(null);
            setIsLoading(false); // Force stop loading state for UI
            setIsFirstMessage(true);
            return; // Exit early
        }

        // Check if we are already on this chat to avoid unnecessary re-renders
        // BUT if it's a different chat ID, we MUST load it, regardless of isLoading
        if (chatId === activeChatId && messages.length > 0) {
            return;
        }

        const existingChat = getChatById(chatId);
        if (existingChat) {
            setActiveChatId(chatId);
            setIsFirstMessage(false);
            // Load messages if they exist, otherwise empty
            setMessages(existingChat.messages || []);

            // If we switched chats, we should stop the loading indicator for the *new* chat
            // (The background request for the old chat might still finish, but that's fine for now)
            setIsLoading(false);
        } else {
            console.warn(`Chat with ID ${chatId} not found in storage.`);
            // Fallback to new chat state if ID invalid
            setMessages([]);
            setActiveChatId(null);
            setIsFirstMessage(true);
        }
    }, [chatId]);

    // Save messages whenever they change (excluding empty states)
    useEffect(() => {
        if (activeChatId && messages.length > 0 && !isLoading) {
            updateChatMessages(activeChatId, messages);
            onChatUpdated?.();
        }
    }, [messages, activeChatId, isLoading]);

    // Helper to auto-convert images (e.g. webp, gif) to PNG for Ollama support
    const convertImageToPng = (dataUrl) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Check CORS if needed
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const pngDataUrl = canvas.toDataURL('image/png');
                    resolve(pngDataUrl);
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = (err) => reject(new Error('Image conversion load failed'));
            img.src = dataUrl;
        });
    };

    // Helper to get fresh time context
    const getTimeContext = () => {
        const now = new Date();
        return `CURRENT DATE & TIME: ${now.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })}`;
    };

    const handleSendMessage = async (text, attachment) => {
        if (!text.trim() && !attachment) return;

        // Build user message content based on attachment type
        let displayContent = text; // What to show in the UI
        let aiContent = text; // What to send to the AI
        let imageBase64 = null;
        let fileAttachment = null; // For displaying file card in UI

        if (attachment) {
            if (attachment.type === 'image' && attachment.url) {
                // For images, we'll display a placeholder in chat but send base64 to Ollama
                displayContent = text || '';
                aiContent = text ? `[Image attached]\n\n${text}` : '[Image attached]';

                try {
                    const parts = attachment.url.split(',');
                    if (parts.length >= 2) {
                        // Check MIME type
                        const mime = parts[0].match(/:(.*?);/)?.[1];
                        let finalBase64 = parts[1];

                        // Auto-convert to PNG if not supported (Ollama supports png/jpeg)
                        if (mime && !['image/jpeg', 'image/png'].includes(mime)) {
                            console.log(`Auto-converting ${mime} to PNG for Ollama...`);
                            try {
                                const pngDataUrl = await convertImageToPng(attachment.url);
                                finalBase64 = pngDataUrl.split(',')[1];
                            } catch (convErr) {
                                console.error("Image conversion failed:", convErr);
                                // Fallback to original, hoping standard strip works
                            }
                        }

                        // Aggressively remove all whitespace (newlines, spaces) which can break decoding
                        imageBase64 = finalBase64.replace(/\s/g, '');
                        console.log('Processed Image Base64 (first 20 chars):', imageBase64.substring(0, 20));
                    } else {
                        console.warn('Invalid Data URL format, falling back to .base64 prop');
                        imageBase64 = attachment.base64 ? attachment.base64.replace(/\s/g, '') : null;
                    }
                } catch (err) {
                    console.error('Error processing image attachment:', err);
                }
            } else if (attachment.type === 'text' && attachment.content) {
                // For text files - show clean card in UI, send full content to AI
                displayContent = text || '';
                aiContent = `Here is the content of file "${attachment.name}":\n\n\`\`\`\n${attachment.content}\n\`\`\`\n\n${text}`;
                fileAttachment = {
                    name: attachment.name,
                    content: attachment.content,
                    type: 'text'
                };
            } else if (attachment.content) {
                // For other files
                displayContent = text || '';
                aiContent = `Here is the content of file "${attachment.name}":\n\n${attachment.content}\n\n${text}`;
                fileAttachment = {
                    name: attachment.name,
                    content: attachment.content,
                    type: 'file'
                };
            }
        }

        // Create user message for display (with optional image preview)
        const newUserMsg = {
            id: Date.now(),
            role: 'user',
            content: displayContent,
            aiContent: aiContent, // Full content for AI
            image: attachment?.type === 'image' ? attachment.url : null,
            file: fileAttachment // File attachment info for display
        };

        // Create a new chat if this is the first message
        let currentChatId = activeChatId;
        let isNewChat = false;
        const originalMessage = text; // Store for title generation

        if (!currentChatId) {
            const newChat = createChat(text || attachment?.name || 'New Chat');
            currentChatId = newChat.id;
            setActiveChatId(currentChatId);
            onChatCreated?.(currentChatId);
            isNewChat = true;
        }

        setMessages(prev => [...prev, newUserMsg]);

        // Create placeholder for bot response
        const botMsgId = Date.now() + 1;
        setMessages(prev => [...prev, { id: botMsgId, role: 'assistant', content: '' }]);
        setIsLoading(true);

        try {

            // Enhance system prompt with recent context and user memory
            const recentContext = getRecentContext(activeChatId);
            const userMemory = getUserMemoryContext();
            const timeContext = getTimeContext();

            const baseSystemPrompt = settings.systemPrompt || "You are a helpful AI assistant.";
            const toolInstructions =
                "\n\nTOOL USE:\n" +
                "1. If the user asks about current events/news/prices/weather (anything that changes often) or explicitly asks for 'current' information, output ONLY: [SEARCH: <query>]. Example: [SEARCH: current bitcoin price]\n" +
                "2. If (AND ONLY IF) the user explicitly asks you to remember something (e.g. 'Remember my name is...', 'Note that I like...'), output: [MEMORY: <fact>]. Example: [MEMORY: User's name is John].\n" +
                "   - Do NOT use [MEMORY:...] for general conversation, inferred facts, or image descriptions.\n" +
                "   - Do NOT save memory automatically without a clear request.\n" +
                "IMPORTANT: After using [MEMORY:...], you MUST continue generating a response to the user. Do not stop.\n\n" +
                "CRITICAL INSTRUCTION: You have been provided with the CURRENT DATE & TIME in the system messages. You MUST use that specific date as 'today'. Do NOT use your training data cutoff date.";

            const enhancedSettings = {
                ...settings,
                systemPrompt: baseSystemPrompt +
                    (userMemory ? "\n\n" + userMemory : "") +
                    (recentContext ? "\n\n" + recentContext : "") +
                    toolInstructions
            };

            // Build chat history for Ollama API
            // We inject the time context as a SYSTEM message right before the latest user message to ensure high priority
            const chatHistory = [...messages, newUserMsg].map(msg => {
                const apiMessage = {
                    role: msg.role === 'bot' ? 'assistant' : msg.role,
                    content: msg.aiContent || msg.content
                };
                return apiMessage;
            });

            // Insert Time Context as a system message at the end
            chatHistory.splice(chatHistory.length - 1, 0, {
                role: 'system',
                content: `${timeContext}\n(Use this date as the absolute truth for 'today')`
            });

            // CRITICAL: Inject image data if present
            if (imageBase64 && chatHistory.length > 0) {
                // The last message should be the user's new message (after system injection)
                chatHistory[chatHistory.length - 1].images = [imageBase64];
            }

            let fullResponse = "";
            let searchTriggeredQuery = null;

            await streamChat(chatHistory, enhancedSettings, (chunk) => {
                fullResponse += chunk;

                // Handle MEMORY token (detect and save)
                // If it's starting but not finished, don't show anything yet
                if (fullResponse.trimStart().startsWith('[MEMORY:')) {
                    if (!fullResponse.includes(']')) {
                        return true; // Buffer until we have the full token
                    }

                    const memoryMatch = fullResponse.match(/\[MEMORY:(.*?)\]/);
                    if (memoryMatch) {
                        const fact = memoryMatch[1].trim();
                        saveUserMemory(fact);
                        // We continue so the regex below strips it out
                    }
                }

                // Handle SEARCH token
                if (fullResponse.trimStart().startsWith('[SEARCH:')) {
                    if (fullResponse.includes(']')) {
                        const match = fullResponse.match(/\[SEARCH:(.*?)\]/);
                        if (match) {
                            let query = match[1].trim();
                            // Auto-append current year to ensure freshness
                            const currentYear = new Date().getFullYear();
                            if (!query.includes(currentYear.toString())) {
                                query += ` ${currentYear}`;
                            }

                            searchTriggeredQuery = query;
                            setMessages(prev => prev.map(msg =>
                                msg.id === botMsgId
                                    ? { ...msg, content: `_🔍 Fetching data from web for: "${searchTriggeredQuery}"..._` }
                                    : msg
                            ));
                            return false; // Stop the stream
                        }
                    }
                    return true; // Continue buffering
                }

                // Update UI, filtering out Memory tokens AND trimming result to avoid empty bubbles from pure whitespace
                setMessages(prev => prev.map(msg => {
                    if (msg.id === botMsgId) {
                        // We reconstruct content from fullResponse to ensure clean state
                        // This handles the case where chunk is just part of the token
                        const cleanContent = fullResponse.replace(/\[MEMORY:.*?\]/g, '').trimStart();
                        return { ...msg, content: cleanContent };
                    }
                    return msg;
                }));
            });

            // If a search was triggered, perform it and run generation again
            if (searchTriggeredQuery) {
                const searchResults = await searchWeb(searchTriggeredQuery);

                // Update UI to show we found something (optional, or just clear it)
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId
                        ? { ...msg, content: '' } // Clear the "fetching" message to start fresh
                        : msg
                ));

                // Create a new context with search results
                // We add the search results as a 'system' message for the model's context
                const newChatHistory = [
                    ...chatHistory,
                    {
                        role: 'system',
                        content: `[Search Results for "${searchTriggeredQuery}"]:\n${searchResults}\n\nUse the above search results to answer the user's question.`
                    }
                ];

                // Turn off search trigger in the next run to avoid loops
                const finalSettings = {
                    ...settings,
                    systemPrompt: baseSystemPrompt + "\n\nUse the provided search results to answer the user."
                };

                await streamChat(newChatHistory, finalSettings, (chunk) => {
                    setMessages(prev => prev.map(msg =>
                        msg.id === botMsgId
                            ? { ...msg, content: msg.content + chunk }
                            : msg
                    ));
                });
            }

            // Generate smart title for new chats after first message
            if (isNewChat || isFirstMessage) {
                setIsFirstMessage(false);
                // Generate title asynchronously - don't block the chat
                generateChatTitle(originalMessage, settings.model).then(generatedTitle => {
                    if (generatedTitle) {
                        updateChatTitle(currentChatId, generatedTitle);
                        onChatUpdated?.(); // Refresh sidebar
                    }
                }).catch(err => {
                    console.error('Failed to generate title:', err);
                    // Keep the fallback title if generation fails
                });
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId
                    ? { ...msg, content: `**Error:** ${error.message}. Make sure Ollama is running.` }
                    : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };

    // Show welcome screen only when no messages AND no active chat
    const showWelcome = !activeChatId && messages.length === 0;

    if (showWelcome) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-8 bg-app animate-fade-in relative z-0">

                {/* Main Greeting Area */}
                <div className="w-full max-w-4xl mb-12">
                    <h1 className="text-6xl font-medium tracking-tight mb-2 text-text-primary">
                        <span className="gemini-text-gradient">Hello, Bhavesh</span>
                    </h1>
                    <h2 className="text-6xl font-medium tracking-tight text-zinc-700">
                        How can I help you today?
                    </h2>
                </div>

                {/* Suggestions Grid - Clean & Minimal */}
                <div className="w-full max-w-4xl grid grid-cols-4 gap-4">
                    {[
                        { icon: '💡', text: 'Brainstorm ideas', sub: 'for a startup' },
                        { icon: '✈️', text: 'Plan a trip', sub: 'to Paris, France' },
                        { icon: '🎨', text: 'Design a logo', sub: 'minimalist style' },
                        { icon: '📝', text: 'Write a poem', sub: 'about nature' }
                    ].map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSendMessage(item.text)}
                            className="text-left p-5 rounded-2xl bg-surface hover:bg-zinc-800 transition-colors group flex flex-col justify-between h-48"
                        >
                            <span className="text-xl bg-black/20 w-10 h-10 flex items-center justify-center rounded-full mb-4">
                                {item.icon}
                            </span>
                            <div>
                                <span className="block text-lg font-medium text-text-primary mb-1">
                                    {item.text}
                                </span>
                                <span className="text-sm text-text-tertiary">
                                    {item.sub}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Input Area Location - Floating at bottom */}
                <div className="w-full max-w-3xl absolute bottom-8 px-8">
                    {/* InputArea component handles its own rendering */}
                    <InputArea onSendMessage={handleSendMessage} disabled={false} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-app relative">
            {/* Clean Header */}
            <div className="h-16 flex items-center justify-between px-6 bg-app/80 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
                <div className="flex items-center gap-2 cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-colors">
                    <span className="text-lg font-medium text-text-primary">Kreo</span>
                    <span className="text-lg text-text-tertiary">1.0</span>
                    <ChevronDown size={14} className="text-text-tertiary mt-1" />
                </div>

                {/* Profile / Actions */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white">
                        BP
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-8 scrollbar-hide">
                <div className="max-w-3xl mx-auto space-y-12">
                    {messages.map((msg, idx) => (
                        <div
                            key={msg.id}
                            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`
                                max-w-[90%] 
                                ${msg.role === 'user'
                                    ? 'bg-surface px-5 py-3 rounded-3xl rounded-br-md text-text-primary'
                                    : 'pl-0 pr-4'
                                }
                            `}>
                                {msg.role === 'user' ? (
                                    <div className="text-[15px] leading-relaxed">
                                        {msg.image && (
                                            <div className="mb-3 overflow-hidden rounded-xl border border-white/10">
                                                <img src={msg.image} alt="attached" className="max-w-full max-h-64 object-cover" />
                                            </div>
                                        )}
                                        {msg.file && <FileAttachmentCard file={msg.file} />}
                                        {msg.content}
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        {/* Bot Icon - Custom Kreo Logo */}
                                        <div className="w-8 h-8 rounded-full bg-black/20 flex-shrink-0 overflow-hidden mt-1">
                                            <img src="/kreo-icon.png" alt="Kreo" className="w-full h-full object-cover" />
                                        </div>

                                        <div className="flex-1 min-w-0 prose-invert pt-1">
                                            {msg.content ? (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {/* Clean content before display to hide [MEMORY] or [SEARCH] tokens completely */}
                                                    {msg.content
                                                        .replace(/\[MEMORY:.*?\]/g, '')
                                                        .replace(/\[SEARCH:.*?\]/g, '')
                                                        .replace(/_🔍 Fetching data.*?_/g, '') // Also hide the search loading text if user wants STRICTLY only answer
                                                        .trim()
                                                    }
                                                </ReactMarkdown>
                                            ) : (
                                                <div className="flex items-center gap-2 text-text-tertiary text-sm animate-pulse">
                                                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                    Thinking...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* Input Floating Footer */}
            <div className="p-6 pt-2 bg-gradient-to-t from-app via-app to-transparent z-20">
                <div className="max-w-3xl mx-auto">
                    <InputArea onSendMessage={handleSendMessage} disabled={isLoading} />
                    <div className="text-center mt-2 text-[11px] text-text-tertiary">
                        Kreo can make mistakes. Consider checking important information.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
