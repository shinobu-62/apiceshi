import { Settings, ChatMessage } from '../types';
import { MODELS } from '../constants';

export const streamChatCompletion = async (
  messages: ChatMessage[],
  settings: Settings,
  model: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  try {
    const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: model || MODELS.CHAT_DEFAULT,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
    }

    if (!response.body) throw new Error("在此浏览器中不支持 ReadableStream。");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value, { stream: !done });
      
      const lines = chunkValue.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          const dataStr = line.replace('data: ', '');
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices[0]?.delta?.content || '';
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            console.warn("Error parsing stream chunk", e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Chat Stream Error:", error);
    throw error;
  }
};

export const generateImage = async (
  prompt: string,
  settings: Settings,
  model: string,
  size: string
): Promise<string> => {
  const selectedModel = model || MODELS.IMAGE_DEFAULT;
  // Use provided size or default to 1024x1024 if somehow missing
  const selectedSize = size || "1024x1024";
  
  // Logic to switch endpoints based on model type
  // Gemini image models (Nano Banana) use the Chat endpoint
  // Standard models (gpt-image-1, gpt-image-1.5, dall-e-3) use the Image endpoint
  const isGeminiChatModel = selectedModel.includes('gemini');

  if (isGeminiChatModel) {
    try {
      const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: prompt }],
          stream: false // We need the full response to extract the URL
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "";
      
      console.log("Raw Model Response (Debug):", content);

      // Extraction Logic:
      // 1. Try Markdown format: ![alt](url) OR ![alt](data:image/...)
      const markdownMatch = content.match(/!\[.*?\]\(((?:https?:\/\/|data:image\/)[^\)]+)\)/);
      
      if (markdownMatch && markdownMatch[1]) {
        return markdownMatch[1];
      }

      // 2. Try raw URL pattern if markdown is missing
      const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch && urlMatch[1]) {
        let cleanUrl = urlMatch[1];
        // Clean trailing punctuation
        const trailingChars = [')', ']', '.', ',', '"', "'"];
        while (trailingChars.includes(cleanUrl.slice(-1))) {
            cleanUrl = cleanUrl.slice(0, -1);
        }
        return cleanUrl;
      }
      
      // 3. If content itself is just a URL
      if (content.trim().startsWith('http')) {
        return content.trim();
      }

      const debugContent = content.length > 500 ? content.substring(0, 500) + "..." : content;
      throw new Error(`无法提取图片 URL。模型响应内容: ${debugContent}`);

    } catch (error) {
      console.error("Gemini Image Generation Error:", error);
      throw error;
    }
  } else {
    // Standard OpenAI / DALL-E endpoint
    // This handles 'gpt-image-1', 'gpt-image-1.5', 'dall-e-3', etc.
    try {
      const response = await fetch(`${settings.baseUrl}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt,
          n: 1,
          size: selectedSize, // Ensure size is passed for standard models
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // STRICT VALIDATION & EXTRACTION
      // Check if data array exists
      if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
        throw new Error(`Response format unexpected (no data array): ${JSON.stringify(data)}`);
      }

      const item = data.data[0];

      // Check 1: Standard URL
      if (item.url) {
        return item.url;
      }

      // Check 2: Base64 JSON (b64_json)
      if (item.b64_json) {
        return `data:image/png;base64,${item.b64_json}`;
      }

      // If we reach here, neither url nor b64_json was found
      throw new Error(`Response format unexpected (missing url or b64_json): ${JSON.stringify(data)}`);

    } catch (error) {
      console.error("Image Generation Error:", error);
      throw error;
    }
  }
};

export const generateVideo = async (
  prompt: string,
  settings: Settings,
  model: string
): Promise<string> => {
  // A. Path Normalization
  // Ensure we don't end up with /v1/v1/videos
  const rawBaseUrl = settings.baseUrl.trim().replace(/\/+$/, ''); // Remove trailing slashes
  let url = '';

  if (rawBaseUrl.endsWith('/v1')) {
    url = `${rawBaseUrl}/videos`;
  } else {
    url = `${rawBaseUrl}/v1/videos`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      // C. Minimal Payload
      body: JSON.stringify({
        model: model || MODELS.VIDEO_DEFAULT,
        prompt: prompt
      }),
    });

    if (!response.ok) {
        // B. Reveal the Error (Debug Mode)
        const status = response.status;
        let errorBody = "";
        
        try {
            // Try parsing JSON error first
            const json = await response.json();
            errorBody = json.error?.message || JSON.stringify(json);
        } catch {
            try {
                // Fallback to text
                errorBody = await response.text();
            } catch {
                errorBody = "No response body";
            }
        }

        throw new Error(`Video Gen Failed [${status}]: ${errorBody.slice(0, 200)}`);
    }

    const data = await response.json();
    return data.data?.[0]?.url || "";
  } catch (error) {
    console.error("Video Generation Error:", error);
    throw error;
  }
};