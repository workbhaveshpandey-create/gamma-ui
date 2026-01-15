import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsPanel from './components/SettingsPanel';
import { getAllChats, getGroupedChats, deleteChat } from './services/chatStorage';
import { warmModel } from './services/ollamaService';

function App() {
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState({});

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const defaultSettings = {
    model: 'gemma3:12b',
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    num_ctx: 4096,
    repeat_penalty: 1.1,
    seed: 42,
    systemPrompt: 'You are a helpful AI assistant.',
    userName: 'User',
  };

  const [appSettings, setAppSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('gamma_app_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('gamma_app_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  // Load chat history
  const refreshChatHistory = useCallback(() => {
    setChatHistory(getGroupedChats());
  }, []);

  useEffect(() => {
    refreshChatHistory();
    // Pre-load model on app start for faster first response
    warmModel(appSettings.model);
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

  const handleSaveSettings = (newSettings) => {
    setAppSettings(newSettings);
    // Warm the new model if it changed
    if (newSettings.model !== appSettings.model) {
      warmModel(newSettings.model);
    }
  };

  return (
    <div className="flex w-full h-screen bg-app text-zinc-100 overflow-hidden font-sans">
      <Sidebar
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        isOpen={isSidebarOpen}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        isConnected={isConnected}
        chatHistory={chatHistory}
        onOpenSettings={() => setIsSettingsOpen(true)}
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

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
          initialSettings={appSettings}
        />
      </main>
    </div>
  );
}

export default App;
