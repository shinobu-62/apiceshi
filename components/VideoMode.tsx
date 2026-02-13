import React, { useState } from 'react';
import { Video, Film, AlertTriangle, Download } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { generateVideo } from '../services/ai';
import { VIDEO_MODELS } from '../constants';

const VideoMode: React.FC = () => {
  const { settings } = useSettings();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(VIDEO_MODELS[0].value);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const url = await generateVideo(prompt, settings, selectedModel);
      setVideoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成视频失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-6">
        {/* Info Banner */}
        <div className="bg-pink-900/10 border border-pink-500/30 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
            <p className="text-sm text-pink-200/80">
                <strong>视频生成提示:</strong> 视频渲染可能需要几分钟时间，请耐心等待。
            </p>
        </div>

      {/* Input Section */}
      <div className="bg-nexus-900/50 p-6 rounded-2xl border border-nexus-800 shadow-lg">
        <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-pink-500 uppercase tracking-wide">
                视频提示词
            </label>
            {/* Model Selector */}
            <div className="relative">
                <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-nexus-950 border border-nexus-800 text-xs text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 appearance-none cursor-pointer hover:bg-nexus-900 transition-colors pr-8"
                >
                    {VIDEO_MODELS.map(model => (
                        <option key={model.value} value={model.value}>{model.label}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>

        <div className="flex gap-4">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="无人机拍摄的未来霓虹城市，雨夜，4k分辨率..."
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
                        <span>渲染</span>
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
                <p className="text-pink-500 font-mono animate-pulse font-bold text-lg">正在生成视频...</p>
                <p className="text-gray-400 text-sm mt-2">这可能需要一分钟左右，请勿关闭页面。</p>
            </div>
        )}

        {error && (
             <div className="text-center p-8 max-w-md">
                <p className="text-red-400 mb-2 font-bold text-xl">生成失败</p>
                <p className="text-red-300 text-sm bg-red-900/20 p-4 rounded-lg border border-red-500/20">{error}</p>
             </div>
        )}

        {!loading && !videoUrl && !error && (
            <div className="text-center text-nexus-700">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>输入提示词以开始渲染。</p>
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
                        下载视频
                     </a>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default VideoMode;