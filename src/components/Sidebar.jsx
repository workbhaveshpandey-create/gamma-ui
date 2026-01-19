import { Plus, PanelLeft, Trash2, Settings } from 'lucide-react';

const Sidebar = ({ currentChatId, onSelectChat, onNewChat, onDeleteChat, isOpen, onToggle, isConnected, chatHistory = {}, onOpenSettings, onOpenGallery }) => {

    const hasChats = Object.values(chatHistory).some(group => group.length > 0);

    return (
        <aside
            className={`
                h-full flex flex-col glass-panel transition-[width] duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative shrink-0 z-50
                ${isOpen ? 'w-[280px]' : 'w-[72px]'}
            `}
        >
            {/* Toggle + Header */}
            <div className={`p-4 flex items-center ${isOpen ? 'justify-between' : 'justify-center flex-col gap-4'}`}>
                {isOpen ? (
                    <>
                        <div className="flex items-center gap-3 animate-fade-in">
                            <img src="/kreo-icon.png" alt="Kreo" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                            <span className="text-lg font-medium text-text-primary tracking-tight">Kreo</span>
                        </div>
                        <button
                            onClick={onToggle}
                            className="p-2 rounded-full text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all duration-200 active:scale-90"
                            title="Collapse sidebar"
                        >
                            <PanelLeft size={20} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onToggle}
                        className="p-2 rounded-full text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all duration-200 active:scale-90 mb-2"
                        title="Expand sidebar"
                    >
                        <PanelLeft size={20} />
                    </button>
                )}
            </div>

            {/* New Chat - Big Pill */}
            <div className="px-4 pb-6">
                <button
                    onClick={onNewChat}
                    className={`
                        flex items-center gap-3 bg-surface hover:bg-surface-hover w-full py-3 rounded-full transition-all duration-200 active:scale-95 group text-sm text-text-primary border border-transparent hover:border-white/5 shadow-sm
                        ${isOpen ? 'px-4 justify-start' : 'justify-center px-0 w-10 h-10 mx-auto'}
                    `}
                    title="New Chat"
                >
                    <Plus size={20} className="shrink-0 text-text-secondary group-hover:text-text-primary transition-colors" />
                    {isOpen && <span className="font-medium text-text-secondary group-hover:text-text-primary whitespace-nowrap overflow-hidden animate-fade-in">New chat</span>}
                </button>
            </div>

            {/* Scrollable Chat History */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {isOpen && hasChats ? (
                    Object.entries(chatHistory).map(([groupName, chats]) => (
                        chats.length > 0 && (
                            <div key={groupName} className="animate-fade-in">
                                <div className="text-xs font-medium text-text-tertiary px-4 mb-2 uppercase tracking-wider opacity-80">
                                    {groupName}
                                </div>
                                <div className="space-y-1">
                                    {chats.map(chat => (
                                        <div
                                            key={chat.id}
                                            className={`
                                                group flex items-center w-full px-3 py-2 rounded-lg text-left text-sm transition-all duration-200 cursor-pointer min-w-0 active:scale-[0.98]
                                                ${currentChatId === chat.id
                                                    ? 'bg-blue-500/10 text-blue-100 font-medium'
                                                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                                                }
                                            `}
                                            onClick={() => onSelectChat(chat.id)}
                                        >
                                            <span className="truncate flex-1">{chat.title || 'Untitled Chat'}</span>

                                            {/* Hover Delete - Only show on hover/active */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteChat(chat.id);
                                                }}
                                                className={`
                                                    p-1 text-text-tertiary hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded
                                                    ${currentChatId === chat.id ? 'opacity-0' : ''} 
                                                `}
                                                title="Delete chat"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ))
                ) : (
                    /* Empty State for minimal mode or no chats */
                    !hasChats && isOpen && (
                        <div className="text-center text-text-tertiary text-sm mt-12 animate-fade-in">
                            No recent chats
                        </div>
                    )
                )}
            </div>

            {/* Footer with Settings */}
            <div className={`p-3 mt-auto border-t border-white/5 space-y-1 ${isOpen ? '' : 'flex flex-col items-center'}`}>

                {/* Gallery Button */}
                <button
                    onClick={onOpenGallery}
                    className={`
                        flex items-center gap-3 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all duration-200 active:scale-95
                        ${isOpen ? 'px-3 py-2.5 w-full' : 'p-2 justify-center'}
                    `}
                    title="Image Gallery"
                >
                    <div className="w-5 h-5 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                    </div>
                    {isOpen && <span className="text-sm font-medium animate-fade-in">Gallery</span>}
                </button>

                {/* Settings Button */}
                <button
                    onClick={onOpenSettings}
                    className={`
                        flex items-center gap-3 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all duration-200 active:scale-95
                        ${isOpen ? 'px-3 py-2.5 w-full' : 'p-2 justify-center'}
                    `}
                    title="Settings"
                >
                    <Settings size={20} />
                    {isOpen && <span className="text-sm font-medium animate-fade-in">Settings</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
