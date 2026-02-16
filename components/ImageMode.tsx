import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, Download, XCircle, Globe, UploadCloud, X, Key, Trash2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { generateImage } from '../services/ai';
import { IMAGE_MODELS, IMAGE_SIZES, ENDPOINT_PRESETS } from '../constants';

const STORAGE_KEY_CUSTOM_MODELS = 'nexus_custom_models_image';

const ImageMode: React.FC = () => {
  const { settings } = useSettings();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // God Mode inputs
  const [model, setModel] = useState(IMAGE_MODELS[0].value);
  const [endpoint, setEndpoint] = useState(ENDPOINT_PRESETS.IMAGE[0]);
  const [selectedSize, setSelectedSize] = useState(IMAGE_SIZES[0].value);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');

  // Smart Model Memory
  const [customModels, setCustomModels] = useState<string[]>([]);

  // Source Image State
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
    const isDefault = IMAGE_MODELS.some(m => m.value === newModel);
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
    setImageUrl(null);

    // Save model to memory
    saveModelToMemory(model);

    try {
      const url = await generateImage(prompt, settings, model, selectedSize, endpoint, customBaseUrl, customApiKey, sourceImage);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation Failed');
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
      
      {/* Input Section */}
      <div className="bg-nexus-900/50 p-6 rounded-2xl border border-nexus-800 shadow-lg">
        
        {/* God Mode Config Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            
            {/* Model Input */}
            <div className="lg:col-span-1">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-nexus-cyan uppercase">Model ID</label>
                    {customModels.length > 0 && (
                        <button onClick={clearCustomModels} className="text-[10px] text-red-400 hover:text-red-300">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <input 
                    list="image-models" 
                    value={model} 
                    onChange={(e) => setModel(e.target.value)} 
                    className="w-full bg-nexus-950 border border-nexus-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nexus-cyan"
                    placeholder="e.g. dall-e-3"
                />
                <datalist id="image-models">
                    {IMAGE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    {customModels.map(m => <option key={m} value={m}>Custom: {m}</option>)}
                </datalist>
            </div>

             {/* Endpoint Input */}
             <div className="lg:col-span-1">
                <label className="block text-xs font-bold text-nexus-cyan uppercase mb-1">Endpoint Path</label>
                <input 
                    list="image-endpoints" 
                    value={endpoint} 
                    onChange={(e) => setEndpoint(e.target.value)} 
                    className="w-full bg-nexus-950 border border-nexus-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nexus-cyan"
                    placeholder="/v1/images/generations"
                />
                <datalist id="image-endpoints">
                    {ENDPOINT_PRESETS.IMAGE.map(e => <option key={e} value={e} />)}
                </datalist>
            </div>

            {/* Custom URL */}
            <div className="lg:col-span-1">
                <label className="block text-xs font-bold text-nexus-cyan uppercase mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Custom Host
                </label>
                <input 
                    type="text"
                    value={customBaseUrl} 
                    onChange={(e) => setCustomBaseUrl(e.target.value)} 
                    className="w-full bg-nexus-950 border border-nexus-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nexus-cyan placeholder-gray-600"
                    placeholder="Optional override"
                />
            </div>
            
             {/* Custom Key */}
             <div className="lg:col-span-1">
                <label className="block text-xs font-bold text-nexus-cyan uppercase mb-1 flex items-center gap-1">
                    <Key className="w-3 h-3" /> Custom Key
                </label>
                <input 
                    type="password"
                    value={customApiKey} 
                    onChange={(e) => setCustomApiKey(e.target.value)} 
                    className="w-full bg-nexus-950 border border-nexus-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nexus-cyan placeholder-gray-600"
                    placeholder="Optional override"
                />
            </div>

            {/* Size Selector */}
            <div className="lg:col-span-1">
                <label className="block text-xs font-bold text-nexus-cyan uppercase mb-1">Size</label>
                <select 
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full bg-nexus-950 border border-nexus-800 text-sm text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-nexus-cyan"
                >
                    {IMAGE_SIZES.map(size => (
                        <option key={size.value} value={size.value}>{size.label}</option>
                    ))}
                </select>
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
                <div className="relative w-full h-24 bg-nexus-950/50 border border-nexus-700 border-dashed rounded-xl flex items-center p-2 gap-4">
                     <img src={sourceImage} alt="Ref" className="h-20 w-auto rounded-lg border border-nexus-600" />
                     <div className="flex-1">
                        <p className="text-sm text-white font-medium">Reference Image Loaded</p>
                        <p className="text-xs text-gray-400">Used for Img2Img or Vision prompts.</p>
                     </div>
                     <button 
                        onClick={() => setSourceImage(null)}
                        className="p-2 bg-nexus-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                     >
                        <X className="w-5 h-5" />
                     </button>
                </div>
            ) : (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-16 border border-nexus-800 border-dashed rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:text-nexus-cyan hover:border-nexus-cyan/50 hover:bg-nexus-900/30 transition-all cursor-pointer"
                >
                    <UploadCloud className="w-5 h-5" />
                    <span className="text-sm">Drag reference image here or click to upload (Optional)</span>
                </div>
            )}
        </div>

        <div className="flex gap-4">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your image..."
                className="flex-1 bg-nexus-950 border border-nexus-800 text-white rounded-xl p-4 focus:outline-none focus:border-nexus-cyan focus:ring-1 focus:ring-nexus-cyan transition-all resize-none h-24"
            />
            <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-32 bg-gradient-to-br from-nexus-accent to-blue-600 hover:from-nexus-accentHover hover:to-blue-700 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
            >
                {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <>
                        <Sparkles className="w-6 h-6" />
                        <span>Generate</span>
                    </>
                )}
            </button>
        </div>
      </div>

      {/* Result Section */}
      <div className="flex-1 bg-nexus-900/30 rounded-2xl border border-nexus-800 border-dashed flex items-center justify-center relative overflow-hidden min-h-[400px]">
        {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10 backdrop-blur-sm">
                <div className="w-16 h-16 border-4 border-nexus-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-nexus-cyan font-mono animate-pulse">Constructing Visual Data...</p>
            </div>
        )}

        {error && (
             <div className="text-center p-8 max-w-md">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl text-white font-bold mb-2">Generation Failed</h3>
                <p className="text-red-300 break-words font-mono text-xs">{error}</p>
             </div>
        )}

        {!loading && !imageUrl && !error && (
            <div className="text-center text-nexus-700">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Enter prompt to generate.</p>
            </div>
        )}

        {imageUrl && (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                <img 
                    src={imageUrl} 
                    alt="Generated"
                    referrerPolicy="no-referrer"
                    className="max-h-[60vh] rounded-lg shadow-2xl border border-nexus-700"
                />
                <div className="mt-4 flex gap-4">
                     <a 
                        href={imageUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-nexus-800 hover:bg-nexus-700 text-white rounded-lg transition-colors border border-nexus-700"
                     >
                        <Download className="w-4 h-4" />
                        Open Original
                     </a>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageMode;