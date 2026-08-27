import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, Minimize2, Camera, Image as ImageIcon, History, Plus, Trash2, ChevronLeft, GraduationCap, RefreshCw } from 'lucide-react';
import { aiService } from '../services/aiService';
import { ocrService } from '../services/ocrService';
import { useStore } from '../hooks/useStore';
import { translations } from '../utils/translations';

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
  const [lastFailedMsg, setLastFailedMsg] = useState<{ text: string; image?: string | null } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = useMemo(() => 
    coachSessions.find(s => s.id === activeSessionId), 
    [coachSessions, activeSessionId]
  );

  const messages = currentSession?.messages || [];
  // Strict premium check: requires is_premium=true AND valid non-expired premium_until
  const isPremiumActive = !!(user && user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > Date.now());
  const isLimitReached = !isPremiumActive && messages.filter(m => m.role === 'user').length >= 10;

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
      const newId = `session_${Date.now()}`;
      createCoachSession(newId, "Nouvelle Discussion");
      setActiveSessionId(newId);
      
      saveCoachMessage(newId, {
        id: `msg_welcome`,
        role: 'bot',
        text: t.firstQuestion || "Bonjour ! C'est moi, ton **Elite Coach**. Je suis là pour t'accompagner dans tes études, résoudre tes problèmes complexes et booster ta productivité. Pose-moi n'importe quelle question pour commencer !",
        timestamp: new Date().toISOString()
      });
    } else if (!activeSessionId && coachSessions.length > 0) {
      setActiveSessionId(coachSessions[0].id);
    }
  }, [coachSessions.length, activeSessionId, user, isOpen, createCoachSession, saveCoachMessage, t.firstQuestion]);

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

  const handleSend = async (e: React.FormEvent, retryMsg?: { text: string; image?: string | null }) => {
    e.preventDefault();
    if (!activeSessionId) return;

    if (isLimitReached) return;

    const userMsg = retryMsg ? retryMsg.text : input.trim();
    const currentImage = retryMsg ? retryMsg.image ?? null : selectedImage;

    if ((!userMsg && !currentImage) || isTyping) return;

    if (!retryMsg) {
      setInput('');
      setSelectedImage(null);
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

    try {
      let response: string = "";
      if (!navigator.onLine) {
        response = t.offline;
      } else {
        // Gemini handles images natively via Vision
        let finalUserMsg = userMsg;
        let imageToSubmit = currentImage;

        const studentClass = user.gradeClass || user.level || 'Collège/Lycée';
        const profileContext = user ? `Élève: ${user.name || 'Élève'}, Classe/Niveau: ${studentClass}, XP: ${user.xp || 0}, Rang: #${user.rank || 1}, Heures apprises: ${user.stats?.hoursLearned?.toFixed(1) || 0}h` : "";
        response = await aiService.coachChat(finalUserMsg, messages, profileContext, imageToSubmit || undefined);
      }

      saveCoachMessage(activeSessionId, {
        id: `msg_${Date.now() + 1}`,
        role: 'bot',
        text: response || t.error,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Erreur Gemini Flash:", error);
      // Store for retry
      setLastFailedMsg({ text: userMsg, image: currentImage });

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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-1/2 -translate-y-1/2 right-4 md:right-8 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-primary to-secondary text-white rounded-xl md:rounded-2xl shadow-glow flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border border-white/20"
      >
        <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-accent rounded-full border-2 border-slate-900 flex items-center justify-center animate-pulse">
          <Sparkles className="text-white w-2 h-2 md:w-2.5 md:h-2.5" />
        </div>
        <MessageCircle size={28} className="md:w-8 md:h-8 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className={`
      fixed transition-[opacity,transform] duration-300 z-[2000]
      bottom-0 right-0 md:bottom-6 md:right-6 
      w-full md:w-[450px] md:max-w-[calc(100vw-3rem)]
      h-[calc(100dvh-env(safe-area-inset-top))] md:h-[650px] md:max-h-[85vh]
      rounded-t-3xl md:rounded-[2rem]
      bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-up
    `}>
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              <div className="min-h-full flex flex-col space-y-4 md:space-y-6">
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

            {/* Input Area */}
            <div className="p-3 md:p-6 border-t border-slate-200 dark:border-white/5 bg-slate-100/90 dark:bg-slate-900/80 backdrop-blur-xl pb-[calc(env(safe-area-inset-bottom,1.5rem)+1.5rem)] md:pb-6">
              {isLimitReached && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 text-center animate-fade-in">
                  {language === 'fr' 
                    ? "⚠️ Limite de 10 messages atteinte. Abonnez-vous à un forfait Premium pour continuer à discuter avec le Coach IA !"
                    : language === 'ar'
                    ? "⚠️ تم الوصول إلى حد 10 رسائل. اشترك في باقة Premium لمواصلة التحدث مع مدرب الذكاء الاصطناعي!"
                    : "⚠️ Limit of 10 messages reached. Subscribe to a Premium plan to continue chatting with the AI Coach!"}
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
  );
};

export default LevelBot;
