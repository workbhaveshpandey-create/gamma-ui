import React, { useState, useEffect, useRef } from 'react';
import { X, Save, ChevronDown, Check, Settings, User, Globe, Cpu, Image as ImageIcon, Download, Loader2, FolderOpen, FolderInput } from 'lucide-react';
import { getAvailableModels } from '../services/ollamaService';

const SettingsPanel = ({ isOpen, onClose, onSave, initialSettings }) => {
    const [settings, setSettings] = useState(initialSettings);
    const [availableModels, setAvailableModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const [isDownloadingModel, setIsDownloadingModel] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (initialSettings) setSettings(initialSettings);
    }, [initialSettings]);

    // Fetch available models when panel opens
    useEffect(() => {
        if (isOpen) {
            const fetchModels = async () => {
                setIsLoadingModels(true);
                const models = await getAvailableModels();
                setAvailableModels(models);
                setIsLoadingModels(false);
            };
            fetchModels();
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsModelDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onSave(settings);
        onClose();
    };

    const handleSelectModel = (modelName) => {
        handleChange('model', modelName);
        setIsModelDropdownOpen(false);
    };

    const handleDownloadModel = async () => {
        if (!settings.diffusionModelPath) return;
        setIsDownloadingModel(true);
        setDownloadStatus('Starting download... this may take a while (~4GB)');

        try {
            const res = await fetch('/api/download-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelPath: settings.diffusionModelPath })
            });
            const data = await res.json();
            if (data.success) {
                setDownloadStatus('Example: Success! Model Ready.');
                setTimeout(() => setDownloadStatus(''), 5000);
            } else {
                setDownloadStatus('Error: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            setDownloadStatus('Network Error: ' + e.message);
        } finally {
            setIsDownloadingModel(false);
        }
    };


    const handleSelectFolder = async () => {
        try {
            const res = await fetch('/api/utils/select-folder', { method: 'POST' });
            const data = await res.json();
            if (data.success && data.path) {
                handleChange('diffusionModelPath', data.path);
            }
        } catch (e) {
            console.error("Failed to select folder", e);
        }
    };

    const handleOpenFolder = async () => {
        if (!settings.diffusionModelPath) return;
        try {
            await fetch('/api/utils/open-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: settings.diffusionModelPath })
            });
        } catch (e) {
            console.error("Failed to open folder", e);
        }
    };

    const selectedModel = availableModels.find(m => m.name === settings.model);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-6">
            {/* Modal Container */}
            <div className="w-full max-w-lg bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Settings size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Settings</h2>
                            <p className="text-xs text-zinc-500">Customize your experience</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all duration-200"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">

                    {/* Model Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            <Cpu size={14} />
                            <span>AI Model</span>
                        </div>

                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                className="w-full bg-zinc-800/50 border border-white/10 rounded-2xl px-4 py-4 text-left flex items-center justify-between hover:border-blue-500/30 hover:bg-zinc-800/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                        <Cpu size={16} className="text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-white">
                                            {isLoadingModels ? 'Loading...' : settings.model || 'Select a model'}
                                        </span>
                                        {selectedModel && (
                                            <span className="text-xs text-zinc-500">
                                                {(selectedModel.size / 1e9).toFixed(1)} GB
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronDown
                                    size={18}
                                    className={`text-zinc-400 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {/* Dropdown */}
                            {isModelDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                                    <div className="max-h-52 overflow-y-auto scrollbar-hide">
                                        {isLoadingModels ? (
                                            <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                                                <div className="animate-pulse">Loading models...</div>
                                            </div>
                                        ) : availableModels.length > 0 ? (
                                            availableModels.map((model) => (
                                                <button
                                                    key={model.name}
                                                    onClick={() => handleSelectModel(model.name)}
                                                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors ${settings.model === model.name ? 'bg-blue-500/10' : ''
                                                        }`}
                                                >
                                                    <div className="text-left">
                                                        <span className={`text-sm font-medium ${settings.model === model.name ? 'text-blue-400' : 'text-white'
                                                            }`}>
                                                            {model.name}
                                                        </span>
                                                        <span className="block text-xs text-zinc-500 mt-0.5">
                                                            {(model.size / 1e9).toFixed(1)} GB
                                                        </span>
                                                    </div>
                                                    {settings.model === model.name && (
                                                        <Check size={16} className="text-blue-400" />
                                                    )}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                                                No models found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/5" />

                    {/* User Settings */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            <User size={14} />
                            <span>Profile</span>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-zinc-300">Your Name</label>
                            <input
                                type="text"
                                value={settings.userName || ''}
                                onChange={(e) => handleChange('userName', e.target.value)}
                                placeholder="Enter your name"
                                className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent transition-all duration-200"
                            />
                            <p className="text-xs text-zinc-600">Used for personalized greetings</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/5" />

                    {/* Region Settings */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            <Globe size={14} />
                            <span>Region</span>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-zinc-300">Location</label>
                            <div className="relative">
                                <select
                                    value={settings.region || 'en-IN'}
                                    onChange={(e) => handleChange('region', e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                                >
                                    <option value="en-IN">🇮🇳 India</option>
                                    <option value="en-US">🇺🇸 United States</option>
                                    <option value="en-GB">🇬🇧 United Kingdom</option>
                                    <option value="en-AU">🇦🇺 Australia</option>
                                    <option value="en-CA">🇨🇦 Canada</option>
                                    <option value="wt-wt">🌍 Global</option>
                                </select>
                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                            <p className="text-xs text-zinc-600">Sets local time & news preference</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/5" />

                    {/* Image Generation Settings */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            <ImageIcon size={14} />
                            <span>Image Generation (Local)</span>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-zinc-300">Model Path</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSelectFolder}
                                    title="Choose folder..."
                                    className="bg-zinc-700/50 hover:bg-zinc-700 border border-white/10 rounded-xl px-3 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                                >
                                    <FolderInput size={18} />
                                </button>
                                <input
                                    type="text"
                                    value={settings.diffusionModelPath || './models'}
                                    onChange={(e) => handleChange('diffusionModelPath', e.target.value)}
                                    placeholder="./models"
                                    className="flex-1 bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                />
                                <button
                                    onClick={handleOpenFolder}
                                    title="Open content in Finder"
                                    disabled={!settings.diffusionModelPath}
                                    className="bg-zinc-700/50 hover:bg-zinc-700 border border-white/10 rounded-xl px-3 flex items-center justify-center text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    <FolderOpen size={18} />
                                </button>
                                <button
                                    onClick={handleDownloadModel}
                                    disabled={isDownloadingModel}
                                    className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/30 rounded-xl px-4 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Download Stable Diffusion v1.5 to this path"
                                >
                                    {isDownloadingModel ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                </button>
                            </div>
                            {downloadStatus && (
                                <p className={`text-xs ${downloadStatus.includes('Error') ? 'text-red-400' : 'text-green-400'} animate-pulse`}>
                                    {downloadStatus}
                                </p>
                            )}
                            <p className="text-xs text-zinc-600">Folder where Stable Diffusion weights are stored.</p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-white/5 bg-zinc-900/50">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-all duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98]"
                        >
                            <Save size={18} />
                            Save
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsPanel;
