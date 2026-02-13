export interface Settings {
  apiKey: string;
  baseUrl: string;
}

export enum AppMode {
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export type ChatContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' } };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | ChatContentPart[];
  timestamp: number;
}

export interface GenerationResult {
  url?: string;
  revised_prompt?: string;
  error?: string;
}
