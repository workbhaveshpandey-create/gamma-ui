import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Download, ExternalLink } from 'lucide-react';

const ImageGalleryPanel = ({ isOpen, onClose }) => {
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const fetchImages = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/generated-images');
            const data = await res.json();
            setImages(data);
        } catch (err) {
            console.error("Failed to load images", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchImages();
        }
    }, [isOpen]);

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sliding Panel */}
            <div className={`
                fixed top-0 right-0 h-full w-[400px] bg-[#18181b] border-l border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <ImageIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Gallery</h2>
                            <p className="text-xs text-white/40">Your generated masterpieces</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/30 gap-3">
                            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Loading gallery...</span>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/30 text-center p-8">
                            <ImageIcon size={48} className="mb-4 opacity-50" />
                            <p className="text-sm">No images generated yet.</p>
                            <p className="text-xs mt-2 text-white/20">Ask Kreo to "generate an image" to see it here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {images.map((img) => (
                                <div
                                    key={img.filename}
                                    className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/20 cursor-pointer"
                                    onClick={() => setSelectedImage(img)}
                                >
                                    <img
                                        src={img.url}
                                        alt="Generated"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <span className="text-white text-xs font-medium px-3 py-1 bg-black/60 rounded-full backdrop-blur-md">
                                            View
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox Modal for Selected Image */}
            {selectedImage && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-5xl max-h-full w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <img
                            src={selectedImage.url}
                            alt="Full view"
                            className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl border border-white/10"
                        />

                        <div className="mt-6 flex items-center gap-4">
                            <a
                                href={selectedImage.url}
                                download={selectedImage.filename}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Download size={16} />
                                Download
                            </a>
                            <button
                                onClick={() => window.open(selectedImage.url, '_blank')}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
                            >
                                <ExternalLink size={16} />
                                Open Original
                            </button>
                        </div>

                        <button
                            className="absolute -top-12 right-0 text-white/50 hover:text-white p-2"
                            onClick={() => setSelectedImage(null)}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ImageGalleryPanel;
