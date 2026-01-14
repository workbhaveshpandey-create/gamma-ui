import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, RefreshCcw } from 'lucide-react';

const CameraModal = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const startCamera = async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageDataUrl = canvas.toDataURL('image/png');
            onCapture(imageDataUrl);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center fade-in">
            <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl border border-zinc-800">

                {/* Header */}
                <div className="absolute top-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                    <span className="text-white font-medium ml-2">Take Photo</span>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-black/50 hover:bg-zinc-800 text-white transition-colors backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Viewport */}
                <div className="relative aspect-video bg-black flex items-center justify-center">
                    {error ? (
                        <div className="text-red-400 text-sm">{error}</div>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Controls */}
                <div className="absolute bottom-0 w-full p-6 flex justify-center items-center gap-8 bg-gradient-to-t from-black/90 to-transparent">
                    <button
                        onClick={() => { stopCamera(); startCamera(); }}
                        className="p-3 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Retake / Refresh"
                    >
                        <RefreshCcw size={24} />
                    </button>

                    <button
                        onClick={handleCapture}
                        className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    >
                        <div className="w-12 h-12 bg-white rounded-full" />
                    </button>

                    <div className="w-12" /> {/* Spacer for symmetry */}
                </div>
            </div>
        </div>
    );
};

export default CameraModal;
