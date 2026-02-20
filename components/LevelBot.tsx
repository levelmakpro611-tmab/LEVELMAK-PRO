import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, Minimize2 } from 'lucide-react';
import { geminiService } from '../services/gemini';
import { useStore } from '../hooks/useStore';

const MessageFormatter: React.FC<{ text: string }> = ({ text }) => {
  // Divise le texte en lignes pour traiter les structures Markdown
  const lines = text.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        // Headers (## ou ###)
        if (line.startsWith('### ')) {
          return <h4 key={idx} className="text-base font-black text-accent mt-4 mb-2">{line.replace('### ', '')}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={idx} className="text-lg font-black text-white mt-6 mb-3 border-b border-white/10 pb-1">{line.replace('## ', '')}</h3>;
        }

        // Listes ( - ou * ou 1.)
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={idx} className="flex gap-2 ml-2">
              <span className="text-primary-light">•</span>
              <span className="flex-1">{formatInline(line.trim().substring(2))}</span>
            </div>
          );
        }

        // Listes numérotées (1., 2., etc.)
        const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex gap-2 ml-2">
              <span className="text-primary-light font-black underline decoration-accent/30">{numberedMatch[1]}.</span>
              <span className="flex-1">{formatInline(numberedMatch[2])}</span>
            </div>
          );
        }

        // Ligne vide
        if (line.trim() === '') return <div key={idx} className="h-2" />;

        // Paragraphe classique
        return <p key={idx}>{formatInline(line)}</p>;
      })}
    </div>
  );
};

// Formattage inline pour le gras (**) et l'italique (_)
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
  const { user } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: "Salut ! Je suis ton Coach IA d'élite. Besoin d'aide pour dominer tes cours ou préparer un examen ?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Handle body class for mobile responsiveness
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
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      let response: string = "";

      // Vérifier si HORS LIGNE
      if (!navigator.onLine) {
        response = "🚫 Je suis hors ligne. Connecte-toi à internet pour que je puisse accéder à mon savoir universel.";
      } else {
        // Appeler Gemini directement (Cache désactivé pour mode GPT-Style)
        response = await geminiService.coachChat(userMsg, messages, "");
      }

      setMessages(prev => [...prev, { role: 'bot', text: response || "Oups, j'ai eu un petit bug. Recommence ?" }]);
    } catch (error: any) {
      console.error("Erreur Gemini:", error);
      let errorMsg = "Désolé, je n'arrive pas à me connecter au savoir universel pour l'instant. 😔";

      if (error.message?.includes('quota') || error.status === 429) {
        errorMsg = "Oups ! J'ai atteint ma limite de réflexion pour aujourd'hui (Quota dépassé). Réessaie dans quelques instants ! ⏳";
      }

      setMessages(prev => [...prev, { role: 'bot', text: errorMsg }]);
    } finally {
      setIsTyping(false);
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
      fixed transition-all duration-500 z-[200]
      ${isOpen
        ? 'bottom-0 right-0 md:bottom-8 md:right-8 w-screen md:w-[450px] h-[calc(100%-env(safe-area-inset-top)-0.5rem)] md:h-[650px] rounded-t-3xl md:rounded-[2.5rem]'
        : 'bottom-1/2 translate-y-1/2 right-4 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl'}
      bg-slate-900 border border-white/10 shadow-premium flex flex-col overflow-hidden animate-slide-up
    `}>
      {/* Header */}
      <div className="bg-slate-800 p-4 md:p-6 text-white flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center border border-white/20 relative overflow-hidden group">
            <Sparkles size={20} className="md:w-6 md:h-6 text-accent animate-float" />
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <div>
            <h4 className="font-display font-black text-base md:text-lg tracking-tight">Coach IA</h4>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
              <span className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em]">Agent Elite</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-white/10 hover:text-white rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar bg-slate-900">
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
        <form onSubmit={handleSend} className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose ta question au coach..."
            className="w-full bg-white/5 border border-white/10 outline-none rounded-2xl md:rounded-xl px-4 py-4 md:py-3 text-sm font-bold text-white placeholder:text-slate-600 focus:bg-white/10 transition-all shadow-inner pr-14"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-2 bottom-2 w-11 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-dark disabled:bg-slate-800 disabled:text-slate-600 transition-all shadow-lg active:scale-95 group-hover:scale-105"
          >
            <Send size={18} className={input.trim() ? "animate-pulse" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LevelBot;
