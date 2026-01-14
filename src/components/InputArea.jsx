import { useState, useRef, useEffect } from 'react';
import { Send, Image, Mic, Paperclip, ArrowUp, Camera, X, StopCircle } from 'lucide-react';
import { extractPdfText } from '../services/pdfService';
import CameraModal from './CameraModal';

const InputArea = ({ onSendMessage, disabled }) => {
    const [input, setInput] = useState('');
    const [isCameraOpen, setCameraOpen] = useState(false);
    const [attachment, setAttachment] = useState(null); // { type: 'image'|'file', url: string, name: string }
    const [isRecording, setIsRecording] = useState(false);

    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const originalTextRef = useRef('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if ((!input.trim() && !attachment) || disabled) return;

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
            // Convert image to base64
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // Remove data:image/...;base64, prefix
                setAttachment({
                    type: 'image',
                    base64: base64,
                    url: reader.result, // Keep full URL for preview
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
                className="hidden"
            />

            <form onSubmit={handleSubmit} className="relative flex flex-col w-full p-3 bg-surface border border-subtle rounded-[26px] shadow-sm transition-colors focus-within:border-zinc-600 focus-within:bg-[#252627]">

                {/* Attachment Preview */}
                {attachment && (
                    <div className="px-3 pt-2 pb-1">
                        <div className="relative inline-block group">
                            {attachment.type === 'image' ? (
                                <img src={attachment.url} alt="preview" className="h-16 w-auto rounded-lg border border-subtle object-cover" />
                            ) : (
                                <div className="h-12 px-3 flex items-center bg-zinc-800 rounded-lg border border-subtle text-xs text-zinc-300">
                                    <Paperclip size={14} className="mr-2 shrink-0" />
                                    <span className="truncate max-w-[200px]">{attachment.name}</span>
                                    {attachment.type === 'text' && (
                                        <span className="ml-2 text-green-500 text-[10px]">✓ Ready</span>
                                    )}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setAttachment(null)}
                                className="absolute -top-2 -right-2 bg-zinc-700 text-white rounded-full p-1 shadow-md hover:bg-zinc-600 transition-colors"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    </div>
                )}

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Message Kreo..."
                    rows={1}
                    disabled={disabled}
                    className="w-full bg-transparent text-text-primary text-[16px] placeholder:text-text-tertiary px-2 py-2 focus:outline-none resize-none max-h-[200px] overflow-y-auto scrollbar-hide font-sans leading-relaxed"
                    style={{ minHeight: '24px' }}
                />

                <div className="flex items-center justify-between mt-2 pl-1 pr-1">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-text-tertiary hover:text-text-primary hover:bg-white/5 rounded-full transition-colors"
                            title="Attach file"
                        >
                            <Paperclip size={20} strokeWidth={1.5} />
                        </button>

                        <button
                            type="button"
                            onClick={() => setCameraOpen(true)}
                            className="p-2 text-text-tertiary hover:text-text-primary hover:bg-white/5 rounded-full transition-colors"
                            title="Use Camera"
                        >
                            <Camera size={20} strokeWidth={1.5} />
                        </button>

                        <button
                            type="button"
                            onClick={toggleRecording}
                            className={`p-2 rounded-full transition-colors ${isRecording ? 'text-red-400 bg-red-400/10' : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'}`}
                            title={isRecording ? "Stop Recording" : "Use Voice"}
                        >
                            {isRecording ? <StopCircle size={20} strokeWidth={1.5} /> : <Mic size={20} strokeWidth={1.5} />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={(!input.trim() && !attachment) || disabled}
                            className={`
                                w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                                ${(input.trim() || attachment)
                                    ? 'bg-white text-black hover:bg-zinc-200'
                                    : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}
                            `}
                        >
                            <ArrowUp size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default InputArea;
