import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, Minimize2, Camera, Image as ImageIcon, History, Plus, Trash2, ChevronLeft, GraduationCap, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { aiService } from '../services/aiService';
import { ocrService } from '../services/ocrService';
import { useStore } from '../hooks/useStore';
import { translations } from '../utils/translations';
import { checkMessageQuota, incrementMessageUsage, isUserPremiumActive } from '../services/aiQuotaService';

const MessageFormatter: React.FC<{ text: string }> = ({ text }) => {
  // Split text into lines but filter out separators like --- or ===
  const lines = text.split('\n').filter(line => !line.trim().match(/^[-=]{3,}$/));

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        // Headers (## or ###)
        if (line.startsWith('### ')) {
          return <h4 key={`line-${idx}`} className="text-base font-black text-accent mt-4 mb-2">{line.replace('### ', '')}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={`line-${idx}`} className="text-lg font-black text-slate-900 dark:text-white mt-6 mb-3 border-b border-slate-200 dark:border-white/10 pb-1">{line.replace('## ', '')}</h3>;
        }

        // List items
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={`line-${idx}`} className="flex gap-2 ml-2">
              <span className="text-primary dark:text-primary-light">•</span>
              <span className="flex-1">{formatInline(line.trim().substring(2))}</span>
            </div>
          );
        }

        // Numbered lists
        const numberedMatch = line.trim().match(/(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={`line-${idx}`} className="flex gap-2 ml-2">
              <span className="text-primary dark:text-primary-light font-black underline decoration-accent/30">{numberedMatch[1]}.</span>
              <span className="flex-1">{formatInline(numberedMatch[2])}</span>
            </div>
          );
        }

        if (line.trim() === '') return <div key={`line-${idx}`} className="h-2" />;

        return <p key={`line-${idx}`}>{formatInline(line)}</p>;
      })}
    </div>
  );
};


const formatInline = (text: string) => {
  // Clean up any stray LaTeX delimiters like $...$ or $$...$$
  const cleanText = text
    .replace(/\$\$(.*?)\$\$/g, '$1')
    .replace(/\$(.*?)\$/g, '$1')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈');

  const parts = cleanText.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`part-${i}`} className="font-black text-slate-900 dark:text-white decoration-primary/50 underline-offset-2">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`part-${i}`} className="italic text-slate-700 dark:text-slate-300">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const LevelBot: React.FC = () => {
  const { user, coachSessions, saveCoachMessage, createCoachSession, deleteCoachSession, settings, setCoachSessions } = useStore();
  const language = settings?.language || 'fr';
  const t = (translations[language] || translations['fr']).levelBot;

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [lastFailedMsg, setLastFailedMsg] = useState<{ text: string; image?: string | null; isExpert?: boolean } | null>(null);
  const [showExpertSuggestion, setShowExpertSuggestion] = useState(false);
  const [lastUserQuestion, setLastUserQuestion] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const showSub = Keyboard.addListener('keyboardWillShow', (info) => {
        setKeyboardHeight(info.keyboardHeight || 0);
      });
      const didShowSub = Keyboard.addListener('keyboardDidShow', (info) => {
        setKeyboardHeight(info.keyboardHeight || 0);
      });
      const hideSub = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
      });
      const didHideSub = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
      });
      return () => {
        showSub.then(s => s.remove()).catch(() => {});
        didShowSub.then(s => s.remove()).catch(() => {});
        hideSub.then(s => s.remove()).catch(() => {});
        didHideSub.then(s => s.remove()).catch(() => {});
      };
    }
  }, []);

  const currentSession = useMemo(() => 
    coachSessions.find(s => s.id === activeSessionId), 
    [coachSessions, activeSessionId]
  );

  const messages = currentSession?.messages || [];
  // Strict premium check: requires is_premium=true AND valid non-expired premium_until
  const isPremiumActive = isUserPremiumActive(user);
  const quotaResult = checkMessageQuota(user);
  const isLimitReached = !quotaResult.allowed;

  // Ephemeral chat cleanup for non-premium users on unmount or window close
  useEffect(() => {
    if (!isOpen && !isPremiumActive && coachSessions.length > 0) {
      setCoachSessions([]);
      const coachKey = user?.id ? `levelmak_${user.id}_coach_sessions` : 'levelmak_coach_sessions';
      localStorage.removeItem(coachKey);
      setActiveSessionId(null);
    }
  }, [isOpen, isPremiumActive, user?.id, coachSessions.length, setCoachSessions]);

  useEffect(() => {
    return () => {
      if (!isPremiumActive) {
        setCoachSessions([]);
        const coachKey = user?.id ? `levelmak_${user.id}_coach_sessions` : 'levelmak_coach_sessions';
        localStorage.removeItem(coachKey);
      }
    };
  }, [isPremiumActive, user?.id, setCoachSessions]);

  // Initialize first session if none exists or if session is empty
  useEffect(() => {
    if (!user || !isOpen) return;

    if (coachSessions.length === 0 && !activeSessionId) {
      const createdId = createCoachSession("Nouvelle Discussion");
      const targetId = createdId || `session_${Date.now()}`;
      setActiveSessionId(targetId);
      
      saveCoachMessage(targetId, {
        id: `msg_welcome_${Date.now()}`,
        role: 'bot',
        text: t.firstQuestion || "Bonjour ! C'est moi, ton **Elite Coach**. Je suis là pour t'accompagner dans tes études, résoudre tes problèmes complexes et booster ta productivité. Pose-moi n'importe quelle question pour commencer !",
        timestamp: new Date().toISOString()
      });
    } else if (!activeSessionId && coachSessions.length > 0) {
      setActiveSessionId(coachSessions[0].id);
    }
  }, [coachSessions.length, activeSessionId, user, isOpen]);

  const compressImage = async (dataUrl: string, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        const compressed = await compressImage(rawBase64);
        setSelectedImage(compressed);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const scrollToBottom = () => {
    if (scrollRef.current && view === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
    const t1 = setTimeout(scrollToBottom, 50);
    const t2 = setTimeout(scrollToBottom, 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, isTyping, view, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('bot-open');
    } else {
      document.body.classList.remove('bot-open');
    }
    return () => document.body.classList.remove('bot-open');
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent, retryMsg?: { text: string; image?: string | null; isExpert?: boolean }) => {
    e.preventDefault();
    if (!activeSessionId) return;

    if (isLimitReached) return;

    const userMsg = retryMsg ? retryMsg.text : input.trim();
    const currentImage = retryMsg ? retryMsg.image ?? null : selectedImage;
    const isExpertMode = !!retryMsg?.isExpert;

    if ((!userMsg && !currentImage) || isTyping) return;

    // Détection de l'incompréhension de l'élève pour lui proposer le Coach Expert
    const isConfused = /(pas compris|je ne comprends pas|comprends pas|c'est pas clair|ce n'est pas clair|r[ée]explique|explique autrement|explique mieux|pourquoi|aide-moi encore|je bloque|difficile)/i.test(userMsg);

    if (!retryMsg) {
      setInput('');
      setSelectedImage(null);
      setLastUserQuestion(userMsg);
      // Consume 1 message from the unified AI pool (shared with Savants & Feynman)
      incrementMessageUsage(user);
      // Save user message to store only on new send (not retry)
      saveCoachMessage(activeSessionId, {
        id: `msg_${Date.now()}`,
        role: 'user',
        text: userMsg || t.placeholder,
        image: currentImage || undefined,
        timestamp: new Date().toISOString()
      });
    }

    setLastFailedMsg(null);
    setIsTyping(true);
    setShowExpertSuggestion(false);

    try {
      let response: string = "";
      if (!navigator.onLine) {
        response = t.offline;
      } else {
        // Gemini handles images natively via Vision
        let finalUserMsg = userMsg;
        let imageToSubmit = currentImage;

        const studentClass = user?.education || user?.gradeClass || user?.level || 'Collège/Lycée';
        const profileContext = user ? `Élève: ${user.name || 'Élève'}, Classe/Niveau scolaire: ${studentClass}, XP: ${user.xp || 0}, Rang: #${user.rank || 1}, Heures apprises: ${user.stats?.hoursLearned?.toFixed(1) || 0}h. CONSIGNE STRICTE: L'élève est en "${studentClass}". Adapte STRICTEMENT ton vocabulaire, ton niveau d'explication, ta rigueur et tes exemples pour correspondre exactement au programme et aux exigences du niveau "${studentClass}".` : "";
        response = await aiService.coachChat(finalUserMsg, messages, profileContext, imageToSubmit || undefined, language, isExpertMode);
      }

      saveCoachMessage(activeSessionId, {
        id: `msg_${Date.now() + 1}`,
        role: 'bot',
        text: response || t.error,
        isExpert: isExpertMode,
        timestamp: new Date().toISOString()
      });

      // Si l'élève a manifesté de l'incompréhension et que ce n'était pas déjà le mode expert, on lui tend la main
      if (isConfused && !isExpertMode) {
        setShowExpertSuggestion(true);
      }
    } catch (error: any) {
      console.error("Erreur Gemini Flash:", error);
      // Store for retry
      setLastFailedMsg({ text: userMsg, image: currentImage, isExpert: isExpertMode });

      saveCoachMessage(activeSessionId, {
        id: `msg_${Date.now() + 1}`,
        role: 'bot',
        text: error.message || t.genericError,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleAskCoachExpert = () => {
    setShowExpertSuggestion(false);
    const target = lastUserQuestion || [...messages].reverse().find(m => m.role === 'user')?.text || "cette notion";
    const prompt = `Peux-tu me réexpliquer en détail et pas à pas la notion suivante : "${target}" ? Décompose la démarche étape par étape, donne-moi un exemple concret du quotidien pour illustrer et assure-toi que je comprenne facilement.`;
    handleSend({ preventDefault: () => {} } as any, { text: prompt, isExpert: true });
  };

  const handleNewChat = () => {
    const newId = createCoachSession();
    setActiveSessionId(newId);
    
    // Insère automatiquement le message de salutation initial du Coach Élite
    saveCoachMessage(newId, {
      id: `msg_welcome_${Date.now()}`,
      role: 'bot',
      text: t.firstQuestion || "Bonjour ! C'est moi, ton **Elite Coach**. Je suis là pour t'accompagner dans tes études, résoudre tes problèmes complexes et booster ta productivité. Pose-moi n'importe quelle question pour commencer !",
      timestamp: new Date().toISOString()
    });
    
    setView('chat');
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t.deleteConfirm)) {
      deleteCoachSession(id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    }
  };

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, keyboardHeight, isOpen]);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Ouvrir Elite Coach"
          className="fixed top-1/2 -translate-y-1/2 right-4 md:right-8 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-primary to-secondary text-white rounded-xl md:rounded-2xl shadow-glow flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border border-white/20"
        >
          <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-accent rounded-full border-2 border-slate-900 flex items-center justify-center animate-pulse">
            <Sparkles className="text-white w-2 h-2 md:w-2.5 md:h-2.5" />
          </div>
          <MessageCircle size={28} className="md:w-8 md:h-8 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {isOpen && (
        <div 
          style={{
        bottom: `${keyboardHeight}px`,
        height: keyboardHeight > 0 
          ? `calc(100dvh - env(safe-area-inset-top) - ${keyboardHeight}px)` 
          : undefined
      }}
      className={`
        fixed transition-[bottom,height,opacity,transform] duration-200 z-[2000]
        bottom-0 right-0 md:bottom-6 md:right-6 
        w-full md:w-[450px] md:max-w-[calc(100vw-3rem)]
        h-[calc(100dvh-env(safe-area-inset-top))] md:h-[650px] md:max-h-[85vh]
        rounded-t-3xl md:rounded-[2rem]
        bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-up
      `}
    >
      {/* Header */}
      <div className="bg-slate-100 dark:bg-slate-800 p-4 md:p-6 text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-200 dark:border-white/10 shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setView(view === 'chat' ? 'history' : 'chat')}
            className="w-10 h-10 md:w-12 md:h-12 bg-slate-200/80 dark:bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center border border-slate-300 dark:border-white/20 relative overflow-hidden group active:scale-95 transition-transform"
          >
            {view === 'chat' ? <History size={20} className="text-primary dark:text-accent" /> : <ChevronLeft size={24} className="text-primary dark:text-accent" />}
          </button>
          <div>
            <h4 className="font-display font-black text-base md:text-lg tracking-tight text-slate-900 dark:text-white">
              {view === 'chat' ? t.title : t.sessions}
            </h4>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
              <span className="text-[10px] text-slate-600 dark:text-white/60 font-black uppercase tracking-[0.2em]">{t.subtitle}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view === 'history' && (
            <button onClick={handleNewChat} className="p-2.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-xl transition-colors">
              <Plus size={20} />
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-900">
        {view === 'history' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar">
            {coachSessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50">
                <History size={48} />
                <p className="font-black uppercase tracking-widest text-xs">{t.empty}</p>
              </div>
            ) : (
              coachSessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => { setActiveSessionId(session.id); setView('chat'); }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between
                    ${activeSessionId === session.id ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}
                  `}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-white truncate text-sm">{session.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-black uppercase tracking-wider">
                      {new Date(session.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-5 custom-scrollbar">
              <div className="flex flex-col space-y-3 md:space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    {msg.role === 'bot' && (
                      <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/20 flex items-center justify-center mr-3 mt-1 shrink-0">
                        <Sparkles size={14} className="text-primary dark:text-primary-light" />
                      </div>
                    )}
                    <div className={`
                      max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap
                      ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-secondary text-white rounded-tr-none shadow-lg'
                        : 'bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/5 rounded-tl-none shadow-sm dark:shadow-inner'}
                    `}>
                      {msg.image && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-slate-200 dark:border-white/20">
                          <img src={msg.image} alt="User upload" className="max-w-full h-auto max-h-[250px] object-contain bg-black/20" />
                        </div>
                      )}
                      {msg.isExpert && msg.role === 'bot' && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider mb-2">
                          <Sparkles size={11} className="text-amber-500" />
                          <span>Explication du Coach Expert</span>
                        </div>
                      )}
                      {msg.role === 'bot' ? <MessageFormatter text={msg.text} /> : msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/5 flex items-center justify-center mr-3 mt-1">
                      <Loader2 size={14} className="animate-spin text-slate-500" />
                    </div>
                    <div className="bg-white dark:bg-white/5 px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/5 rounded-tl-none shadow-sm flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-primary dark:bg-primary-light rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-primary dark:bg-primary-light rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-primary dark:bg-primary-light rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.typing}</span>
                    </div>
                  </div>
                )}

                {/* Retry button shown when last message failed */}
                {lastFailedMsg && !isTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <button
                      onClick={(e) => handleSend(e as any, lastFailedMsg)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 rounded-2xl text-xs font-bold transition-all active:scale-95"
                    >
                      <RefreshCw size={13} />
                      Réessayer la dernière réponse
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Contextual Coach Expert Help Card */}
            {showExpertSuggestion && !isTyping && !isLimitReached && (
              <div className="px-3 md:px-4 pt-2">
                <div className="p-3 md:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex items-center justify-between gap-3 animate-fade-in shadow-lg shadow-amber-950/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                      <Sparkles size={14} />
                    </div>
                    <div className="text-[11px] text-slate-800 dark:text-slate-200">
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 block">Besoin d'un coup de pouce ?</span>
                      Veux-tu que ton Coach Expert te réexplique la méthode pas à pas avec un exemple concret ?
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAskCoachExpert}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-xl shrink-0 transition-transform active:scale-95 shadow-md shadow-amber-500/20"
                  >
                    Réexpliquer pas à pas
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className={`p-3 md:p-4 border-t border-slate-200 dark:border-white/5 bg-slate-100/90 dark:bg-slate-900/80 backdrop-blur-xl ${keyboardHeight > 0 ? 'pb-2' : 'pb-[calc(env(safe-area-inset-bottom,0.75rem)+0.75rem)]'} md:pb-4`}>
              {/* Quota limit reached smart banner (completely silent until quota is reached) */}
              {isLimitReached && (
                <div className="mb-3 p-3.5 md:p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/5 border border-blue-500/30 text-left animate-fade-in shadow-xl shadow-blue-950/10 space-y-2.5">
                  {!isPremiumActive ? (
                    <>
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl shrink-0">🎯</span>
                        <div>
                          <h5 className="text-xs md:text-sm font-black text-slate-900 dark:text-white">
                            Tes 10 messages d'essai gratuit sont terminés !
                          </h5>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            Tu as pu découvrir la puissance de ton Coach IA LevelBot. Pour continuer à poser toutes tes questions chaque jour, faire corriger tes photos d'exercices et débloquer tous les quiz en illimité, active ton accès PRO !
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'pricing' } }));
                        }}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Sparkles size={14} />
                        <span>💎 Découvrir les Forfaits PRO (dès 15 000 FG)</span>
                      </button>
                    </>
                  ) : quotaResult.limit <= 25 ? (
                    <>
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl shrink-0">⏳</span>
                        <div>
                          <h5 className="text-xs md:text-sm font-black text-slate-900 dark:text-white">
                            Quota du jour atteint (25 messages).
                          </h5>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            Ton Coach IA recharge tes 25 messages cette nuit à 00h00.<br />
                            <strong className="text-blue-600 dark:text-blue-400">🚀 Envie de continuer à travailler sans attendre ?</strong><br />
                            Passe au <span className="font-bold text-slate-900 dark:text-white">Forfait Mensuel (75 messages/jour + 15 photos/jour)</span> : <em>tes jours restants seront automatiquement ajoutés à ton nouveau mois !</em>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'pricing' } }));
                        }}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Sparkles size={14} />
                        <span>⚡ Passer au Forfait Mensuel (avec cumul de tes jours)</span>
                      </button>
                    </>
                  ) : quotaResult.limit <= 75 ? (
                    <>
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl shrink-0">🌟</span>
                        <div>
                          <h5 className="text-xs md:text-sm font-black text-slate-900 dark:text-white">
                            Super travail aujourd'hui ! (75 messages atteints)
                          </h5>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            Tu as beaucoup progressé ! Ton coach recharge tes 75 messages cette nuit à 00h00.<br />
                            <strong className="text-amber-500">👑 Tu prépares ton examen ou ton passage en classe supérieure ?</strong><br />
                            Passe au <span className="font-bold text-slate-900 dark:text-white">Forfait Annuel (150 messages/jour + sujets complets)</span> et conserve ton accès jusqu'à la fin de l'année scolaire !
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'pricing' } }));
                        }}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Sparkles size={14} />
                        <span>👑 Découvrir le Forfait Annuel</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl shrink-0">🌟</span>
                      <div>
                        <h5 className="text-xs md:text-sm font-black text-slate-900 dark:text-white">
                          Quota exceptionnel du jour atteint (150 messages).
                        </h5>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          Tu as été remarquablement assidu aujourd'hui ! Ton coach LevelBot se recharge cette nuit à 00h00.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {selectedImage && !isLimitReached && (
                <div className="mb-3 animate-fade-in">
                  <div className="relative inline-block mb-2">
                    <img src={selectedImage} alt="Preview" className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-xl border border-slate-300 dark:border-white/20 shadow-lg" />
                    <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center border border-white/20 hover:bg-slate-700 shadow-xl transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                  
                  {/* Assistant Littéraire : Quick Prompts */}
                  <div className="flex flex-wrap gap-2 mb-2">
                     <button
                       type="button"
                       onClick={() => setInput("Fais l'analyse littéraire complète de ce texte (thèmes, ton, registre).")}
                       className="px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold hover:bg-purple-500/20 transition-all"
                     >
                       🎭 Analyse Littéraire
                     </button>
                     <button
                       type="button"
                       onClick={() => setInput("Relève et explique toutes les figures de style présentes dans ce texte.")}
                       className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold hover:bg-blue-500/20 transition-all"
                     >
                       ✒️ Figures de Style
                     </button>
                     <button
                       type="button"
                       onClick={() => setInput("Fais un résumé détaillé de ce texte scanné.")}
                       className="px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 rounded-lg text-xs font-bold hover:bg-green-500/20 transition-all"
                     >
                       📝 Résumé
                     </button>
                  </div>
                </div>
              )}
              <form onSubmit={handleSend} className="relative flex items-center gap-2 md:gap-3 group">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImageSelect}
                  disabled={isLimitReached}
                />
                <div className="flex gap-1.5 md:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('capture', 'environment');
                        fileInputRef.current.click();
                      }
                    }}
                    className={`w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-xl md:rounded-2xl flex items-center justify-center transition-all border ${
                      isLimitReached 
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-white/5 cursor-not-allowed opacity-50' 
                        : 'bg-blue-600/10 dark:bg-blue-600/20 hover:bg-blue-600/30 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-white border-blue-500/30'
                    }`}
                    title={t.snapSolve}
                    disabled={isLimitReached}
                  >
                    <Camera size={20} className="md:w-5 md:h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute('capture');
                        fileInputRef.current.click();
                      }
                    }}
                    className={`w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-xl md:rounded-2xl flex items-center justify-center transition-all border ${
                      isLimitReached 
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-white/5 cursor-not-allowed opacity-50' 
                        : 'bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-white/5'
                    }`}
                    title={t.gallery}
                    disabled={isLimitReached}
                  >
                    <ImageIcon size={20} className="md:w-5 md:h-5" />
                  </button>
                </div>
                <div className="relative flex-1 h-12 md:h-14">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      isLimitReached
                        ? (language === 'fr'
                          ? "Limite de messages atteinte"
                          : language === 'ar'
                          ? "تم الوصول إلى الحد الأقصى"
                          : "Message limit reached")
                        : t.placeholder
                    }
                    className="w-full h-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 outline-none rounded-xl md:rounded-2xl px-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary transition-all shadow-sm pr-12 md:pr-14"
                    disabled={isLimitReached}
                  />
                  <button
                    type="submit"
                    disabled={(!input.trim() && !selectedImage) || isTyping || isLimitReached}
                    className={`
                      absolute right-1.5 top-1.5 bottom-1.5 
                      w-10 md:w-12 flex items-center justify-center 
                      rounded-xl md:rounded-xl shadow-lg border transition-all active:scale-95 group-hover:scale-105
                      ${(input.trim() || selectedImage) && !isTyping && !isLimitReached
                        ? 'bg-gradient-to-br from-primary to-secondary text-white border-primary/20 shadow-glow'
                        : 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed opacity-50'}
                    `}
                  >
                    {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} className={((input.trim() || selectedImage) && !isTyping && !isLimitReached) ? "animate-pulse" : ""} />}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
        </div>
      )}
    </>
  );
};

export default LevelBot;
