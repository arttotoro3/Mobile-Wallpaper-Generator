
import React, { useState, useCallback } from 'react';
import { WallpaperImage, GenerationState } from './types';
import { generateWallpaper } from './services/geminiService';
import ImageCard from './components/ImageCard';
import FullPreview from './components/FullPreview';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    images: [],
    error: null,
  });
  const [selectedImage, setSelectedImage] = useState<WallpaperImage | null>(null);

  const handleGenerate = async (targetPrompt: string = prompt) => {
    if (!targetPrompt.trim()) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 4개의 이미지를 병렬로 생성하여 사용자 경험 개선
      const generationPromises = Array(4).fill(0).map(() => generateWallpaper(targetPrompt));
      const results = await Promise.all(generationPromises);
      
      const newImages: WallpaperImage[] = results.map((url, index) => ({
        id: `${Date.now()}-${index}`,
        url,
        prompt: targetPrompt,
      }));

      setState({
        isLoading: false,
        images: newImages,
        error: null,
      });
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: '배경화면을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' 
      }));
    }
  };

  const handleDownload = useCallback((url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `moodpaper-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleRemix = useCallback((e: React.MouseEvent, remixPrompt: string) => {
    e.stopPropagation();
    setPrompt(remixPrompt);
    handleGenerate(remixPrompt);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col bg-slate-900 overflow-x-hidden text-slate-100 font-sans">
      {/* Header */}
      <header className="px-6 pt-10 pb-6">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          MoodPaper
        </h1>
        <p className="text-slate-400 text-sm mt-1">AI 감성 배경화면 생성기</p>
      </header>

      {/* Input Section */}
      <div className="px-6 mb-8">
        <div className="relative group">
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예: 보라빛 노을이 내리는 바다"
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-5 pr-14 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-xl"
          />
          <button 
            onClick={() => handleGenerate()}
            disabled={state.isLoading || !prompt.trim()}
            className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg active:scale-90 disabled:opacity-50 transition-all"
          >
            {state.isLoading ? (
              <i className="fas fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fas fa-magic"></i>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 px-6 pb-20 overflow-y-auto no-scrollbar">
        {state.error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-3">
            <i className="fas fa-exclamation-circle"></i>
            {state.error}
          </div>
        )}

        {state.isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[9/16] bg-slate-800 rounded-2xl animate-pulse flex flex-col items-center justify-center p-4">
                <i className="fas fa-wand-sparkles text-slate-700 text-4xl mb-4 animate-bounce"></i>
                <div className="h-2 w-20 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : state.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {state.images.map((img) => (
              <ImageCard 
                key={img.id} 
                image={img} 
                onClick={setSelectedImage} 
                onDownload={(e, url) => {
                  e.stopPropagation();
                  handleDownload(url);
                }}
                onRemix={handleRemix}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <i className="fas fa-paint-brush text-2xl text-slate-600"></i>
            </div>
            <p className="text-center font-medium">원하는 분위기를 입력해 보세요.<br/>당신만을 위한 배경화면을 그려드릴게요.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-2 px-4">
              {['미니멀한 설산', '네온 시티 야경', '수채화풍 숲속', '추상적인 컬러 그라데이션'].map((tag) => (
                <button 
                  key={tag}
                  onClick={() => {
                    setPrompt(tag);
                    handleGenerate(tag);
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-400 rounded-full text-xs hover:bg-slate-700 active:scale-95 transition-all"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Full Preview Modal */}
      <FullPreview 
        image={selectedImage} 
        onClose={() => setSelectedImage(null)} 
        onDownload={handleDownload}
      />

      {/* Scroll to top FAB */}
      {!state.isLoading && state.images.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 safe-area-bottom">
           <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl text-white text-sm font-semibold flex items-center gap-2 active:scale-95 transition-transform"
           >
             <i className="fas fa-arrow-up"></i>
             다른 배경화면 만들기
           </button>
        </div>
      )}
    </div>
  );
};

export default App;
