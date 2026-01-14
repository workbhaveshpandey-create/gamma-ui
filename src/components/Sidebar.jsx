import { Plus, Settings, PanelLeft, Trash2 } from 'lucide-react';

const Sidebar = ({ currentChatId, onSelectChat, onNewChat, onDeleteChat, onOpenSettings, isOpen, onToggle, isConnected, chatHistory = {} }) => {

    const hasChats = Object.values(chatHistory).some(group => group.length > 0);

    return (
        <aside
            className={`
                h-full flex flex-col bg-sidebar transition-[width] duration-300 ease-out relative shrink-0 z-50
                ${isOpen ? 'w-[300px]' : 'w-[72px]'}
            `}
        >
            {/* Toggle + Header */}
            <div className={`p-4 flex items-center ${isOpen ? 'justify-between' : 'justify-center flex-col gap-4'}`}>
                {isOpen ? (
                    <>
                        <div className="flex items-center gap-3">
                            <img src="/kreo-icon.png" alt="Kreo" className="w-8 h-8 rounded-full object-cover" />
                            <span className="text-lg font-medium text-text-primary tracking-tight">Kreo</span>
                        </div>
                        <button
                            onClick={onToggle}
                            className="p-2 rounded-full text-text-secondary hover:bg-surface-hover transition-colors"
                            title="Collapse sidebar"
                        >
                            <PanelLeft size={20} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onToggle}
                        className="p-2 rounded-full text-text-secondary hover:bg-surface-hover transition-colors mb-2"
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
                        flex items-center gap-3 bg-surface hover:bg-surface-hover w-full py-3 rounded-full transition-all duration-200 group text-sm text-text-primary
                        ${isOpen ? 'px-4 justify-start' : 'justify-center px-0 w-10 h-10 mx-auto'}
                    `}
                    title="New Chat"
                >
                    <Plus size={20} className="shrink-0 text-text-secondary group-hover:text-text-primary" />
                    {isOpen && <span className="font-medium text-text-secondary group-hover:text-text-primary">New chat</span>}
                </button>
            </div>

            {/* Scrollable Chat History */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
                {isOpen && hasChats ? (
                    Object.entries(chatHistory).map(([groupName, chats]) => (
                        chats.length > 0 && (
                            <div key={groupName}>
                                <div className="text-xs font-medium text-text-tertiary px-3 mb-2 uppercase tracking-wider">
                                    {groupName}
                                </div>
                                <div className="space-y-1">
                                    {chats.map(chat => (
                                        <div
                                            key={chat.id}
                                            className={`
                                                group flex items-center w-full px-3 py-2 rounded-full text-left text-sm transition-colors cursor-pointer min-w-0
                                                ${currentChatId === chat.id
                                                    ? 'bg-blue-500/20 text-text-primary font-medium'
                                                    : 'text-text-secondary hover:bg-surface-hover'
                                                }
                                            `}
                                            onClick={() => onSelectChat(chat.id)}
                                        >
                                            <span className="truncate flex-1 py-0.5">{chat.title || 'Untitled Chat'}</span>

                                            {/* Hover Delete - Only show on hover/active */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteChat(chat.id);
                                                }}
                                                className={`
                                                    p-1 text-text-tertiary hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100
                                                    ${currentChatId === chat.id ? 'opacity-0' : ''} 
                                                `}
                                                title="Delete chat"
                                            >
                                                <Trash2 size={14} />
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
                        <div className="text-center text-text-tertiary text-sm mt-12">
                            No recent chats
                        </div>
                    )
                )}
            </div>

            {/* Simple Footer */}
            <div className="p-4 mt-auto">
                <button
                    onClick={onOpenSettings}
                    className={`
                        flex items-center gap-3 w-full p-2 rounded-full hover:bg-surface-hover transition-colors
                        ${isOpen ? 'justify-start' : 'justify-center'}
                     `}
                >
                    <Settings size={20} className="text-text-secondary" />
                    {isOpen && <span className="text-sm text-text-primary">Settings</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
