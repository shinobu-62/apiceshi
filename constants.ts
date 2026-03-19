export const DEFAULT_BASE_URL = "https://api.openai.com";
export const LOCAL_STORAGE_KEY_API_KEY = "nexus_ai_api_key";
export const LOCAL_STORAGE_KEY_BASE_URL = "nexus_ai_base_url";

export const CHAT_MODELS = [
  { label: "Gemini 3 Pro", value: "gemini-3-pro-preview" },
  { label: "Gemini 3 Flash", value: "gemini-3-flash-preview" },
  { label: "Gemini 3 Flash Max", value: "gemini-3-flash-preview-maxthinking" }
];

export const IMAGE_MODELS = [
  { label: "Nano Banana", value: "gemini-2.5-flash-image-preview" },
  { label: "Nano Banana Pro", value: "gemini-3-pro-image-preview" },
  { label: "GPT Image 1", value: "gpt-image-1-all" },
  { label: "GPT Image 1.5", value: "gpt-image-1.5" },
  { label: "DALL-E 3", value: "dall-e-3" }
];

export const IMAGE_SIZES = [
  { label: "1k 方形 (1024x1024)", value: "1024x1024" },
  { label: "2k 宽屏 (1792x1024)", value: "1792x1024" },
  { label: "2k 竖屏 (1024x1792)", value: "1024x1792" }
];

export const VIDEO_MODELS = [
  { label: "Google Veo (Fast)", value: "veo3.1-fast-components" },
  { label: "Runway Gen-3", value: "runway-gen3-alpha" },
  { label: "Sora", value: "sora-1.0-turbo" },
  { label: "Kling", value: "kling-v1" }
];

export const ENDPOINT_PRESETS = {
  CHAT: [
    "/v1/chat/completions",
    "/chat/completions"
  ],
  IMAGE: [
    "/v1/images/generations",
    "/v1/chat/completions", // For Gemini/Nano image generation via chat
    "/images/generations"
  ],
  VIDEO: [
    "/v1/video/create",
    "/v1/videos",
    "/v1/video/generations",
    "/openai-video",
    "/v1/luma/generations"
  ]
};

export const MODELS = {
  CHAT_DEFAULT: CHAT_MODELS[0].value,
  IMAGE_DEFAULT: IMAGE_MODELS[0].value,
  IMAGE_SIZE_DEFAULT: IMAGE_SIZES[0].value,
  VIDEO_DEFAULT: VIDEO_MODELS[0].value
};