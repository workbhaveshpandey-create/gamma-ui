import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsPanel from './components/SettingsPanel';
import { getAllChats, getGroupedChats, deleteChat } from './services/chatStorage';

function App() {
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState({});

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const [appSettings, setAppSettings] = useState({
    model: 'gemma3:4b',
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    num_ctx: 4096,
    repeat_penalty: 1.1,
    seed: 42,
    systemPrompt: 'You are a helpful AI assistant.',
  });

  // Load chat history
  const refreshChatHistory = useCallback(() => {
    setChatHistory(getGroupedChats());
  }, []);

  useEffect(() => {
    refreshChatHistory();
  }, [refreshChatHistory]);

  // Check backend connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch('/ollama/api/tags', { signal: controller.signal });
        clearTimeout(timeoutId);
        setIsConnected(response.ok);
      } catch (err) {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
  };

  const handleDeleteChat = (chatId) => {
    deleteChat(chatId);
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
    refreshChatHistory();
  };

  return (
    <div className="flex w-full h-screen bg-app text-zinc-100 overflow-hidden font-sans">
      <Sidebar
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setSettingsOpen(true)}
        isOpen={isSidebarOpen}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        isConnected={isConnected}
        chatHistory={chatHistory}
      />

      <main className="flex-1 relative flex flex-col h-full min-w-0 bg-app transition-all duration-300 ease-custom">
        <ChatWindow
          chatId={currentChatId}
          settings={appSettings}
          onChatCreated={(newChatId) => {
            setCurrentChatId(newChatId);
            refreshChatHistory();
          }}
          onChatUpdated={refreshChatHistory}
        />
      </main>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialSettings={appSettings}
        onSave={setAppSettings}
      />
    </div>
  );
}

export default App;
