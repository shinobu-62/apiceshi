import React, { useState } from 'react';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import SettingsModal from './components/SettingsModal';
import ChatMode from './components/ChatMode';
import ImageMode from './components/ImageMode';
import VideoMode from './components/VideoMode';
import { AppMode } from './types';
import { MessageSquare, Image, Video, Settings, LogOut, LayoutGrid } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isConfigured, clearSettings } = useSettings();
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [showSettings, setShowSettings] = useState(false);

  // If not configured, the Modal handles the forced view.
  // We pass !isConfigured as 'isOpen' to force it open if no keys.
  const forcedModalOpen = !isConfigured;

  return (
    <div className="min-h-screen bg-nexus-950 text-gray-100 font-sans flex overflow-hidden">
      
      {/* Settings Modal (Forced or Optional) */}
      <SettingsModal 
        isOpen={forcedModalOpen || showSettings} 
        canClose={isConfigured} 
        onClose={() => setShowSettings(false)} 
      />

      {/* Sidebar */}
      <aside className="w-20 lg:w-64 border-r border-nexus-800 flex flex-col bg-nexus-950 z-20 transition-all duration-300">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-nexus-800">
            <LayoutGrid className="w-8 h-8 text-nexus-accent" />
            <span className="hidden lg:block ml-3 font-bold text-xl tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                NEXUS AI
            </span>
        </div>

        <nav className="flex-1 py-6 space-y-2 px-2">
            <SidebarItem 
                icon={<MessageSquare />} 
                label="对话" 
                active={mode === AppMode.CHAT} 
                onClick={() => setMode(AppMode.CHAT)} 
            />
            <SidebarItem 
                icon={<Image />} 
                label="图像生成" 
                active={mode === AppMode.IMAGE} 
                onClick={() => setMode(AppMode.IMAGE)} 
            />
            <SidebarItem 
                icon={<Video />} 
                label="视频生成" 
                active={mode === AppMode.VIDEO} 
                onClick={() => setMode(AppMode.VIDEO)} 
            />
        </nav>

        <div className="p-4 border-t border-nexus-800 space-y-2">
            <button 
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl hover:bg-nexus-800 text-gray-400 hover:text-white transition-all"
            >
                <Settings className="w-5 h-5" />
                <span className="hidden lg:block text-sm">设置</span>
            </button>
            <button 
                onClick={clearSettings}
                className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl hover:bg-red-900/20 text-gray-400 hover:text-red-400 transition-all"
            >
                <LogOut className="w-5 h-5" />
                <span className="hidden lg:block text-sm">断开连接</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col h-screen overflow-hidden">
        {/* Top Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-nexus-800 to-transparent"></div>
        
        <div className="flex-1 p-4 lg:p-8 overflow-hidden">
            {mode === AppMode.CHAT && <ChatMode />}
            {mode === AppMode.IMAGE && <ImageMode />}
            {mode === AppMode.VIDEO && <VideoMode />}
        </div>
      </main>
    </div>
  );
};

// Helper Component for Sidebar
const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
            active 
            ? 'bg-nexus-900 text-white shadow-lg shadow-black/40' 
            : 'text-gray-400 hover:bg-nexus-900/50 hover:text-white'
        }`}
    >
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-nexus-accent rounded-r"></div>}
        <span className={`${active ? 'text-nexus-accent' : 'group-hover:text-gray-200'} transition-colors`}>
            {icon}
        </span>
        <span className="hidden lg:block font-medium text-sm">{label}</span>
    </button>
);

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
};

export default App;