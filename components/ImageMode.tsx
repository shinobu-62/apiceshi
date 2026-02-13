import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Download, XCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { generateImage } from '../services/ai';
import { IMAGE_MODELS, IMAGE_SIZES } from '../constants';

const ImageMode: React.FC = () => {
  const { settings } = useSettings();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0].value);
  const [selectedSize, setSelectedSize] = useState(IMAGE_SIZES[0].value);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const url = await generateImage(prompt, settings, selectedModel, selectedSize);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-6">
      
      {/* Input Section */}
      <div className="bg-nexus-900/50 p-6 rounded-2xl border border-nexus-800 shadow-lg">
        <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-nexus-cyan uppercase tracking-wide">
                图像提示词
            </label>
            <div className="flex gap-3">
                {/* Size Selector */}
                <div className="relative">
                    <select 
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="bg-nexus-950 border border-nexus-800 text-xs text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-nexus-cyan focus:ring-1 focus:ring-nexus-cyan appearance-none cursor-pointer hover:bg-nexus-900 transition-colors pr-8"
                    >
                        {IMAGE_SIZES.map(size => (
                            <option key={size.value} value={size.value}>{size.label}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>

                {/* Model Selector */}
                <div className="relative">
                    <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-nexus-950 border border-nexus-800 text-xs text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-nexus-cyan focus:ring-1 focus:ring-nexus-cyan appearance-none cursor-pointer hover:bg-nexus-900 transition-colors pr-8"
                    >
                        {IMAGE_MODELS.map(model => (
                            <option key={model.value} value={model.value}>{model.label}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="flex gap-4">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="赛博朋克风格的雨夜街道..."
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
                        <span>生成</span>
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
                <p className="text-nexus-cyan font-mono animate-pulse">正在构建视觉数据...</p>
            </div>
        )}

        {error && (
             <div className="text-center p-8 max-w-md">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl text-white font-bold mb-2">生成失败</h3>
                <p className="text-red-300">{error}</p>
             </div>
        )}

        {!loading && !imageUrl && !error && (
            <div className="text-center text-nexus-700">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>输入提示词以生成图像。</p>
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
                        打开原图
                     </a>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageMode;