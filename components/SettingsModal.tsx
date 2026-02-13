import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Key, Globe, Lock, Save } from 'lucide-react';
import { DEFAULT_BASE_URL } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  canClose: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, canClose, onClose }) => {
  const { settings, updateSettings } = useSettings();
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKey(settings.apiKey);
      setBaseUrl(settings.baseUrl);
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('需要 API 密钥才能访问 Nexus。');
      return;
    }
    setError('');
    updateSettings(apiKey.trim(), baseUrl.trim() || DEFAULT_BASE_URL);
    if (canClose) {
      onClose();
    }
  };

  if (!isOpen && canClose) return null;
  if (!isOpen && !canClose) return null; // Should not happen given logic

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-md p-8 bg-nexus-900 border border-nexus-800 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-nexus-cyan via-nexus-accent to-pink-500"></div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-nexus-accent/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Lock className="w-6 h-6 text-nexus-cyan" />
            Nexus 配置
          </h2>
          <p className="text-nexus-700 text-sm mb-6">
            请输入您的凭据以解锁 AI 功能。密钥仅存储在本地浏览器中。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                API 基础地址 (Base URL)
              </label>
              <div className="relative group">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-nexus-cyan transition-colors" />
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com"
                  className="w-full bg-nexus-950 border border-nexus-800 text-white text-sm rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-nexus-cyan focus:ring-1 focus:ring-nexus-cyan transition-all placeholder-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                API 密钥 (API Key)
              </label>
              <div className="relative group">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-nexus-accent transition-colors" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-nexus-950 border border-nexus-800 text-white text-sm rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-nexus-accent focus:ring-1 focus:ring-nexus-accent transition-all placeholder-gray-600"
                />
              </div>
            </div>
            
            {error && (
              <p className="text-red-400 text-xs mt-2 bg-red-400/10 p-2 rounded border border-red-400/20">
                {error}
              </p>
            )}

            <button
              onClick={handleSave}
              className="w-full mt-4 bg-nexus-accent hover:bg-nexus-accentHover text-white font-medium py-3 rounded-lg shadow-lg shadow-nexus-accent/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4" />
              保存并进入 Nexus
            </button>
            
            {canClose && (
               <button 
                 onClick={onClose}
                 className="w-full mt-2 text-gray-500 hover:text-white text-xs py-2 transition-colors"
               >
                 取消
               </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
