import { Settings, ChatMessage } from '../types';
import { MODELS } from '../constants';

// Helper to construct full URL
const constructUrl = (globalBaseUrl: string, endpointPath: string, customBaseUrl?: string): string => {
  const cleanPath = endpointPath.trim();
  
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

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

  const isChatEndpoint = endpointPath.includes('chat/completions');

  try {
    let payload: any = {};
    
    if (isChatEndpoint) {
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
      payload = {
        model: selectedModel,
        prompt: prompt,
        n: 1,
        size: selectedSize
      };

      if (imageBase64) {
        payload.image = imageBase64; 
        payload.image_url = imageBase64; 
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

    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}...`);
    }

    if (isChatEndpoint) {
      const content = data.choices?.[0]?.message?.content || "";

      const markdownMatch = content.match(/!\[.*?\]\(((?:https?:\/\/|data:image\/)[^\)]+)\)/);
      if (markdownMatch && markdownMatch[1]) return markdownMatch[1];

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

// 终极加固版：视频生成与无脑死等轮询逻辑
export const generateVideo = async (
  prompt: string,
  settings: Settings,
  model: string,
  endpointPath: string,
  customBaseUrl: string,
  customApiKey: string | undefined,
  imageBase64?: string | null,
  customPollingPath?: string
): Promise<string> => {
  const url = constructUrl(settings.baseUrl, endpointPath, customBaseUrl);
  const apiKey = customApiKey?.trim() || settings.apiKey;
  
  try {
      let payload: any = {
          model: model || MODELS.VIDEO_DEFAULT,
          prompt: prompt
      };
      
      if (endpointPath.includes("/create")) {
          payload.images = imageBase64 ? [imageBase64] : [];
          payload.enhance_prompt = true;
          payload.aspect_ratio = "16:9";
          payload.enable_upsample = true;
      } else if (imageBase64) {
          payload.image_url = imageBase64;
      }

      console.log(`[Video] 发起视频生成任务 -> ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      if (!response.ok) throw new Error(`请求被拒绝 [${response.status}]: ${text.slice(0, 150)}`);
      
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`返回数据异常: ${text.slice(0, 150)}`); }

      const directUrl = data.video_url || data.url || data.data?.[0]?.url;
      if (directUrl) return directUrl;

      const taskId = data.id || data.task_id || data.data?.id;
      if (!taskId) {
          throw new Error("没拿到任务 ID，接口返回内容: " + JSON.stringify(data));
      }

      console.log(`[Video] 任务创建成功! ID: ${taskId}. 开始轮询...`);
      
      const base = customBaseUrl || settings.baseUrl;
      const safeBase = base.replace(/\/$/, "");
      let safePollPath = (customPollingPath && customPollingPath.trim().length > 0) ? customPollingPath.trim() : "/v1/video/query";
      if (!safePollPath.startsWith("/")) safePollPath = "/" + safePollPath;
      
      const pollUrl = safePollPath.includes("?") 
        ? `${safeBase}${safePollPath}&id=${taskId}` 
        : `${safeBase}${safePollPath}?id=${taskId}`;

      // 无脑轮询：最多查 120 次（每 5 秒一次，总计 10 分钟）
      for (let i = 0; i < 120; i++) {
          await new Promise(res => setTimeout(res, 5000));
          
          try {
              const pollRes = await fetch(pollUrl, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }
              });
              
              if (!pollRes.ok) continue; 
              
              const pollText = await pollRes.text();
              let pollData;
              try { pollData = JSON.parse(pollText); } catch { continue; }
              
              const status = (pollData.status || pollData.task_status || pollData.data?.status || "").toLowerCase();
              console.log(`[Video] 轮询第 ${i+1} 次，当前状态: ${status}`);
              
              if (status === "success" || status === "completed" || status === "succeeded") {
                  const finalUrl = pollData.video_url || pollData.url || pollData.data?.video_url || pollData.data?.[0]?.url;
                  if (finalUrl) return finalUrl;
                  throw new Error("老板说视频做好了，但没给播放链接: " + JSON.stringify(pollData));
              }
              
              if (status === "failed" || status === "error") {
                  throw new Error(`生成失败: ${pollData.error?.message || JSON.stringify(pollData)}`);
              }
              
          } catch (e) {
              console.warn("查询请求异常，将在5秒后重试...");
          }
      }
      
      throw new Error("视频生成超过 10 分钟，可能已经超时！");
      
  } catch (error) {
      console.error("Video Generation Error:", error);
      throw error;
  }
};