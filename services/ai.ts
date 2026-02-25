import { Settings, ChatMessage } from '../types';
import { MODELS } from '../constants';

// Helper to construct full URL
const constructUrl = (globalBaseUrl: string, endpointPath: string, customBaseUrl?: string): string => {
  const cleanPath = endpointPath.trim();
  
  // 1. If the endpoint path is already a full URL, use it directly
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

  // 2. Determine which Base URL to use (Custom overrides Global)
  let baseUrlToUse = globalBaseUrl;
  if (customBaseUrl && customBaseUrl.trim().length > 0) {
    baseUrlToUse = customBaseUrl.trim();
  }

  const cleanBase = baseUrlToUse.replace(/\/+$/, '');
  const cleanEndpoint = cleanPath.replace(/^\/+/, '');
  return `${cleanBase}/${cleanEndpoint}`;
};

export const streamChatCompletion = async (
  messages: ChatMessage[],
  settings: Settings,
  model: string,
  endpointPath: string,
  customBaseUrl: string,
  customApiKey: string | undefined,
  onChunk: (chunk: string) => void
): Promise<void> => {
  const url = constructUrl(settings.baseUrl, endpointPath, customBaseUrl);
  // Use custom API key if provided, otherwise fallback to global settings
  const apiKey = customApiKey?.trim() || settings.apiKey;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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

    if (!response.body) throw new Error("Incompatible browser: ReadableStream not supported.");

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
            // Ignore parse errors for partial chunks
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
  size: string,
  endpointPath: string,
  customBaseUrl: string,
  customApiKey: string | undefined,
  imageBase64?: string | null
): Promise<string> => {
  const url = constructUrl(settings.baseUrl, endpointPath, customBaseUrl);
  const apiKey = customApiKey?.trim() || settings.apiKey;
  const selectedModel = model || MODELS.IMAGE_DEFAULT;
  const selectedSize = size || "1024x1024";

  // LOGIC: If endpoint contains "chat/completions", treat as Chat-to-Image (Gemini style / Vision)
  const isChatEndpoint = endpointPath.includes('chat/completions');

  try {
    let payload: any = {};
    
    if (isChatEndpoint) {
      // Construct Chat Payload (Supports Vision if image provided)
      let messagesContent: any[] = [{ type: 'text', text: prompt }];
      
      if (imageBase64) {
        messagesContent.push({
          type: 'image_url',
          image_url: { url: imageBase64 }
        });
      }

      payload = {
        model: selectedModel,
        messages: [{ role: 'user', content: messagesContent }],
        stream: false
      };
    } else {
      // Construct Standard Image Payload
      payload = {
        model: selectedModel,
        prompt: prompt,
        n: 1,
        size: selectedSize
      };

      // If an image is provided to a standard endpoint, inject it.
      // Many proxy APIs (like some SD wrappers) accept 'image' or 'init_image'.
      if (imageBase64) {
        payload.image = imageBase64; // Common field for img2img
        payload.image_url = imageBase64; // Alternative common field
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `API Error: ${response.statusText}`;
      try {
        const json = JSON.parse(text);
        errorMsg = json.error?.message || errorMsg;
      } catch {
        errorMsg += ` - ${text.slice(0, 100)}`;
      }
      throw new Error(errorMsg);
    }

    // Safe JSON Parsing
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}...`);
    }

    if (isChatEndpoint) {
      // Extract from Chat Response (Markdown or URL in content)
      const content = data.choices?.[0]?.message?.content || "";
      console.log("Raw Chat-Image Response:", content);

      // 1. Markdown
      const markdownMatch = content.match(/!\[.*?\]\(((?:https?:\/\/|data:image\/)[^\)]+)\)/);
      if (markdownMatch && markdownMatch[1]) return markdownMatch[1];

      // 2. Raw URL
      const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch && urlMatch[1]) {
        let cleanUrl = urlMatch[1];
        const trailingChars = [')', ']', '.', ',', '"', "'"];
        while (trailingChars.includes(cleanUrl.slice(-1))) {
            cleanUrl = cleanUrl.slice(0, -1);
        }
        return cleanUrl;
      }
      
      if (content.trim().startsWith('http')) return content.trim();

      const debugContent = content.length > 500 ? content.substring(0, 500) + "..." : content;
      throw new Error(`Failed to extract URL from chat response: ${debugContent}`);

    } else {
      // Extract from Standard Image Response
      if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
        throw new Error(`Unexpected response format: ${JSON.stringify(data)}`);
      }

      const item = data.data[0];
      if (item.url) return item.url;
      if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;

      throw new Error(`Response missing url or b64_json: ${JSON.stringify(data)}`);
    }

  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

export const generateVideo = async (
  prompt: string,
  settings: Settings,
  model: string,
  endpointPath: string,
  customBaseUrl: string,
  customApiKey: string | undefined,
  imageBase64?: string | null
): Promise<string> => {
  const url = constructUrl(settings.baseUrl, endpointPath, customBaseUrl);
  const apiKey = customApiKey?.trim() || settings.apiKey;
  
  try {
    const payload: any = {
      model: model || MODELS.VIDEO_DEFAULT,
      prompt: prompt
    };

    // Inject Image for Image-to-Video
    if (imageBase64) {
      payload.image_url = imageBase64;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const status = response.status;
        let errorBody = "";
        try {
            const text = await response.text();
            try {
                // Try to pretty print JSON error
                const json = JSON.parse(text);
                errorBody = json.error?.message || JSON.stringify(json);
            } catch {
                // Fallback to raw text (could be HTML)
                errorBody = text;
            }
        } catch {
            errorBody = "No response body";
        }
        throw new Error(`Video Gen Failed [${status}]: ${errorBody.slice(0, 200)}`);
    }

    // Safe JSON Parsing to catch HTML responses (Standard 404/500 pages hiding behind 200 OK)
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(`Invalid JSON response (likely HTML): ${text.slice(0, 200)}...`);
    }

    // Strict Validation: Check for URL in standard location
    // Typically data.data[0].url
    const videoUrl = data.data?.[0]?.url;

    if (videoUrl && typeof videoUrl === 'string' && videoUrl.length > 0) {
        return videoUrl;
    }

    // --- ASYNC POLLING LOGIC ---
    // Check if we received a Task ID instead of a URL
    const taskId = data.id || data.task_id || data.data?.id || data.data?.task_id;
    let currentStatus = data.status || data.task_status || data.data?.status;

    if (taskId && (currentStatus === 'pending' || currentStatus === 'processing' || currentStatus === 'queued')) {
        console.log(`Video Generation initiated (Async). Task ID: ${taskId}, Status: ${currentStatus}`);
        
        const maxAttempts = 60; // 10 minutes max (60 * 10s)
        let attempts = 0;

        while ((currentStatus === 'pending' || currentStatus === 'processing' || currentStatus === 'queued') && attempts < maxAttempts) {
            attempts++;
            // Wait 10 seconds
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Construct Polling URL
            // We assume the base URL is correct and append the standard status endpoint
            // If the original endpoint was /v1/video/create, we want /v1/video/status/{id}
            // We use the same base URL logic as the initial request
            const pollingEndpoint = `/v1/video/status/${taskId}`;
            const pollingUrl = constructUrl(settings.baseUrl, pollingEndpoint, customBaseUrl);

            console.log(`Polling attempt ${attempts}/${maxAttempts}: ${pollingUrl}`);

            try {
                const pollResponse = await fetch(pollingUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                });

                if (!pollResponse.ok) {
                    // If polling fails (e.g. 500 or 404), we might want to retry or abort. 
                    // For now, let's log and continue, hoping it's transient, unless it's a 400+ that implies the task is gone.
                    if (pollResponse.status === 404) throw new Error("Task not found during polling.");
                    console.warn(`Polling request failed: ${pollResponse.status}`);
                    continue; 
                }

                const pollText = await pollResponse.text();
                let pollData;
                try {
                    pollData = JSON.parse(pollText);
                } catch {
                    console.warn("Invalid JSON in poll response");
                    continue;
                }

                // Update Status
                // Check various common locations for status
                currentStatus = pollData.status || pollData.task_status || pollData.data?.status || currentStatus;
                
                console.log(`Task Status: ${currentStatus}`);

                if (currentStatus === 'success' || currentStatus === 'succeeded' || currentStatus === 'completed') {
                    // Extract URL
                    const finalUrl = pollData.video_url || pollData.url || pollData.data?.url || pollData.data?.video_url || pollData.data?.[0]?.url;
                    if (finalUrl) return finalUrl;
                    throw new Error("Task completed but no video URL found in response: " + JSON.stringify(pollData));
                }

                if (currentStatus === 'failed' || currentStatus === 'fail') {
                    throw new Error(`Video generation failed: ${pollData.fail_reason || pollData.error || 'Unknown error'}`);
                }

            } catch (pollError) {
                console.error("Polling Error:", pollError);
                throw pollError; // Break loop and fail
            }
        }
        
        if (attempts >= maxAttempts) {
            throw new Error("Video generation timed out after 10 minutes.");
        }
    }

    // If we are here, we got a 200 OK but couldn't find the URL and it wasn't a recognized async task.
    // Throw error with raw JSON to help debug what the provider actually returned.
    throw new Error("API Response (No URL found): " + JSON.stringify(data));
    
  } catch (error) {
    console.error("Video Generation Error:", error);
    throw error;
  }
};