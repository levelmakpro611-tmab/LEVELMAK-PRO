import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, Minimize2, Camera, Image as ImageIcon, History, Plus, Trash2, ChevronLeft } from 'lucide-react';
import { openrouterService } from '../services/openrouter';
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
          return <h4 key={idx} className="text-base font-black text-accent mt-4 mb-2">{line.replace('### ', '')}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={idx} className="text-lg font-black text-white mt-6 mb-3 border-b border-white/10 pb-1">{line.replace('## ', '')}</h3>;
        }

        // List items
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={idx} className="flex gap-2 ml-2">
              <span className="text-primary-light">•</span>
              <span className="flex-1">{formatInline(line.trim().substring(2))}</span>
            </div>
          );
        }

        // Numbered lists
        const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex gap-2 ml-2">
              <span className="text-primary-light font-black underline decoration-accent/30">{numberedMatch[1]}.</span>
              <span className="flex-1">{formatInline(numberedMatch[2])}</span>
            </div>
          );
        }

        if (line.trim() === '') return <div key={idx} className="h-2" />;

        return <p key={idx}>{formatInline(line)}</p>;
      })}
    </div>
  );
};

const formatInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black text-white decoration-primary/50 underline-offset-2">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const LevelBot: React.FC = () => {
  const { user, coachSessions, saveCoachMessage, createCoachSession, deleteCoachSession, settings } = useStore();
  const t = translations[settings.language].levelBot;
  
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize first session if none exists
  useEffect(() => {
    if (coachSessions.length === 0 && user) {
      const id = createCoachSession();
      setActiveSessionId(id);
    } else if (!activeSessionId && coachSessions.length > 0) {
      setActiveSessionId(coachSessions[0].id);
    }
  }, [coachSessions.length, activeSessionId, user]);

  const currentSession = useMemo(() => 
    coachSessions.find(s => s.id === activeSessionId), 
    [coachSessions, activeSessionId]
  );

  const messages = currentSession?.messages || [];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (scrollRef.current && view === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, view]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('bot-open');
    } else {
      document.body.classList.remove('bot-open');
    }
    return () => document.body.classList.remove('bot-open');
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionId) return;
    if ((!input.trim() && !selectedImage) || isTyping) return;

    const userMsg = input.trim();
    const currentImage = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    
    // Save user message to store
    saveCoachMessage(activeSessionId, {
      id: `msg_${Date.now()}`,
      role: 'user',
      text: userMsg || "Regarde cette image.",
      image: currentImage || undefined,
      timestamp: new Date().toISOString()
    });
    
    setIsTyping(true);

    try {
      let response: string = "";
      if (!navigator.onLine) {
        response = "🚫 Je suis hors ligne. Connecte-toi à internet pour continuer.";
      } else {
        let finalUserMsg = userMsg;
        let imageToSubmit = currentImage;

        // OCR Integration
        if (currentImage) {
          try {
            const langMap: any = { 'fr': 'fra+eng', 'en': 'eng', 'ar': 'ara' };
            const ocrLang = langMap[settings.language] || 'fra+eng';
            const extractedText = await ocrService.extractText(currentImage, ocrLang);
            
            if (extractedText && extractedText.trim().length > 10) {
              finalUserMsg = userMsg 
                ? `${userMsg}\n\n=== TEXTE EXTRAIT DE LA PHOTO ===\n${extractedText}\n================================`
                : `Voici le texte extrait de ma photo :\n\n${extractedText}`;
              
              // According to user preference: "Pas besoin que l'IA reçoive la photo directement"
              // We could potentially set imageToSubmit to undefined here to save resources,
              // but we keep it as fallback/context if the AI model supports it.
              // However, to strictly follow the user request:
              imageToSubmit = null; 
            }
          } catch (ocrErr) {
            console.warn("OCR Error, falling back to direct vision:", ocrErr);
          }
        }

        // Send to OpenRouter (with extracted text instead of image if OCR succeeded)
        response = await openrouterService.coachChat(finalUserMsg, messages, "", imageToSubmit || undefined);
      }

      saveCoachMessage(activeSessionId, {
        id: `msg_${Date.now() + 1}`,
        role: 'bot',
        text: response || "Oups, j'ai eu un petit bug. Recommence ?",
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Erreur OpenRouter:", error);
      let errorMsg = "Désolé, je n'arrive pas à me connecter au savoir universel pour l'instant. 😔";
      if (error.status === 429) errorMsg = "Oups ! Quota dépassé. Réessaie dans un instant ! ⏳";
      
      saveCoachMessage(activeSessionId, {
        id: `msg_${Date.now() + 1}`,
        role: 'bot',
        text: errorMsg,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    const newId = createCoachSession();
    setActiveSessionId(newId);
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
          <Sparkles className="text-white" size={8} md:size={10} />
        </div>
        <MessageCircle size={28} className="md:w-8 md:h-8 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className={`
      fixed transition-all duration-300 z-[200]
      bottom-0 right-0 md:bottom-6 md:right-6 
      w-full md:w-[450px] md:max-w-[calc(100vw-3rem)]
      h-[calc(100dvh-env(safe-area-inset-top))] md:h-auto md:max-h-[calc(100dvh-3rem)]
      rounded-t-3xl md:rounded-[2rem]
      bg-slate-900 border border-white/10 shadow-premium flex flex-col overflow-hidden animate-slide-up
    `}>
      {/* Header */}
      <div className="bg-slate-800 p-4 md:p-6 text-white flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setView(view === 'chat' ? 'history' : 'chat')}
            className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center border border-white/20 relative overflow-hidden group active:scale-95 transition-transform"
          >
            {view === 'chat' ? <History size={20} className="text-accent" /> : <ChevronLeft size={24} className="text-accent" />}
          </button>
          <div>
            <h4 className="font-display font-black text-base md:text-lg tracking-tight">
              {view === 'chat' ? 'Elite Coach' : t.sessions}
            </h4>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
              <span className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em]">IA Pédagogique</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view === 'history' && (
            <button onClick={handleNewChat} className="p-2.5 bg-primary/20 text-primary-light rounded-xl hover:bg-primary/30 transition-colors">
              <Plus size={20} />
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-900">
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 opacity-30 text-center px-8">
                  <Sparkles size={40} className="text-accent animate-float" />
                  <p className="text-sm font-bold">Pose ta première question pour commencer ta leçon d'élite avec ton coach personnalisé.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  {msg.role === 'bot' && (
                    <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/20 flex items-center justify-center mr-3 mt-1 shrink-0">
                      <Sparkles size={14} className="text-primary-light" />
                    </div>
                  )}
                  <div className={`
                    max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-secondary text-white rounded-tr-none shadow-lg'
                      : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none shadow-inner'}
                  `}>
                    {msg.image && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-white/20">
                        <img src={msg.image} alt="User upload" className="max-w-full h-auto max-h-[250px] object-contain bg-black/20" />
                      </div>
                    )}
                    {msg.role === 'bot' ? <MessageFormatter text={msg.text} /> : msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center mr-3 mt-1">
                    <Loader2 size={14} className="animate-spin text-slate-500" />
                  </div>
                  <div className="bg-white/5 px-4 py-3 rounded-2xl border border-white/5 rounded-tl-none shadow-inner flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary-light rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-primary-light rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-primary-light rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Réflexion...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-slate-950 border-t border-white/10 shrink-0 pb-[calc(env(safe-area-inset-bottom,0.5rem)+1rem)] md:pb-6">
              {selectedImage && (
                <div className="mb-3 relative inline-block animate-fade-in">
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-xl border border-white/20 shadow-lg" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center border border-white/20 hover:bg-slate-700 shadow-xl transition-colors">
                    <X size={12} />
                  </button>
                </div>
              )}
              <form onSubmit={handleSend} className="relative flex items-center gap-2 md:gap-3 group">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImageSelect}
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
                    className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-white rounded-xl md:rounded-2xl flex items-center justify-center transition-all border border-blue-500/30"
                    title="Prendre une photo (Snap & Solve)"
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
                    className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl md:rounded-2xl flex items-center justify-center transition-all border border-white/5"
                    title="Parcourir la galerie"
                  >
                    <ImageIcon size={20} className="md:w-5 md:h-5" />
                  </button>
                </div>
                <div className="relative flex-1 h-12 md:h-14">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Écris ton défi ici..."
                    className="w-full h-full bg-white/5 border border-white/10 outline-none rounded-xl md:rounded-2xl px-4 text-sm font-bold text-white placeholder:text-slate-500 focus:bg-white/10 transition-all shadow-inner pr-12 md:pr-14"
                  />
                  <button
                    type="submit"
                    disabled={(!input.trim() && !selectedImage) || isTyping}
                    className={`
                      absolute right-1.5 top-1.5 bottom-1.5 
                      w-10 md:w-12 flex items-center justify-center 
                      rounded-xl md:rounded-xl shadow-lg border transition-all active:scale-95 group-hover:scale-105
                      ${(input.trim() || selectedImage) && !isTyping
                        ? 'bg-gradient-to-br from-primary to-secondary text-white border-primary/20 shadow-glow'
                        : 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed opacity-50'}
                    `}
                  >
                    {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} className={((input.trim() || selectedImage) && !isTyping) ? "animate-pulse" : ""} />}
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
