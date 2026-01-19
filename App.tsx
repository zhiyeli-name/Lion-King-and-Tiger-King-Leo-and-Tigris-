
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { STORY_SCENES } from './constants';
import { AppState } from './types';
import { generateSceneImage, generateNarrationAudio, decodeBase64, decodeAudioData } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentSceneIndex: 0,
    generatedImages: {},
    isImageLoading: false,
    isAudioLoading: false,
    error: null,
    isStarted: false,
    isMuted: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentScene = STORY_SCENES[state.currentSceneIndex];

  const stopCurrentAudio = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
  };

  const playNarration = async (index: number) => {
    if (state.isMuted) return;
    
    setState(prev => ({ ...prev, isAudioLoading: true }));
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      // We combine narration and dialogue for the TTS so it flows naturally
      const base64 = await generateNarrationAudio(STORY_SCENES[index].narration + "\n\n" + (STORY_SCENES[index].dialogue || ""));
      const audioBuffer = await decodeAudioData(decodeBase64(base64), audioContextRef.current);
      
      stopCurrentAudio();
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      currentSourceRef.current = source;
      
      setState(prev => ({ ...prev, isAudioLoading: false }));
    } catch (err) {
      console.error("Audio playback error:", err);
      setState(prev => ({ ...prev, isAudioLoading: false }));
    }
  };

  const handleGenerateImage = useCallback(async (index: number) => {
    if (state.generatedImages[index]) return;

    setState(prev => ({ ...prev, isImageLoading: true, error: null }));
    try {
      const imageUrl = await generateSceneImage(STORY_SCENES[index].visualPrompt);
      setState(prev => ({
        ...prev,
        generatedImages: { ...prev.generatedImages, [index]: imageUrl },
        isImageLoading: false
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        isImageLoading: false,
        error: "生成插画失败，请重试。"
      }));
    }
  }, [state.generatedImages]);

  useEffect(() => {
    if (state.isStarted) {
      handleGenerateImage(state.currentSceneIndex);
      playNarration(state.currentSceneIndex);
    }
    return () => stopCurrentAudio();
  }, [state.currentSceneIndex, state.isStarted]);

  const goToNext = () => {
    if (state.currentSceneIndex < STORY_SCENES.length - 1) {
      setState(prev => ({ ...prev, currentSceneIndex: prev.currentSceneIndex + 1 }));
    }
  };

  const goToPrev = () => {
    if (state.currentSceneIndex > 0) {
      setState(prev => ({ ...prev, currentSceneIndex: prev.currentSceneIndex - 1 }));
    }
  };

  const startBook = () => {
    setState(prev => ({ ...prev, isStarted: true }));
    // Initialize audio context on user interaction
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  };

  const toggleMute = () => {
    if (!state.isMuted) {
      stopCurrentAudio();
    } else {
      playNarration(state.currentSceneIndex);
    }
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  if (!state.isStarted) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-center p-6 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
        <div className="max-w-2xl space-y-8 animate-fade-in">
          <h1 className="text-6xl md:text-8xl font-calligraphy text-amber-500 drop-shadow-[0_5px_15px_rgba(245,158,11,0.4)]">
            狮王与虎王
          </h1>
          <p className="text-2xl md:text-3xl font-calligraphy text-amber-200/60">
            双王共奏
          </p>
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-900/50 to-transparent"></div>
          <p className="text-lg text-neutral-400 font-serif max-w-lg mx-auto leading-relaxed italic">
            在这片古老的土地上，每一声咆哮都有它的意义。翻开此书，见证一段由竞争走向共生的传奇。
          </p>
          <button 
            onClick={startBook}
            className="group relative px-12 py-5 bg-amber-600 hover:bg-amber-500 text-white rounded-full text-xl font-bold transition-all hover:scale-110 active:scale-95 shadow-[0_0_20px_rgba(217,119,6,0.5)] overflow-hidden"
          >
            <span className="relative z-10">开启绘本之旅</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </div>
    );
  }

  const progress = ((state.currentSceneIndex + 1) / STORY_SCENES.length) * 100;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentScene.themeColor} transition-all duration-1000 flex flex-col items-center justify-center p-4 md:p-8 relative`}>
      {/* Background Ambience (Visual Effect) */}
      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay animate-pulse bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 bg-black/30 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl md:text-2xl font-calligraphy text-white drop-shadow-md">
            狮王与虎王
          </h1>
          <button 
            onClick={toggleMute}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
            title={state.isMuted ? "开启声音" : "关闭声音"}
          >
            {state.isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.707 14.707a1 1 0 01-1.414 0 1 1 0 010-1.414 3 3 0 000-4.242 1 1 0 011.414-1.414 5 5 0 010 7.072z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M17.536 17.536a1 1 0 01-1.414 0 1 1 0 010-1.414 7 7 0 000-9.9 1 1 0 011.414-1.414 9 9 0 010 12.728z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center space-x-4">
           {state.isAudioLoading && (
             <div className="flex items-center space-x-2 text-white/50 text-xs animate-pulse">
               <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
               <span>AI朗读生成中...</span>
             </div>
           )}
          <div className="text-white/80 font-mono text-sm tracking-widest bg-white/10 px-3 py-1 rounded-full">
            {state.currentSceneIndex + 1} / {STORY_SCENES.length}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mt-12 mb-12">
        
        {/* Left: Illustration with dynamic lighting */}
        <div className="relative group aspect-[16/10] rounded-3xl overflow-hidden shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] border-8 border-white/5 bg-black/60 transition-transform duration-1000">
          {state.isImageLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                 <div className="h-20 w-20 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center text-amber-500">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                 </div>
              </div>
              <p className="text-amber-200/60 font-serif animate-pulse text-lg">正在绘制本幕奇观...</p>
            </div>
          ) : state.generatedImages[state.currentSceneIndex] ? (
            <img 
              src={state.generatedImages[state.currentSceneIndex]} 
              alt={currentScene.title}
              className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
               <button 
                onClick={() => handleGenerateImage(state.currentSceneIndex)}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all border border-white/20"
               >
                 重新生成场景插画
               </button>
            </div>
          )}
          
          <div className="absolute top-4 left-4 flex gap-2">
              <span className="px-3 py-1 bg-black/40 backdrop-blur-sm rounded-lg text-xs text-white/60 border border-white/10">
                AI Generated Canvas
              </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500">
            <h3 className="text-xl font-calligraphy text-amber-400 mb-2">{currentScene.title}</h3>
            <p className="text-sm text-white/70 italic leading-relaxed">
              视觉语义：{currentScene.semiotics.composition} | 眼神细节：{currentScene.semiotics.eyes}
            </p>
          </div>
        </div>

        {/* Right: Narrative */}
        <div className="flex flex-col space-y-8 bg-black/40 p-8 md:p-14 rounded-[3rem] backdrop-blur-3xl border border-white/10 shadow-2xl relative overflow-hidden group/text">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] group-hover/text:bg-amber-500/20 transition-all duration-1000"></div>
          
          <div className="space-y-3 relative">
            <h2 className="text-4xl md:text-6xl font-calligraphy text-white drop-shadow-lg transition-all duration-700">{currentScene.title}</h2>
            <div className="h-1 w-24 bg-gradient-to-r from-amber-500 to-transparent rounded-full"></div>
          </div>

          <div className="space-y-6 overflow-y-auto max-h-[50vh] pr-4 custom-scrollbar relative">
            <p className="text-xl md:text-2xl leading-relaxed text-white/95 font-serif font-light first-letter:text-5xl first-letter:font-calligraphy first-letter:mr-3 first-letter:float-left first-letter:text-amber-500">
              {currentScene.narration}
            </p>
            {currentScene.dialogue && (
              <div className="bg-amber-900/10 p-6 rounded-3xl border border-amber-500/10 shadow-inner">
                {currentScene.dialogue.split('\n').map((line, i) => (
                  <p key={i} className="text-lg md:text-xl text-amber-200/80 italic font-serif py-2 border-l-2 border-amber-500/30 pl-4 mb-1 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-6 pt-6 relative">
            <button 
              onClick={goToPrev}
              disabled={state.currentSceneIndex === 0}
              className="p-5 rounded-3xl bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-white border border-white/10 group/btn"
              title="上一页"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 group-hover/btn:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={goToNext}
              disabled={state.currentSceneIndex === STORY_SCENES.length - 1}
              className="flex-1 py-5 px-8 rounded-3xl bg-amber-600 hover:bg-amber-500 text-white transition-all font-bold flex justify-center items-center group shadow-[0_10px_30px_rgba(217,119,6,0.3)] text-xl"
            >
              继续阅读
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-3 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            
            {/* Replay Audio Button */}
            {!state.isMuted && (
              <button 
                onClick={() => playNarration(state.currentSceneIndex)}
                className="p-5 rounded-3xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 transition-all"
                title="重听朗读"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Progress Tracker Footer */}
      <footer className="fixed bottom-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 transition-all duration-1000 shadow-[0_0_20px_rgba(245,158,11,1)]" 
          style={{ width: `${progress}%` }}
        />
      </footer>

      {/* Final End Scene Quote Overlay */}
      {state.currentSceneIndex === STORY_SCENES.length - 1 && (
        <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-end pb-24 z-10 px-4">
           <div className="bg-black/80 backdrop-blur-2xl px-8 md:px-12 py-6 md:py-8 rounded-[3rem] border border-white/20 animate-fade-up shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center space-y-4">
              <p className="text-xl md:text-3xl font-calligraphy text-amber-400 tracking-wider">
                “森林很大，容得下两声咆哮；心很大，容得下一个朋友。”
              </p>
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
              <p className="text-lg md:text-2xl font-serif text-amber-100/80 italic">
                化敌为友，难道不是世界上最美好的事吗？
              </p>
           </div>
        </div>
      )}

      {/* Floating Particles or effects would go here */}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 2s ease-out; }
        .animate-fade-up { animation: fade-up 1.5s ease-out; }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 158, 11, 0.4);
        }
      `}</style>
    </div>
  );
};

export default App;
