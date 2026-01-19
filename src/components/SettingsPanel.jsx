import React, { useState, useEffect, useRef } from 'react';
import { X, Save, ChevronDown, Check, Settings, User, Globe, Cpu, Image as ImageIcon, Download, Loader2, FolderOpen, FolderInput, Database, RefreshCw } from 'lucide-react';
import { getAvailableModels } from '../services/ollamaService';

const SettingsPanel = ({ isOpen, onClose, onSave, initialSettings }) => {
    const [settings, setSettings] = useState(initialSettings);
    const [availableModels, setAvailableModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const [isDownloadingModel, setIsDownloadingModel] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState('');
    const dropdownRef = useRef(null);

    // New State for Tabs & Refresh
    const [activeTab, setActiveTab] = useState('general');
    const [refreshingModels, setRefreshingModels] = useState(false);

    useEffect(() => {
        if (initialSettings) setSettings(initialSettings);
    }, [initialSettings]);

    // Fetch available models when panel opens
    useEffect(() => {
        if (isOpen) {
            refreshModels();
        }
    }, [isOpen]);

    // Refresh Models Function
    const refreshModels = async () => {
        setIsLoadingModels(true);
        setRefreshingModels(true);
        const models = await getAvailableModels();
        setAvailableModels(models);
        setRefreshingModels(false);
        setIsLoadingModels(false);
    };

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
        setDownloadStatus('Starting download... this may take a while (~7GB)');

        try {
            const res = await fetch('/api/download-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelPath: settings.diffusionModelPath })
            });
            const data = await res.json();
            if (data.success) {
                setDownloadStatus('Success! Model Ready.');
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

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'ai', label: 'AI Model', icon: Cpu },
        { id: 'image', label: 'Image Gen', icon: ImageIcon },
        { id: 'knowledge', label: 'Knowledge', icon: Database }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                ref={dropdownRef}
                className="w-full max-w-4xl h-[600px] bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex overflow-hidden"
            >
                {/* Sidebar Navigation */}
                <div className="w-64 bg-black/20 border-r border-white/5 p-4 flex flex-col gap-2">
                    <h2 className="text-xl font-bold text-white mb-6 px-4">Settings</h2>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col h-full">
                    {/* Header */}
                    <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/10">
                        <h3 className="text-lg font-semibold text-white">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h3>
                        <div className="flex items-center gap-3">
                            {activeTab === 'ai' && (
                                <button
                                    onClick={refreshModels}
                                    className="text-xs flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10"
                                >
                                    <RefreshCw size={12} className={refreshingModels ? 'animate-spin' : ''} />
                                    Refresh Models
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                        {/* GENERAL TAB */}
                        {activeTab === 'general' && (
                            <div className="space-y-6 max-w-lg">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">User Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                        <input
                                            type="text"
                                            value={settings.userName || ''}
                                            onChange={(e) => handleChange('userName', e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-zinc-700"
                                            placeholder="What should AI call you?"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Region</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                        <select
                                            value={settings.region || 'en-IN'}
                                            onChange={(e) => handleChange('region', e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="en-IN">🇮🇳 India</option>
                                            <option value="en-US">🇺🇸 United States</option>
                                            <option value="en-GB">🇬🇧 United Kingdom</option>
                                            <option value="en-AU">🇦🇺 Australia</option>
                                            <option value="en-CA">🇨🇦 Canada</option>
                                            <option value="wt-wt">🌍 Global</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                                    </div>
                                    <p className="text-xs text-zinc-600">Used for localized search results.</p>
                                </div>
                            </div>
                        )}

                        {/* AI MODEL TAB */}
                        {activeTab === 'ai' && (
                            <div className="space-y-6 max-w-lg">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Deep Learning Model</label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                            className="w-full flex items-center justify-between bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white hover:border-purple-500/30 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/5 group-hover:border-purple-500/20 transition-colors">
                                                    <Cpu size={16} className="text-purple-400" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-sm font-medium">{settings.model || 'Select Model'}</div>
                                                    {availableModels.find(m => m.name === settings.model) && (
                                                        <div className="text-[10px] text-zinc-500">
                                                            {(availableModels.find(m => m.name === settings.model)?.size / 1e9).toFixed(1)} GB
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isModelDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                                                {isLoadingModels ? (
                                                    <div className="p-4 flex items-center gap-2 text-zinc-500 text-sm justify-center">
                                                        <Loader2 size={16} className="animate-spin" /> Fetching models...
                                                    </div>
                                                ) : availableModels.length > 0 ? (
                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                                        {availableModels.map((model) => (
                                                            <button
                                                                key={model.name}
                                                                onClick={() => handleSelectModel(model.name)}
                                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between group transition-colors ${settings.model === model.name ? 'bg-purple-500/20 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                                                                    }`}
                                                            >
                                                                <span>{model.name}</span>
                                                                {settings.model === model.name && <Check size={14} className="text-purple-400" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-center">
                                                        <div className="text-zinc-500 text-sm mb-2">No models found</div>
                                                        <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">
                                                            Download from Ollama Library
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-600 pl-1">
                                        Ensuring Ollama is running on port 11434.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* IMAGE GEN TAB */}
                        {activeTab === 'image' && (
                            <div className="space-y-6 max-w-lg">
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                                <ImageIcon size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-medium text-sm">Local Image Support</h4>
                                                <p className="text-xs text-purple-300/70">Powered by SDXL Turbo / Flux</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-400">Model Storage Path</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <FolderInput className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                                <input
                                                    type="text"
                                                    value={settings.diffusionModelPath}
                                                    onChange={(e) => handleChange('diffusionModelPath', e.target.value)}
                                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-purple-500/50"
                                                    placeholder="./models"
                                                />
                                            </div>
                                            <button
                                                onClick={handleSelectFolder}
                                                className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                                                title="Select Folder"
                                            >
                                                <FolderOpen size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleOpenFolder}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-300 text-sm font-medium hover:bg-white/10 transition-all"
                                        >
                                            <FolderOpen size={16} />
                                            Open Folder
                                        </button>
                                        <button
                                            onClick={handleDownloadModel}
                                            disabled={isDownloadingModel}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-transparent text-sm font-medium transition-all ${isDownloadingModel
                                                    ? 'bg-purple-500/20 text-purple-400 cursor-not-allowed'
                                                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'
                                                }`}
                                        >
                                            {isDownloadingModel ? (
                                                <><Loader2 size={16} className="animate-spin" /> Downloading...</>
                                            ) : (
                                                <><Download size={16} /> Download Model</>
                                            )}
                                        </button>
                                    </div>

                                    {downloadStatus && (
                                        <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                            <p className="text-xs text-zinc-400 font-mono break-all">
                                                {downloadStatus}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* KNOWLEDGE TAB */}
                        {activeTab === 'knowledge' && (
                            <div className="space-y-6 max-w-lg">
                                <div className="p-4 rounded-xl bg-black/20 border border-white/10 flex flex-col items-center justify-center text-center py-12">
                                    <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3 text-zinc-500">
                                        <Database size={24} />
                                    </div>
                                    <h4 className="text-zinc-300 font-medium mb-1">Knowledge Base</h4>
                                    <p className="text-xs text-zinc-500 max-w-xs">
                                        Manage your learned facts and RAG documents here.
                                    </p>
                                    <button className="mt-4 px-4 py-2 bg-white/5 text-zinc-400 text-xs rounded-lg border border-white/10 hover:text-white hover:bg-white/10 transition-colors">
                                        View Stored Facts
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-black/10">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-400 text-sm font-medium hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
