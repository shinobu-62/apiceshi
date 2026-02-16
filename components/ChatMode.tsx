import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, StopCircle, Paperclip, X, Settings2, Globe, Key, Save } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ChatMessage, ChatContentPart } from '../types';
import { streamChatCompletion } from '../services/ai';
import { CHAT_MODELS, ENDPOINT_PRESETS } from '../constants';
import ReactMarkdown from 'react-markdown';

const STORAGE_KEY_CUSTOM_MODELS = 'nexus_custom_models_chat';

const ChatMode: React.FC = () => {
  const { settings } = useSettings();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // God Mode States
  const [model, setModel] = useState(CHAT_MODELS[0].value);
  const [endpoint, setEndpoint] = useState(ENDPOINT_PRESETS.CHAT[0]);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  
  // Smart Model Memory
  const [customModels, setCustomModels] = useState<string[]>([]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load custom models
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS);
    if (stored) {
      try {
        setCustomModels(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse custom models", e);
      }
    }
  }, []);

  const saveModelToMemory = (newModel: string) => {
    if (!newModel.trim()) return;
    // Check if it's already a default model
    const isDefault = CHAT_MODELS.some(m => m.value === newModel);
    if (isDefault) return;

    // Check if already saved
    if (!customModels.includes(newModel)) {
      const updated = [...customModels, newModel];
      setCustomModels(updated);
      localStorage.setItem(STORAGE_KEY_CUSTOM_MODELS, JSON.stringify(updated));
    }
  };

  const clearCustomModels = () => {
    setCustomModels([]);
    localStorage.removeItem(STORAGE_KEY_CUSTOM_MODELS);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isTyping) return;

    // Save model to memory on send
    saveModelToMemory(model);

    let content: string | ChatContentPart[] = input;
    if (selectedImage) {
      content = [
        { type: 'text', text: input || ' ' },
        { type: 'image_url', image_url: { url: selectedImage } }
      ];
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    setIsTyping(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now() },
    ]);

    try {
      let fullContent = "";
      await streamChatCompletion(
        [...messages, userMsg], 
        settings, 
        model,
        endpoint,
        customBaseUrl,
        customApiKey, // Pass local override key
        (chunk) => {
          fullContent += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, content: fullContent } : msg
            )
          );
        }
      );
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
            id: Date.now().toString(),
            role: 'system',
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: Date.now()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderContent = (content: string | ChatContentPart[]) => {
    if (typeof content === 'string') {
        return <ReactMarkdown>{content}</ReactMarkdown>;
    }
    return (
        <div className="flex flex-col gap-2">
            {content.map((part, idx) => {
                if (part.type === 'image_url') {
                    return <img key={idx} src={part.image_url.url} alt="User upload" className="max-w-full rounded-lg mb-2 max-h-60 object-contain" />;
                }
                if (part.type === 'text') {
                     return <ReactMarkdown key={idx}>{part.text}</ReactMarkdown>;
                }
                return null;
            })}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-nexus-900/50 rounded-2xl border border-nexus-800 overflow-hidden shadow-inner relative">
      
      {/* Configuration Toggle (Floating) */}
      <div className={`absolute top-0 left-0 right-0 z-20 bg-nexus-950/95 backdrop-blur-sm border-b border-nexus-800 transition-all duration-300 ease-in-out ${showConfig ? 'translate-y-0 shadow-xl' : '-translate-y-full'}`}>
         <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-nexus-cyan font-bold uppercase">Model ID</label>
                    {customModels.length > 0 && (
                        <button onClick={clearCustomModels} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Clear History
                        </button>
                    )}
                </div>
                <input 
                    list="chat-models" 
                    value={model} 
                    onChange={(e) => setModel(e.target.value)} 
                    className="w-full bg-nexus-900 border border-nexus-700 rounded p-2 text-sm text-white focus:border-nexus-accent focus:outline-none"
                    placeholder="e.g. gpt-4"
                />
                <datalist id="chat-models">
                    {CHAT_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    {customModels.map(m => <option key={m} value={m}>Custom: {m}</option>)}
                </datalist>
            </div>
            <div>
                <label className="text-xs text-nexus-cyan font-bold uppercase mb-1 block">Endpoint Path</label>
                <input 
                    list="chat-endpoints" 
                    value={endpoint} 
                    onChange={(e) => setEndpoint(e.target.value)} 
                    className="w-full bg-nexus-900 border border-nexus-700 rounded p-2 text-sm text-white focus:border-nexus-accent focus:outline-none"
                    placeholder="/v1/chat/completions"
                />
                <datalist id="chat-endpoints">
                    {ENDPOINT_PRESETS.CHAT.map(e => <option key={e} value={e} />)}
                </datalist>
            </div>
            <div>
                <label className="text-xs text-nexus-cyan font-bold uppercase mb-1 block flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Custom Base URL (Optional)
                </label>
                <input 
                    type="text"
                    value={customBaseUrl} 
                    onChange={(e) => setCustomBaseUrl(e.target.value)} 
                    className="w-full bg-nexus-900 border border-nexus-700 rounded p-2 text-sm text-white focus:border-nexus-accent focus:outline-none placeholder-gray-600"
                    placeholder="Overrides global settings"
                />
            </div>
            <div>
                <label className="text-xs text-nexus-cyan font-bold uppercase mb-1 block flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    Custom API Key (Optional)
                </label>
                <input 
                    type="password"
                    value={customApiKey} 
                    onChange={(e) => setCustomApiKey(e.target.value)} 
                    className="w-full bg-nexus-900 border border-nexus-700 rounded p-2 text-sm text-white focus:border-nexus-accent focus:outline-none placeholder-gray-600"
                    placeholder="Overrides global key"
                />
            </div>
         </div>
      </div>

      {/* Header */}
      <div className="p-4 border-b border-nexus-800 bg-nexus-950/50 backdrop-blur flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-2">
           <h3 className="text-lg font-semibold text-white flex items-center gap-2 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                API Tester (Chat)
            </h3>
            <button 
                onClick={() => setShowConfig(!showConfig)}
                className={`ml-3 p-1.5 rounded-lg border transition-all flex items-center gap-2 text-xs font-mono ${showConfig ? 'bg-nexus-accent border-nexus-accent text-white' : 'border-nexus-700 text-gray-400 hover:text-white'}`}
            >
                <Settings2 className="w-3 h-3" />
                {model}
            </button>
        </div>

        <button 
            onClick={() => setMessages([])} 
            className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-nexus-800"
        >
            <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-nexus-700 opacity-50">
                <Bot className="w-16 h-16 mb-4" />
                <p>Config: {model} @ {endpoint}</p>
                {customBaseUrl && <p className="text-xs text-nexus-accent mt-1">Using Custom Proxy</p>}
                {customApiKey && <p className="text-xs text-green-500 mt-1">Using Custom Key</p>}
            </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 border ${
                msg.role === 'user'
                  ? 'bg-nexus-accent/10 border-nexus-accent/20 text-white rounded-tr-sm'
                  : msg.role === 'system' 
                  ? 'bg-red-900/20 border-red-500/30 text-red-200 w-full'
                  : 'bg-nexus-800/50 border-nexus-700 text-gray-200 rounded-tl-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 opacity-50 text-xs uppercase tracking-wider font-bold">
                {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                {msg.role}
              </div>
              <div className="prose prose-invert prose-sm max-w-none break-words">
                 {renderContent(msg.content)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-nexus-800 bg-nexus-950 z-30 relative">
        {selectedImage && (
            <div className="relative inline-block mb-3 ml-1 group">
                <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg border border-nexus-700 shadow-md" />
                <button 
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        )}
        
        <div className="relative flex items-center gap-2">
          <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-nexus-cyan hover:bg-nexus-900 rounded-xl transition-colors"
            disabled={isTyping}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type message..."
            disabled={isTyping}
            className="flex-1 bg-nexus-900 border border-nexus-800 text-white rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-nexus-cyan focus:ring-1 focus:ring-nexus-cyan transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isTyping}
            className="absolute right-2 p-2 bg-nexus-800 text-nexus-cyan rounded-lg hover:bg-nexus-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
             {isTyping ? <StopCircle className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatMode;