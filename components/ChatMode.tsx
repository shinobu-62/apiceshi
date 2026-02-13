import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, StopCircle, Paperclip, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ChatMessage, ChatContentPart } from '../types';
import { streamChatCompletion } from '../services/ai';
import { CHAT_MODELS } from '../constants';
import ReactMarkdown from 'react-markdown';

const ChatMode: React.FC = () => {
  const { settings } = useSettings();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState(CHAT_MODELS[0].value);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isTyping) return;

    // Construct content
    let content: string | ChatContentPart[] = input;
    if (selectedImage) {
      content = [
        { type: 'text', text: input || ' ' }, // Text is required usually with vision
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
    const currentImage = selectedImage; // Store ref for potential cleanup logic if needed
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
        selectedModel,
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
            content: `错误: ${error instanceof Error ? error.message : '发生未知错误。'}`,
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
    <div className="flex flex-col h-full bg-nexus-900/50 rounded-2xl border border-nexus-800 overflow-hidden shadow-inner">
      {/* Header */}
      <div className="p-4 border-b border-nexus-800 bg-nexus-950/50 backdrop-blur flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
           <h3 className="text-lg font-semibold text-white flex items-center gap-2 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                实时对话
            </h3>
            {/* Model Selector */}
            <div className="ml-4 relative">
                <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-nexus-900 border border-nexus-800 text-xs text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-nexus-accent focus:ring-1 focus:ring-nexus-accent appearance-none cursor-pointer hover:bg-nexus-800 transition-colors pr-8"
                >
                    {CHAT_MODELS.map(model => (
                        <option key={model.value} value={model.value}>{model.label}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>

        <button 
            onClick={() => setMessages([])} 
            className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-nexus-800"
            title="清空对话"
        >
            <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-nexus-700 opacity-50">
                <Bot className="w-16 h-16 mb-4" />
                <p>系统在线。等待输入。</p>
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
              <div className="prose prose-invert prose-sm max-w-none">
                 {renderContent(msg.content)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-nexus-800 bg-nexus-950">
        {/* Image Preview */}
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
          {/* File Input */}
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
            title="上传图片"
            disabled={isTyping}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
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
