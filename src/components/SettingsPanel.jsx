import React, { useState, useEffect, useRef } from 'react';
import { X, Save, ChevronDown, Check } from 'lucide-react';
import { getAvailableModels } from '../services/ollamaService';

const SettingsPanel = ({ isOpen, onClose, onSave, initialSettings }) => {
    const [settings, setSettings] = useState(initialSettings);
    const [availableModels, setAvailableModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
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

    const selectedModel = availableModels.find(m => m.name === settings.model);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end fade-in duration-200">
            <div className="w-full max-w-md h-full bg-sidebar border-l border-subtle shadow-2xl flex flex-col animate-slide-left">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-subtle bg-sidebar z-10">
                    <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-surface transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">

                    {/* Model Selection Section */}
                    <div className="space-y-4">
                        <label className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Model</label>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Select Model</label>

                            {/* Custom Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                    className="w-full bg-surface border border-subtle rounded-xl px-4 py-3.5 text-left flex items-center justify-between hover:border-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-text-primary">
                                            {isLoadingModels ? 'Loading...' : settings.model || 'Select a model'}
                                        </span>
                                        {selectedModel && (
                                            <span className="text-xs text-text-tertiary mt-0.5">
                                                {(selectedModel.size / 1e9).toFixed(1)} GB
                                            </span>
                                        )}
                                    </div>
                                    <ChevronDown
                                        size={18}
                                        className={`text-text-tertiary transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {/* Dropdown Menu */}
                                {isModelDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-subtle rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="max-h-64 overflow-y-auto">
                                            {isLoadingModels ? (
                                                <div className="px-4 py-6 text-center text-text-tertiary text-sm">
                                                    <div className="animate-pulse">Loading models...</div>
                                                </div>
                                            ) : availableModels.length > 0 ? (
                                                availableModels.map((model) => (
                                                    <button
                                                        key={model.name}
                                                        onClick={() => handleSelectModel(model.name)}
                                                        className={`w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors ${settings.model === model.name ? 'bg-accent-primary/10' : ''
                                                            }`}
                                                    >
                                                        <div className="text-left">
                                                            <span className={`text-sm font-medium ${settings.model === model.name ? 'text-accent-primary' : 'text-text-primary'
                                                                }`}>
                                                                {model.name}
                                                            </span>
                                                            <span className="block text-xs text-text-tertiary mt-0.5">
                                                                {(model.size / 1e9).toFixed(1)} GB
                                                            </span>
                                                        </div>
                                                        {settings.model === model.name && (
                                                            <Check size={16} className="text-accent-primary" />
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-6 text-center text-text-tertiary text-sm">
                                                    No models found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-text-tertiary">Choose from downloaded Ollama models</p>
                        </div>
                    </div>

                    {/* General Section */}
                    <div className="space-y-4">
                        <label className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">General</label>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Your Name</label>
                            <input
                                type="text"
                                value={settings.userName || ''}
                                onChange={(e) => handleChange('userName', e.target.value)}
                                placeholder="Enter your name"
                                className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-transparent transition-all duration-200"
                            />
                            <p className="text-xs text-text-tertiary">Used for personalized greetings</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-subtle bg-sidebar z-10">
                    <button
                        onClick={handleSave}
                        className="w-full py-3.5 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all duration-200 font-semibold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
                    >
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SettingsPanel;
