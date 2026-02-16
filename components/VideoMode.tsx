import React, { useState, useRef, useEffect } from 'react';
import { Video, Film, AlertTriangle, Download, Globe, UploadCloud, X, Key, Trash2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { generateVideo } from '../services/ai';
import { VIDEO_MODELS, ENDPOINT_PRESETS } from '../constants';

const STORAGE_KEY_CUSTOM_MODELS = 'nexus_custom_models_video';

const VideoMode: React.FC = () => {
  const { settings } = useSettings();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // God Mode Inputs
  const [model, setModel] = useState(VIDEO_MODELS[0].value);
  const [endpoint, setEndpoint] = useState(ENDPOINT_PRESETS.VIDEO[0]);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');

  // Smart Model Memory
  const [customModels, setCustomModels] = useState<string[]>([]);

  // Source Image for Image-to-Video
  const [sourceImage, setSourceImage] = useState<string | null>(null);
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
    const isDefault = VIDEO_MODELS.some(m => m.value === newModel);
    if (isDefault) return;

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

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setVideoUrl(null);

    // Save model to memory
    saveModelToMemory(model);

    try {
      const url = await generateVideo(prompt, settings, model, endpoint, customBaseUrl, customApiKey, sourceImage);
      setVideoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video Generation Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setSourceImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-6">
        {/* Info Banner */}
        <div className="bg-pink-900/10 border border-pink-500/30 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
            <p className="text-sm text-pink-200/80">
                <strong>Video Rendering:</strong> This process can take several minutes.
            </p>
        </div>

      {/* Input Section */}
      <div className="bg-nexus-900/50 p-6 rounded-2xl border border-nexus-800 shadow-lg">
        
        {/* God Mode Config */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
             {/* Model Input */}
             <div className="lg:col-span-1">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-pink-500 uppercase">Model ID</label>
                    {customModels.length > 0 && (
                        <button onClick={clearCustomModels} className="text-[10px] text-red-400 hover:text-red-300">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <input 
                    list="video-models" 
                    value={model} 
                    onChange={(e) => setModel(e.target.value)} 
                    className="w-full bg-nexus-950 border border-nexus-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500"
                    placeholder="e.g. video-001"
                />
                <datalist id="video-models">
                    {VIDEO_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    {customModels.map(m => <option key={m} value={m}>Custom: {m}</option>)}
                </datalist>
            </div>

            {/* Endpoint Input */}
            <div className="lg:col-span-1">
                <label className="block text-xs font-bold text-pink-500 uppercase mb-1">Endpoint Path</label>
                <input 
                    list="video-endpoints" 
                    value={endpoint} 
                    onChange={(e) => setEndpoint(e.target.value)} 
                    className="w-full bg-nexus-950 border border-nexus-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500"
                    placeholder="/v1/videos"
                />
                <datalist id="video-endpoints">
                    {ENDPOINT_PRESETS.VIDEO.map(e => <option key={e} value={e} />)}
                </datalist>
            </div>

            {/* Custom URL */}
            <div className="lg:col-span-1">
                <label className="block text-xs font-bold text-pink-500 uppercase mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Custom Host
                </label>
                <input 
                    type="text"
                    value={customBaseUrl} 
                    onChange={(e) => setCustomBaseUrl(e.target.value)} 
                    className="w-full bg-nexus-950 border border-nexus-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 placeholder-gray-600"
                    placeholder="Optional override"
                />
            </div>
            
             {/* Custom Key */}
            <div className="lg:col-span-1">
                <label className="block text-xs font-bold text-pink-500 uppercase mb-1 flex items-center gap-1">
                    <Key className="w-3 h-3" /> Custom Key
                </label>
                <input 
                    type="password"
                    value={customApiKey} 
                    onChange={(e) => setCustomApiKey(e.target.value)} 
                    className="w-full bg-nexus-950 border border-nexus-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 placeholder-gray-600"
                    placeholder="Optional override"
                />
            </div>
        </div>

        {/* Reference Image Drag & Drop */}
        <div 
            className="mb-4 relative group"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*" 
            />
            {sourceImage ? (
                <div className="relative w-full h-24 bg-nexus-950/50 border border-pink-500/30 border-dashed rounded-xl flex items-center p-2 gap-4">
                     <img src={sourceImage} alt="Ref" className="h-20 w-auto rounded-lg border border-pink-500/50" />
                     <div className="flex-1">
                        <p className="text-sm text-white font-medium">Image-to-Video Mode</p>
                        <p className="text-xs text-gray-400">Image will be sent as 'image_url' to the model.</p>
                     </div>
                     <button 
                        onClick={() => setSourceImage(null)}
                        className="p-2 bg-nexus-800 hover:bg-pink-900/50 text-gray-400 hover:text-pink-400 rounded-lg transition-colors"
                     >
                        <X className="w-5 h-5" />
                     </button>
                </div>
            ) : (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-16 border border-nexus-800 border-dashed rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:text-pink-500 hover:border-pink-500/50 hover:bg-pink-900/10 transition-all cursor-pointer"
                >
                    <UploadCloud className="w-5 h-5" />
                    <span className="text-sm">Drag image here for Image-to-Video (Optional)</span>
                </div>
            )}
        </div>

        <div className="flex gap-4">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Drone shot of a neon cyberpunk city..."
                className="flex-1 bg-nexus-950 border border-nexus-800 text-white rounded-xl p-4 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all resize-none h-24"
            />
            <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-32 bg-gradient-to-br from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-pink-900/20"
            >
                {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <>
                        <Film className="w-6 h-6" />
                        <span>Render</span>
                    </>
                )}
            </button>
        </div>
      </div>

      {/* Result Section */}
      <div className="flex-1 bg-nexus-900/30 rounded-2xl border border-nexus-800 border-dashed flex items-center justify-center relative overflow-hidden min-h-[400px]">
        {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 backdrop-blur-sm">
                 <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-pink-500 font-mono animate-pulse font-bold text-lg">Rendering Video...</p>
                <p className="text-gray-400 text-sm mt-2">Do not close the tab.</p>
            </div>
        )}

        {error && (
             <div className="text-center p-8 max-w-md">
                <p className="text-red-400 mb-2 font-bold text-xl">Render Failed</p>
                <p className="text-red-300 text-sm bg-red-900/20 p-4 rounded-lg border border-red-500/20 break-words">{error}</p>
             </div>
        )}

        {!loading && !videoUrl && !error && (
            <div className="text-center text-nexus-700">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Enter prompt to start.</p>
            </div>
        )}

        {videoUrl && (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                <video 
                    src={videoUrl} 
                    controls
                    autoPlay
                    loop
                    className="max-h-[60vh] rounded-lg shadow-2xl border border-nexus-700"
                />
                <div className="mt-4 flex gap-4">
                     <a 
                        href={videoUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-nexus-800 hover:bg-nexus-700 text-white rounded-lg transition-colors border border-nexus-700"
                     >
                        <Download className="w-4 h-4" />
                        Download MP4
                     </a>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default VideoMode;