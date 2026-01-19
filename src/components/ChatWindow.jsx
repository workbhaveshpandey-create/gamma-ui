import { useState, useRef, useEffect } from 'react';
import InputArea from './InputArea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamChat, generateChatTitle, detectCorrection } from '../services/ollamaService';
import { createChat, getChatById, updateChatMessages, updateChatTitle, getRecentContext } from '../services/chatStorage';
import { learnFact, searchKnowledge } from '../services/knowledgeService';
import { FileText, ChevronDown, ChevronUp, BookOpen, Check, X, GraduationCap } from 'lucide-react';

// File Attachment Card Component - clean display for attached files
// ... (FileAttachmentCard implementation remains unchanged if it was outside)

// ... FileAttachmentCard code is lines 12-69, I'll keep it via context matching if possible or just use start/end line carefuly.
// Actually, I can target the top lines 1-10 to fix imports.
// And target line 75 to fix state.
// And target the end to fix JSX.

// I'll do this in chunks.


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
                className={`flex items - center gap - 2 px - 3 py - 2 rounded - lg border border - zinc - 600 / 50 bg - zinc - 700 / 50 cursor - pointer hover: bg - zinc - 700 transition - colors ${isExpanded ? 'rounded-b-none' : ''} `}
                onClick={() => file.content && setIsExpanded(!isExpanded)}
            >
                <div className={`p - 1.5 rounded ${getExtensionColor(ext)} `}>
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
    const [activeChatId, setActiveChatId] = useState(null);
    const [correctionModal, setCorrectionModal] = useState({ isOpen: false, question: '', answer: '' });
    const [isFirstMessage, setIsFirstMessage] = useState(true);
    const [elapsedTime, setElapsedTime] = useState(0);
    const messagesEndRef = useRef(null);
    const timerRef = useRef(null);
    const abortControllerRef = useRef(null);

    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
            clearInterval(timerRef.current);
        }
    };

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
    }, [chatId, activeChatId, messages.length]); // Added messages.length to dependencies

    // Save messages whenever they change (excluding empty states)
    useEffect(() => {
        if (activeChatId && messages.length > 0 && !isLoading) {
            updateChatMessages(activeChatId, messages);
            onChatUpdated?.();
        }
    }, [messages, activeChatId, isLoading, onChatUpdated]); // Added onChatUpdated to dependencies

    // Helper to convert ANY image to JPEG for Ollama (most compatible format)
    const convertImageToJpeg = (dataUrl) => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    // Limit size for performance
                    const maxSize = 1920;
                    let width = img.width;
                    let height = img.height;

                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        } else {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    // White background for transparency
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to JPEG (most compatible with Ollama)
                    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(jpegDataUrl);
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = dataUrl;
        });
    };

    const handleSendMessage = async (text, attachment) => {
        if (!text.trim() && !attachment) return;

        // === AUTO-LEARNING: Check if this message corrects the previous bot message ===
        // We do this asynchronously but capture the necessary state NOW
        const lastMsg = messages[messages.length - 1];
        const lastUserMsg = messages[messages.length - 2];

        if (lastMsg && lastMsg.role === 'assistant' && lastUserMsg && lastUserMsg.role === 'user' && !attachment) {
            console.log("🕵️ Checking if user is correcting the bot...");
            // Fire and forget (don't await)
            detectCorrection(lastUserMsg.content, lastMsg.content, text, settings.model)
                .then(correction => {
                    if (correction) {
                        console.log("🎓 PROACTIVE LEARNING TRIGGERED:", correction);
                        learnFact(correction.question, correction.answer).then(success => {
                            if (success) {
                                console.log("✅ Knowledge base updated automatically!");
                                // Optional: We could trigger a UI toast here
                            }
                        });
                    }
                })
                .catch(err => console.error("Auto-learning failed:", err));
        }

        // Build user message content based on attachment type
        let displayContent = text; // What to show in the UI
        let aiContent = text; // What to send to the AI
        let imageBase64 = null;
        let knowledgeContext = "";
        let cleanText = text;

        // Manual Force Search Command (Slash commands & Natural Language)
        let forceSearch = false;

        // Regex for explicit search triggers
        // Matches: /web, /search, search for, google, look up, find info on
        // Also matches "search over net", "search the web", etc.
        // Regex for explicit search triggers
        // Matches: /web, /search, search for, google, look up, find info on
        // Now much more aggressive in consuming "connector" words to ensure we get a clean query or empty string
        const searchTriggerRegex = /^(?:\/(?:web|search)|(?:please\s+)?(?:search(?:\s+(?:for|over|on|about|this))?|google|look\s+up|find\s+(?:more\s+)?info(?:rmation)?\s+on|check\s+online\s+(?:for|about)?))\s*/i;

        // Words to ignore if they are the ONLY thing left in the query (generic terms)
        // Expanded to include "over the internet", "on web", "this over net", etc.
        const genericTerms = /^(?:(?:on|over|in|the|this|that|it)\s*)*(?:web|net|internet|online|here|page|site)?$/i;

        if (searchTriggerRegex.test(text)) {
            forceSearch = true;
            cleanText = text.replace(searchTriggerRegex, '').trim();

            // IF the remaining text is just "over net" or "the web" (e.g. from "search over net"), 
            // OR if it is completely empty, we assume the user wants to search for the PREVIOUS context.
            if (!cleanText || genericTerms.test(cleanText)) {
                // Find the last user message that wasn't this current one (obviously)
                // Since 'messages' state hasn't updated yet, we look at the last element in 'messages'
                // If the last message was the BOT (which it usually is), we want the user message BEFORE that.
                const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                if (lastUserMsg) {
                    cleanText = lastUserMsg.content;
                    console.log("🔄 Contextual Search Triggered! Re-using query:", cleanText);
                    aiContent = `(Searching web for: "${cleanText}")`; // Feedback for the model/history
                }
            } else {
                aiContent = cleanText;
            }
            displayContent = text; // Keep user's command as is for display
        }

        // Process attachments FIRST (this is fast)
        let fileAttachment = null;
        if (attachment) {
            if (attachment.type === 'image' && attachment.url) {
                displayContent = text || '';
                aiContent = text ? `[Image attached]\n\n${text} ` : '[Image attached]';
                try {
                    console.log('Converting image to JPEG for Ollama...');
                    const jpegDataUrl = await convertImageToJpeg(attachment.url);
                    imageBase64 = jpegDataUrl.split(',')[1].replace(/\s/g, '');
                    console.log('Image converted successfully, base64 length:', imageBase64.length);
                } catch (err) {
                    console.error('Error processing image attachment:', err);
                    if (attachment.base64) {
                        imageBase64 = attachment.base64.replace(/\s/g, '');
                    }
                }
            } else if (attachment.type === 'text' && attachment.content) {
                displayContent = text || '';
                aiContent = `Here is the content of file "${attachment.name}": \n\n\`\`\`\n${attachment.content}\n\`\`\`\n\n${text}`;
                fileAttachment = { name: attachment.name, content: attachment.content, type: 'text' };
            } else if (attachment.content) {
                displayContent = text || '';
                aiContent = `Here is the content of file "${attachment.name}":\n\n${attachment.content}\n\n${text}`;
                fileAttachment = { name: attachment.name, content: attachment.content, type: 'file' };
            }
        }

        // Create user message for display (with optional image preview)
        const newUserMsg = {
            id: Date.now(),
            role: 'user',
            content: displayContent,
            aiContent: aiContent,
            image: attachment?.type === 'image' ? attachment.url : null,
            file: fileAttachment
        };

        // Create a new chat if this is the first message
        let currentChatId = activeChatId;
        let isNewChat = false;
        const originalMessage = text;

        if (!currentChatId) {
            const newChat = createChat(text || attachment?.name || 'New Chat');
            currentChatId = newChat.id;
            setActiveChatId(currentChatId);
            onChatCreated?.(currentChatId);
            isNewChat = true;
        }

        // === SHOW USER MESSAGE IMMEDIATELY ===
        setMessages(prev => [...prev, newUserMsg]);

        // Create placeholder for bot response
        const botMsgId = Date.now() + 1;
        setMessages(prev => [...prev, { id: botMsgId, role: 'assistant', content: '', status: 'thinking' }]);
        setIsLoading(true);
        setElapsedTime(0);

        // Start elapsed time counter
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        // === FORCE SEARCH for RESEARCH-CRITICAL QUERIES (bypasses conservative router) ===
        // These patterns indicate queries where hallucination is HIGH RISK - MUST verify
        const forceSearchPatterns = /\b(Dr\.\s+\w+|Professor\s+\w+|researcher\s+\w+|paper\s+(on|by|titled|called)|study\s+(by|on)|research\s+by|published\s+(in|by)|ethicist|economist\s+\w+|scientist\s+\w+|author\s+of|wrote\s+the\s+paper|2018\s+paper|2019\s+paper|2020\s+paper|2021\s+paper|2022\s+paper|2023\s+paper|2024\s+paper)\b/i;

        // === LLM-BASED ROUTER: Let the model decide if web search is needed ===
        let shouldSearch = forceSearch; // Manual /web command always triggers

        // Force search for research-critical queries (HIGH HALLUCINATION RISK)
        if (!shouldSearch && forceSearchPatterns.test(cleanText)) {
            console.log('🔬 Research-critical query detected - FORCING web search');
            shouldSearch = true;
        }

        // AUTO-SKIP ROUTER patterns (Optimization for Speed)
        // If these are found, we assume NO SEARCH needed and skip the router delay.
        const skipSearchPatterns = /\b(write|create|code|function|class|debug|fix|explain|summarize|translate|poem|story|joke|email|const|var|let|import|return)\b/i;

        // Only run LLM router if:
        // 1. Not already forced
        // 2. Text is long enough (>15 chars)
        // 3. DOES NOT match skip patterns (coding, creative writing, etc.)
        if (!shouldSearch && cleanText.trim().length > 15 && !skipSearchPatterns.test(cleanText)) {
            // Show "Deciding..." briefly
            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId ? { ...msg, status: 'routing' } : msg
            ));

            try {
                const { shouldSearchWeb } = await import('../services/ollamaService');
                shouldSearch = await shouldSearchWeb(cleanText, settings.model);
            } catch (e) {
                console.warn('Router failed, defaulting to no search:', e);
            }
        }

        try {
            // === WEB SEARCH (runs AFTER user sees their message) ===
            if (shouldSearch && cleanText.trim().length > 2) {
                console.log('🌍 Deep Web Search triggered by router...');

                // Update bot placeholder to show "Searching..."
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId ? { ...msg, status: 'searching' } : msg
                ));

                const searchRes = await fetch('/api/web-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: cleanText })
                });
                const searchData = await searchRes.json();

                // === RESULT VERIFICATION: Check if exact names appear in results ===
                // Extract key entities from query (names, paper titles)
                const namePatterns = cleanText.match(/(?:Dr\.|Professor|Prof\.)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/gi) || [];
                const paperPattern = cleanText.match(/(?:paper|titled|called)\s+["']?([^"']+?)["']?(?:\s+(?:authored|by|from)|\s*$)/i);
                const paperTitle = paperPattern ? paperPattern[1].trim() : null;

                // Combine all content from results for verification
                const allContent = searchData.results?.map(r =>
                    `${r.title} ${r.snippet} ${r.content}`.toLowerCase()
                ).join(' ') || '';

                // Check if any key entity is found
                let entityFound = false;
                const searchedEntities = [];

                for (const name of namePatterns) {
                    const cleanName = name.replace(/(?:Dr\.|Professor|Prof\.)\s+/i, '').toLowerCase();
                    searchedEntities.push(cleanName);
                    if (allContent.includes(cleanName)) {
                        entityFound = true;
                        console.log(`✅ Found entity in results: ${cleanName}`);
                    }
                }

                if (paperTitle && paperTitle.length > 10) {
                    searchedEntities.push(paperTitle.toLowerCase().slice(0, 30));
                    // Check for partial match (at least 3 consecutive words)
                    const paperWords = paperTitle.toLowerCase().split(' ').slice(0, 4).join(' ');
                    if (allContent.includes(paperWords)) {
                        entityFound = true;
                        console.log(`✅ Found paper title in results: ${paperTitle}`);
                    }
                }

                if (searchData.results && searchData.results.length > 0) {
                    console.log(`🌍 Found ${searchData.results.length} sources, entity match: ${entityFound}`);

                    const resultsText = searchData.results.map((r, i) =>
                        `SOURCE ${i + 1} [${r.title}] (${r.url}):\n${r.content}\n`
                    ).join("\n\n");

                    if (!entityFound && searchedEntities.length > 0) {
                        // CRITICAL: Entity NOT found in any result
                        knowledgeContext = `\n\n[WEB SEARCH VERIFICATION FAILED]
I searched the web for: ${searchedEntities.join(', ')}
RESULT: The specific person, paper, or entity was NOT FOUND in any web source.

Web results returned generic/unrelated information:
${resultsText}

CRITICAL INSTRUCTION: The user asked about "${searchedEntities.join(', ')}" but this EXACT entity does NOT appear in any search result. This likely means:
1. The person or paper does NOT EXIST
2. The name is misspelled
3. It's a fictional/trap question

YOU MUST SAY: "I searched the web but could not find any verified information about [the specific name/paper]. This person or paper may not exist, or the details provided may be inaccurate. I cannot provide information I haven't verified."

DO NOT fabricate an answer based on unrelated search results!`;
                    } else {
                        // Entity found or no specific entity to verify - use results normally
                        knowledgeContext = `\n\n[LIVE WEB RESEARCH from ${searchData.results.length} SOURCES]:\n` +
                            resultsText +
                            `\n\nINSTRUCTIONS: Use ONLY the information from these sources. Cite as [1], [2], etc.`;
                    }
                } else {
                    knowledgeContext = `\n\n[WEB SEARCH RETURNED NO RESULTS]\nThe user asked about a specific person or paper, but web search found nothing. Say: "I couldn't find any verified information about this. The person or paper may not exist."`;
                }
            }
            // Local Knowledge Base (fast, no status change needed)
            else if (cleanText.trim().length > 5) {
                const facts = await searchKnowledge(cleanText);
                if (facts && facts.length > 0) {
                    console.log('📚 Found knowledge:', facts.length);
                    knowledgeContext = "\n\n[RELEVANT RECALLED KNOWLEDGE]:\n" +
                        facts.map(f => `* User previously taught: "${f.question}" -> "${f.answer}"`).join("\n") +
                        "\n(Use this knowledge to answer if relevant)";
                }
            }
        } catch (e) {
            console.warn('Context lookup failed', e);
        }

        // Reset status to thinking before LLM call
        setMessages(prev => prev.map(msg =>
            msg.id === botMsgId ? { ...msg, status: 'thinking' } : msg
        ));

        try {
            // Enhance system prompt with recent context only
            const recentContext = getRecentContext(activeChatId);


            // Enterprise System Prompt Configuration
            const baseSystemPrompt = settings.systemPrompt || "You are a helpful AI assistant.";
            const currentDateTime = new Date().toLocaleString('en-IN', {
                dateStyle: 'full',
                timeStyle: 'short'
            });
            const userName = settings.userName || 'User';

            const enterpriseInstructions =
                "\nYou are Kreo, a friendly and intelligent AI assistant.\n\n" +
                "PERSONALITY:\n" +
                "• Be warm, conversational, and personable\n" +
                "• Vary your responses - never repeat the same phrases\n" +
                "• For casual chat (greetings, how are you, etc.) - be friendly and natural like a helpful colleague\n" +
                "• For technical questions - be precise and professional\n\n" +
                "CONTEXT MANAGEMENT:\n" +
                "• STRICTLY EVALUATE each new query independently if the topic seems different.\n" +
                "• If the user asks a completely new question (e.g., switches from coding to cooking), DO NOT relate it to the previous conversation.\n" +
                "• Treat topic changes as a fresh start.\n\n" +
                "CRITICAL THINKING & REASONING VERIFICATION:\n" +
                "• Before answering, internally verify your logic\n" +
                "• For DATE COMPARISONS: Carefully check which year is earlier/later (smaller year = earlier)\n" +
                "• EXAMPLE: 1945 comes BEFORE 1949. If X was founded in 1945 and Y in 1949, X came FIRST.\n" +
                "• Double-check your conclusion matches the facts you stated\n" +
                "• If comparing 'before' vs 'after': verify the chronological order is correct\n" +
                "• Think step-by-step for math or logic problems\n" +
                "• If you catch yourself making a mistake, correct it immediately\n\n" +
                "FACT VERIFICATION (CRITICAL - ANTI-HALLUCINATION):\n" +
                "• Your training data has a cutoff date and may be outdated\n" +
                "• If asked about a SPECIFIC person, paper, or research you DON'T RECOGNIZE:\n" +
                "  → Say: 'I don't have verified information about [name/paper]. This might not exist or could be spelled differently.'\n" +
                "  → DO NOT make up details about people or papers you don't know!\n" +
                "• If web search results are provided [LIVE WEB RESEARCH], use ONLY that data\n" +
                "• If web search found nothing, say: 'I searched but couldn't find verified information.'\n" +
                "• NEVER fabricate facts, names, dates, or paper titles\n" +
                "• When citing web sources, mention the source number [1], [2] etc.\n\n" +
                "RESPONSE STYLE (CONCISE & DIRECT):\n" +
                "• Keep answers SHORT and to the point - no unnecessary fluff\n" +
                "• For simple questions: 1-3 sentences max\n" +
                "• For factual questions: State the answer first, then brief explanation if needed\n" +
                "• Use bullet points for lists instead of long paragraphs\n" +
                "• Avoid over-explaining or repeating the same point\n" +
                "• Don't add unnecessary pleasantries like 'Great question!' every time\n" +
                "• Technical answers: Be precise, skip the preamble\n\n" +
                `USER: ${userName} | DATE: ${currentDateTime} (mention only if asked)\n`;

            const enhancedSettings = {
                ...settings,
                systemPrompt: baseSystemPrompt +
                    enterpriseInstructions +
                    (knowledgeContext ? knowledgeContext : "") +
                    (recentContext ? "\n\n" + recentContext : "")
            };

            // Build chat history for Ollama API
            const chatHistory = [...messages, newUserMsg].map(msg => {
                const apiMessage = {
                    role: msg.role === 'bot' ? 'assistant' : msg.role,
                    content: msg.aiContent || msg.content
                };
                return apiMessage;
            });

            // CRITICAL: Inject image data if present
            if (imageBase64 && chatHistory.length > 0) {
                // The last message should be the user's new message
                chatHistory[chatHistory.length - 1].images = [imageBase64];
            }

            let fullResponse = "";

            // Initialize abort controller for this specific request
            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;

            try {
                await streamChat(chatHistory, enhancedSettings, (chunk) => {
                    if (signal.aborted) return; // Stop processing if aborted

                    fullResponse += chunk;

                    // Direct UI update without token filtering
                    setMessages(prev => prev.map(msg => {
                        if (msg.id === botMsgId) {
                            return { ...msg, content: fullResponse };
                        }
                        return msg;
                    }));
                }, signal); // Pass signal to service
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log('Generation stopped by user');
                    // Add [Stopped] indicator
                    setMessages(prev => prev.map(msg =>
                        msg.id === botMsgId
                            ? { ...msg, content: fullResponse + " _[Stopped]_" }
                            : msg
                    ));
                    return; // Don't show error for manual stop
                }
                throw err; // Re-throw other errors
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
            abortControllerRef.current = null;
            clearInterval(timerRef.current);
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
                        <span className="gemini-text-gradient">Hello, {settings.userName || 'there'}</span>
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
                    <InputArea
                        onSendMessage={handleSendMessage}
                        disabled={isLoading}
                        isLoading={isLoading}
                        onStopGeneration={stopGeneration}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-app relative">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-8 pt-6 pb-32 scrollbar-hide">
                <div className="w-full space-y-6">
                    {messages.map((msg, idx) => (
                        <div
                            key={msg.id}
                            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`
                                max-w-[85%] 
                                ${msg.role === 'user'
                                    ? 'bg-blue-600/90 px-5 py-3 rounded-2xl rounded-br-sm text-white shadow-md'
                                    : ''
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
                                    <div className="flex gap-4 group"> {/* Added group for hover effect */}
                                        {/* Bot Icon - Custom Kreo Logo */}
                                        <div className="w-8 h-8 rounded-full bg-black/20 flex-shrink-0 overflow-hidden mt-1">
                                            <img src="/kreo-icon.png" alt="Kreo" className="w-full h-full object-cover" />
                                        </div>

                                        <div className="flex-1 min-w-0 prose-invert pt-1">
                                            {msg.content ? (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            ) : (
                                                <div className="flex items-center gap-2 text-text-tertiary text-sm animate-pulse">
                                                    <div className={`w-2 h-2 rounded-full ${msg.status === 'searching' ? 'bg-green-400' :
                                                        msg.status === 'routing' ? 'bg-purple-400' :
                                                            'bg-blue-400'
                                                        }`}></div>
                                                    {msg.status === 'searching' ? (
                                                        <span>🌍 Searching the web...</span>
                                                    ) : msg.status === 'routing' ? (
                                                        <span>🤔 Deciding if web search needed...</span>
                                                    ) : (
                                                        <span>Thinking...</span>
                                                    )}
                                                    {elapsedTime > 0 && <span className="text-xs opacity-70">({elapsedTime}s)</span>}
                                                </div>
                                            )}

                                            {/* Action Bar for Bot Messages */}
                                            {!isLoading && (
                                                <div className="mt-2 flex opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <button
                                                        onClick={() => {
                                                            // Find the preceding user message
                                                            const prevMsg = messages[idx - 1];
                                                            const correctionQ = prevMsg ? prevMsg.content : "What was the question?";
                                                            setCorrectionModal({ isOpen: true, question: correctionQ, answer: '' });
                                                        }}
                                                        className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-purple-400 bg-zinc-800/50 hover:bg-zinc-800 px-2 py-1 rounded transition-colors"
                                                    >
                                                        <GraduationCap size={12} />
                                                        <span>Teach / Correct</span>
                                                    </button>
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

            {/* Correction Modal */}
            {correctionModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
                    <div className="bg-[#1a1a1c] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-white font-medium flex items-center gap-2">
                                <GraduationCap className="text-purple-400" size={18} />
                                Teach Kreo
                            </h3>
                            <button onClick={() => setCorrectionModal({ ...correctionModal, isOpen: false })} className="text-zinc-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider font-semibold">User Question</label>
                                <div className="bg-zinc-900/50 text-zinc-300 p-3 rounded-lg text-sm border border-white/5">
                                    {correctionModal.question}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-purple-400 mb-1.5 uppercase tracking-wider font-semibold">Correct Answer</label>
                                <textarea
                                    value={correctionModal.answer}
                                    onChange={(e) => setCorrectionModal({ ...correctionModal, answer: e.target.value })}
                                    className="w-full bg-zinc-900 text-white p-3 rounded-lg text-sm border border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none h-32 resize-none placeholder:text-zinc-600"
                                    placeholder="Type the correct answer here needed for future reference..."
                                    autoFocus
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    onClick={() => setCorrectionModal({ ...correctionModal, isOpen: false })}
                                    className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!correctionModal.answer.trim()) return;
                                        await learnFact(correctionModal.question, correctionModal.answer);
                                        setCorrectionModal({ ...correctionModal, isOpen: false });
                                        // Optional: add a small system message to chat saying "Learned!"
                                    }}
                                    className="px-4 py-2 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors flex items-center gap-2"
                                >
                                    <Check size={14} />
                                    Save Rule
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Input Floating Footer - Sticky at Bottom */}
            <div className="sticky bottom-0 w-full p-4 pb-6 bg-gradient-to-t from-app via-app/95 to-transparent z-20">
                <div className="max-w-5xl mx-auto">
                    <InputArea
                        onSendMessage={handleSendMessage}
                        disabled={isLoading}
                        isLoading={isLoading}
                        onStopGeneration={stopGeneration}
                    />
                    <div className="text-center mt-2 text-[11px] text-text-tertiary">
                        Kreo can make mistakes. Consider checking important information.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
