
import React, { useState, useEffect, useCallback } from 'react';
import { WallpaperImage, GenerationState } from './types';
import { generateWallpaper, testConnection } from './services/geminiService';
import ImageCard from './components/ImageCard';
import FullPreview from './components/FullPreview';

// aistudio global type is provided by the environment, removing redundant and conflicting declaration.

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    images: [],
    error: null,
  });
  const [selectedImage, setSelectedImage] = useState<WallpaperImage | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');

  // 초기 로드 시 API 키 설정 여부 확인
  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (hasKey) {
        setApiStatus('connected');
      } else {
        setApiStatus('error');
      }
    } catch (e) {
      setApiStatus('error');
    }
  };

  const handleOpenKeySelector = async () => {
    try {
      await window.aistudio.openSelectKey();
      // 선택 직후 레이스 컨디션을 방지하기 위해 성공으로 가정하고 상태 업데이트
      setApiStatus('connected');
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Failed to open key selector", error);
    }
  };

  const handleTestConnection = async () => {
    setApiStatus('checking');
    const isOk = await testConnection();
    if (isOk) {
      setApiStatus('connected');
      alert('API 연결에 성공했습니다! 이제 고품질 배경화면을 생성할 수 있습니다.');
    } else {
      setApiStatus('error');
      alert('연결에 실패했습니다. 유효한 API 키가 설정되었는지 확인해 주세요.');
    }
  };

  const handleGenerate = async (targetPrompt: string = prompt) => {
    if (!targetPrompt.trim()) return;

    // API 키 체크
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      setIsSettingsOpen(true);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 4개의 버전을 병렬로 생성
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
      // "Requested entity was not found." 에러 발생 시 키 선택 창을 열도록 유도
      if (err.message === 'API_KEY_REQUIRED' || err.message?.includes("Requested entity was not found")) {
        setIsSettingsOpen(true);
        setApiStatus('error');
        setState(prev => ({ ...prev, isLoading: false, error: 'API 키 설정이 필요합니다.' }));
      } else {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: '이미지를 생성하는 중 오류가 발생했습니다. 다시 시도해 주세요.' 
        }));
      }
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
    <div className="min-h-screen max-w-md mx-auto flex flex-col bg-slate-900 overflow-x-hidden text-slate-100">
      {/* Header */}
      <header className="px-6 pt-10 pb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            MoodPaper
          </h1>
          <p className="text-slate-400 text-sm mt-1">Pro Image Generator</p>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 active:scale-90 transition-transform"
        >
          <i className="fas fa-cog text-slate-400"></i>
        </button>
      </header>

      {/* Input Section */}
      <div className="px-6 mb-8">
        <div className="relative group">
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="원하는 분위기를 설명해 주세요..."
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

      {/* Main Content */}
      <main className="flex-1 px-6 pb-20 overflow-y-auto no-scrollbar">
        {state.error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {state.error}
          </div>
        )}

        {state.isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[9/16] bg-slate-800 rounded-2xl animate-pulse flex flex-col items-center justify-center">
                <i className="fas fa-wand-sparkles text-slate-700 text-3xl animate-bounce"></i>
                <span className="text-xs text-slate-600 mt-2">생성 중...</span>
              </div>
            ))}
          </div>
        ) : state.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
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
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 opacity-80">
            <i className="fas fa-sparkles text-5xl mb-6 text-slate-700"></i>
            <p className="text-center">멋진 휴대폰 배경화면을<br/>무료로 생성해 보세요.</p>
          </div>
        )}
      </main>

      {/* Full Preview Modal */}
      <FullPreview 
        image={selectedImage} 
        onClose={() => setSelectedImage(null)} 
        onDownload={handleDownload}
      />

      {/* Settings Modal (API Management) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="relative bg-slate-800 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-2">API 설정</h2>
            <p className="text-sm text-slate-400 mb-6">고품질 모델(Gemini 3 Pro) 사용을 위해 유료 프로젝트의 API 키가 필요합니다.</p>
            
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium">연결 상태</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                    apiStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 
                    apiStatus === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {apiStatus === 'connected' ? 'Connected' : apiStatus === 'error' ? 'Disconnected' : 'Checking...'}
                  </span>
                </div>
                
                <button 
                  onClick={handleOpenKeySelector}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  <i className="fas fa-key"></i>
                  API 키 선택 / 변경
                </button>

                <button 
                  onClick={handleTestConnection}
                  disabled={apiStatus === 'checking'}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  {apiStatus === 'checking' ? (
                    <i className="fas fa-circle-notch fa-spin"></i>
                  ) : (
                    <i className="fas fa-vial"></i>
                  )}
                  연결 테스트
                </button>
              </div>
              
              <div className="text-[11px] text-slate-500 text-center leading-relaxed">
                선택한 키는 로컬 환경에 안전하게 관리되며,<br/>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-indigo-400 underline" rel="noopener noreferrer">결제가 설정된 프로젝트</a>의 키여야 합니다.
              </div>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="mt-6 w-full py-2 text-slate-400 text-sm font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
