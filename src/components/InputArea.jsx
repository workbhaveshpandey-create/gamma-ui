import { useState, useRef, useEffect } from 'react';
import { Send, Image, Mic, Paperclip, ArrowUp, Camera, X, StopCircle, Loader2, Plus } from 'lucide-react';
import { extractPdfText } from '../services/pdfService';
import { transcribeAudio } from '../services/whisperService';
import CameraModal from './CameraModal';

/**
 * Compress and convert image to JPEG for better compatibility
 * @param {string} dataUrl - Original image data URL
 * @param {number} maxWidth - Maximum width (default 1920)
 * @param {number} quality - JPEG quality 0-1 (default 0.85)
 * @returns {Promise<string>} Compressed image data URL
 */
const compressImage = (dataUrl, maxWidth = 1920, quality = 0.85) => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                // Create canvas and draw
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG (better compression) or PNG for transparency
                const outputUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(outputUrl);
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = dataUrl;
    });
};

const InputArea = ({ onSendMessage, disabled, isLoading, onStopGeneration }) => {
    const [input, setInput] = useState('');
    const [isCameraOpen, setCameraOpen] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionProgress, setTranscriptionProgress] = useState('');

    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const originalTextRef = useRef('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if ((!input.trim() && !attachment) || disabled) return;

        // Auto-search logic is now handled in ChatWindow.jsx
        onSendMessage(input, attachment);

        // Reset
        setInput('');
        setAttachment(null);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleChange = (e) => {
        setInput(e.target.value);
        const target = e.target;
        target.style.height = 'auto';
        target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
    };

    // File Handling - convert to base64 for images, read text for text files
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            // Convert image to base64 with optional compression
            const reader = new FileReader();
            reader.onload = async () => {
                let finalDataUrl = reader.result;

                // Compress large images (> 2MB) or convert unsupported formats
                const needsProcessing = file.size > 2 * 1024 * 1024 ||
                    !['image/jpeg', 'image/png'].includes(file.type);

                if (needsProcessing) {
                    try {
                        console.log(`Processing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, ${file.type})`);
                        finalDataUrl = await compressImage(reader.result, 1920, 0.85);
                        console.log('Image processed successfully');
                    } catch (err) {
                        console.error('Image processing failed, using original:', err);
                    }
                }

                const base64 = finalDataUrl.split(',')[1];
                setAttachment({
                    type: 'image',
                    base64: base64,
                    url: finalDataUrl,
                    name: file.name
                });
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            // Handle PDF
            try {
                const textContent = await extractPdfText(file);
                setAttachment({
                    type: 'text',
                    content: textContent,
                    name: file.name
                });
            } catch (error) {
                alert("Failed to read PDF. " + error.message);
            }
        } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.py') || file.name.endsWith('.jsx')) {
            // Read text file content
            const reader = new FileReader();
            reader.onload = () => {
                setAttachment({
                    type: 'text',
                    content: reader.result,
                    name: file.name
                });
            };
            reader.readAsText(file);
        } else if (file.type.startsWith('audio/')) {
            // Audio file - transcribe using Whisper
            setIsTranscribing(true);
            setTranscriptionProgress('Loading Whisper model...');

            try {
                const transcription = await transcribeAudio(file, (progress, fileName) => {
                    setTranscriptionProgress(`Downloading model: ${progress}%`);
                });

                setAttachment({
                    type: 'audio',
                    name: file.name,
                    content: transcription,
                    transcribed: true
                });
                setTranscriptionProgress('');
            } catch (error) {
                console.error('Transcription failed:', error);
                // Fallback to showing audio player
                const reader = new FileReader();
                reader.onload = () => {
                    setAttachment({
                        type: 'audio',
                        url: reader.result,
                        name: file.name,
                        content: `[Audio file: ${file.name}] - Transcription failed: ${error.message}`,
                        transcribed: false
                    });
                };
                reader.readAsDataURL(file);
            } finally {
                setIsTranscribing(false);
            }
        } else {
            // For other files, just show name
            setAttachment({
                type: 'file',
                name: file.name,
                content: `[Attached file: ${file.name}]`
            });
        }
        e.target.value = '';
    };

    // Camera Handling - already returns base64 data URL
    const handleCameraCapture = (imageDataUrl) => {
        const base64 = imageDataUrl.split(',')[1];
        setAttachment({
            type: 'image',
            base64: base64,
            url: imageDataUrl,
            name: 'camera-capture.png'
        });
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    // Voice Handling via Web Speech API
    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("Your browser does not support voice recognition. Please use Chrome or Edge.");
            return;
        }

        // Save current input text so we can append to it
        originalTextRef.current = input;

        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep listening until stopped
        recognition.interimResults = true; // Show results in real-time
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
            if (event.error === 'not-allowed') {
                alert("Microphone access denied. Please check your permissions.");
            }
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Combine original text with the new transcript
            // Add a space if there was previous text and it didn't end with whitespace
            const prefix = originalTextRef.current;
            const spacer = (prefix && !prefix.endsWith(' ')) ? ' ' : '';

            const currentTranscript = finalTranscript || interimTranscript;
            if (currentTranscript) {
                const newValue = prefix + spacer + currentTranscript;
                setInput(newValue);

                // Auto-resize textarea
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
                }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const [showAttachMenu, setShowAttachMenu] = useState(false);

    return (
        <div className="w-full relative">
            <CameraModal
                isOpen={isCameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={handleCameraCapture}
            />

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.heic,.heif,.webp,.avif,.bmp,.tiff,.gif,.pdf,.txt,.md,.json,.js,.jsx,.py,.ts,.tsx,.html,.css,audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac"
                className="hidden"
            />

            {/* Attachment Preview - Above the bar */}
            {attachment && !isTranscribing && (
                <div className="mb-3 animate-slide-up">
                    <div className="relative inline-block group">
                        {attachment.type === 'image' ? (
                            <img src={attachment.url} alt="preview" className="h-20 w-auto rounded-xl border border-white/10 object-cover shadow-lg" />
                        ) : attachment.type === 'audio' ? (
                            <div className="h-12 px-4 flex items-center bg-zinc-800/80 rounded-xl border border-white/10 text-sm text-white shadow-lg">
                                <span className="text-purple-400 mr-2">🎵</span>
                                <span className="truncate max-w-[200px]">{attachment.name}</span>
                                {attachment.transcribed && (
                                    <span className="ml-2 text-green-400 text-xs">✓ Transcribed</span>
                                )}
                            </div>
                        ) : (
                            <div className="h-12 px-4 flex items-center bg-zinc-800/80 rounded-xl border border-white/10 text-sm text-white shadow-lg">
                                <Paperclip size={16} className="mr-2 shrink-0 text-white/60" />
                                <span className="truncate max-w-[200px]">{attachment.name}</span>
                                {attachment.type === 'text' && (
                                    <span className="ml-2 text-green-400 text-xs">✓ Ready</span>
                                )}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setAttachment(null)}
                            className="absolute -top-2 -right-2 bg-zinc-600 text-white rounded-full p-1.5 shadow-lg hover:bg-zinc-500 transition-all hover:scale-110"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            )}

            {/* Transcription Loading State */}
            {isTranscribing && (
                <div className="mb-3">
                    <div className="flex items-center gap-3 px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl animate-fade-in">
                        <Loader2 size={18} className="text-purple-400 animate-spin" />
                        <div className="flex flex-col">
                            <span className="text-sm text-purple-300">Transcribing audio...</span>
                            <span className="text-xs text-purple-400">{transcriptionProgress}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Input Bar - ChatGPT Style */}
            <form onSubmit={handleSubmit} className="relative flex items-center w-full px-2 py-2 rounded-full transition-all duration-300 bg-[#2a2b2d] border border-white/10 shadow-lg hover:border-white/15 focus-within:border-white/25">

                {/* Left: "+" Button with Popover */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                        title="Attach"
                        disabled={isLoading}
                    >
                        <Plus size={22} strokeWidth={2} className={`transition-transform duration-200 ${showAttachMenu ? 'rotate-45' : ''}`} />
                    </button>

                    {/* Popover Menu */}
                    {showAttachMenu && (
                        <div className="absolute bottom-full left-0 mb-2 bg-[#2a2b2d] border border-white/15 rounded-2xl shadow-2xl p-2 min-w-[160px] animate-fade-in z-50">
                            <button
                                type="button"
                                onClick={() => {
                                    fileInputRef.current?.click();
                                    setShowAttachMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all text-sm"
                            >
                                <Paperclip size={18} />
                                <span>Upload File</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCameraOpen(true);
                                    setShowAttachMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all text-sm"
                            >
                                <Camera size={18} />
                                <span>Use Camera</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Center: Text Input */}
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything"
                    rows={1}
                    disabled={disabled}
                    className="flex-1 bg-transparent text-white text-[16px] placeholder:text-white/40 px-3 py-2 focus:outline-none resize-none max-h-[120px] overflow-y-auto scrollbar-hide font-sans leading-relaxed"
                    style={{ minHeight: '24px' }}
                    onFocus={() => setShowAttachMenu(false)}
                />

                {/* Right: Mic + Send */}
                <div className="flex items-center gap-1 mr-1">
                    <button
                        type="button"
                        onClick={toggleRecording}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${isRecording ? 'text-red-400 bg-red-400/20 animate-pulse' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        title={isRecording ? "Stop Recording" : "Use Voice"}
                        disabled={isLoading}
                    >
                        {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                    </button>

                    {isLoading ? (
                        <button
                            type="button"
                            onClick={onStopGeneration}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 transition-all active:scale-90"
                            title="Stop generation"
                        >
                            <div className="w-3.5 h-3.5 bg-black rounded-sm" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={(!input.trim() && !attachment)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${(input.trim() || attachment) ? 'bg-white text-black hover:bg-zinc-200' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                        >
                            <ArrowUp size={20} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default InputArea;
