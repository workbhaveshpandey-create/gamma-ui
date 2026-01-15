import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';

const SettingsPanel = ({ isOpen, onClose, onSave, initialSettings }) => {
    const [settings, setSettings] = useState(initialSettings);

    useEffect(() => {
        if (initialSettings) setSettings(initialSettings);
    }, [initialSettings]);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onSave(settings);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end fade-in duration-200">
            <div className="w-full max-w-md h-full bg-sidebar border-l border-subtle shadow-2xl flex flex-col animate-slide-left">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-subtle bg-sidebar z-10">
                    <h2 className="text-lg font-semibold text-text-primary">Model Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-surface transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">

                    {/* General Section */}
                    <div className="space-y-4">
                        <label className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">General</label>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Model Name</label>
                            <input
                                type="text"
                                value={settings.model}
                                onChange={(e) => handleChange('model', e.target.value)}
                                className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-text-secondary transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Your Name</label>
                            <input
                                type="text"
                                value={settings.userName || ''}
                                onChange={(e) => handleChange('userName', e.target.value)}
                                placeholder="Enter your name"
                                className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-text-secondary transition-colors"
                            />
                            <p className="text-xs text-text-tertiary">Used for personalized greetings</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">System Prompt</label>
                            <textarea
                                value={settings.systemPrompt}
                                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                                rows={4}
                                className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-text-secondary transition-colors resize-none leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* Parameters Section */}
                    <div className="space-y-6">
                        <label className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Parameters</label>

                        {/* Temperature */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-text-secondary">Temperature</label>
                                <span className="text-xs font-mono text-text-primary bg-surface px-1.5 py-0.5 rounded">{settings.temperature}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={settings.temperature}
                                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-surface rounded-full appearance-none cursor-pointer accent-white"
                            />
                        </div>

                        {/* Top P */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-text-secondary">Top P</label>
                                <span className="text-xs font-mono text-text-primary bg-surface px-1.5 py-0.5 rounded">{settings.top_p}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={settings.top_p}
                                onChange={(e) => handleChange('top_p', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-surface rounded-full appearance-none cursor-pointer accent-white"
                            />
                        </div>

                        {/* Top K */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-text-secondary">Top K</label>
                                <span className="text-xs font-mono text-text-primary bg-surface px-1.5 py-0.5 rounded">{settings.top_k}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={settings.top_k}
                                onChange={(e) => handleChange('top_k', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-surface rounded-full appearance-none cursor-pointer accent-white"
                            />
                        </div>

                        {/* Repeat Penalty */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-text-secondary">Repeat Penalty</label>
                                <span className="text-xs font-mono text-text-primary bg-surface px-1.5 py-0.5 rounded">{settings.repeat_penalty}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={settings.repeat_penalty}
                                onChange={(e) => handleChange('repeat_penalty', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-surface rounded-full appearance-none cursor-pointer accent-white"
                            />
                        </div>

                        {/* Context & Seed */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">Context Size</label>
                                <input
                                    type="number"
                                    value={settings.num_ctx}
                                    onChange={(e) => handleChange('num_ctx', parseInt(e.target.value))}
                                    className="w-full bg-surface border border-subtle rounded-lg px-2 py-2 text-sm text-text-primary focus:outline-none focus:border-text-secondary transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">Seed</label>
                                <input
                                    type="number"
                                    value={settings.seed}
                                    onChange={(e) => handleChange('seed', parseInt(e.target.value))}
                                    placeholder="-1"
                                    className="w-full bg-surface border border-subtle rounded-lg px-2 py-2 text-sm text-text-primary focus:outline-none focus:border-text-secondary transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-subtle bg-sidebar z-10">
                    <button
                        onClick={handleSave}
                        className="w-full py-3 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors font-semibold flex items-center justify-center gap-2 shadow-lg"
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
