import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Settings } from '../types';
import { DEFAULT_BASE_URL, LOCAL_STORAGE_KEY_API_KEY, LOCAL_STORAGE_KEY_BASE_URL } from '../constants';

interface SettingsContextType {
  settings: Settings;
  isConfigured: boolean;
  updateSettings: (apiKey: string, baseUrl: string) => void;
  clearSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper to sanitize the Base URL
const sanitizeBaseUrl = (url: string): string => {
  let cleaned = url.trim().replace(/\/+$/, ""); // Remove trailing slashes

  // Remove common endpoint suffixes that users might accidentally paste
  const suffixesToRemove = [
    "/v1/chat/completions",
    "/chat/completions",
    "/v1/images/generations",
    "/images/generations",
    "/v1" // We append /v1 in the service layer, so remove it from base to prevent duplication
  ];

  for (const suffix of suffixesToRemove) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.substring(0, cleaned.length - suffix.length);
      // Remove trailing slash again if left behind
      cleaned = cleaned.replace(/\/+$/, "");
    }
  }

  return cleaned || DEFAULT_BASE_URL;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    baseUrl: DEFAULT_BASE_URL,
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedApiKey = localStorage.getItem(LOCAL_STORAGE_KEY_API_KEY);
    let storedBaseUrl = localStorage.getItem(LOCAL_STORAGE_KEY_BASE_URL);

    if (storedApiKey) {
      // Sanitize stored URL on load to fix existing bad configurations
      const cleanUrl = storedBaseUrl ? sanitizeBaseUrl(storedBaseUrl) : DEFAULT_BASE_URL;
      
      setSettings({
        apiKey: storedApiKey,
        baseUrl: cleanUrl,
      });
      setIsConfigured(true);
    }
    setLoading(false);
  }, []);

  const updateSettings = (apiKey: string, baseUrl: string) => {
    const cleanUrl = sanitizeBaseUrl(baseUrl);
    localStorage.setItem(LOCAL_STORAGE_KEY_API_KEY, apiKey);
    localStorage.setItem(LOCAL_STORAGE_KEY_BASE_URL, cleanUrl);
    setSettings({ apiKey, baseUrl: cleanUrl });
    setIsConfigured(true);
  };

  const clearSettings = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_API_KEY);
    localStorage.removeItem(LOCAL_STORAGE_KEY_BASE_URL);
    setSettings({ apiKey: '', baseUrl: DEFAULT_BASE_URL });
    setIsConfigured(false);
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-nexus-950 flex items-center justify-center text-nexus-accent animate-pulse">
            Nexus Core 初始化中...
        </div>
    )
  }

  return (
    <SettingsContext.Provider value={{ settings, isConfigured, updateSettings, clearSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};