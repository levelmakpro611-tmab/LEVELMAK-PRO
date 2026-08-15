
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FlaskRound, 
  BrainCircuit, 
  History, 
  ArrowLeft, 
  Sparkles, 
  GraduationCap, 
  Hourglass,
  Zap,
  ChevronRight,
  Trash2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Activity,
  Layers,
  Camera,
  Image as ImageIcon,
  X,
  Loader2
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { HapticFeedback } from '../services/nativeAdapters';
import { audioService } from '../services/audio';
import { aiService } from '../services/aiService';
import { AILabSession } from '../types';
import { checkMessageQuota, checkPhotoQuota, incrementMessageUsage, incrementPhotoUsage, isFeatureAllowedForGrade } from '../services/aiQuotaService';

// --- AILab Inline Formatter to support Bold & Italics adaptively ---
const formatAILabInline = (text: string, theme: 'light' | 'dark' = 'dark') => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong 
          key={`part-${i}`} 
          className={`font-black underline-offset-2 ${
            theme === 'light' 
              ? 'text-slate-950 decoration-slate-950/50' 
              : 'text-white decoration-primary/50'
          }`}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em 
          key={`part-${i}`} 
          className={`italic ${
            theme === 'light' ? 'text-slate-600' : 'text-slate-300'
          }`}
        >
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

// --- AILab Message Formatter for Historical Figures ---
const AILabMessageFormatter: React.FC<{ 
  text: string; 
  role: 'user' | 'assistant'; 
  theme?: 'light' | 'dark' 
}> = ({ text, role, theme = 'dark' }) => {
  if (role === 'user') {
    return (
      <div className={`text-sm font-medium leading-relaxed whitespace-pre-wrap ${
        theme === 'light' ? 'text-slate-800' : 'text-white'
      }`}>
        {text}
      </div>
    );
  }

  // Regex to extract scenario in parentheses at the start of the message
  const match = text.match(/^\(([^)]+)\)\s*([\s\S]*)/);
  if (match) {
    const scenario = match[1];
    const dialogue = match[2];
    const dialogueLines = dialogue.split('\n').filter(line => !line.trim().match(/^[-=]{3,}$/));
    
    return (
      <div className="space-y-3">
        {/* Scenario/Mise en scène Block without icon 🎬 */}
        <div className="bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 text-xs italic text-slate-800 dark:text-white shadow-inner">
          <span className="leading-relaxed font-black">({scenario})</span>
        </div>
        {/* Dialogue with adaptive color and bold formatting */}
        {dialogue.trim() && (
          <div className={`font-semibold text-sm tracking-wide leading-relaxed pl-1 space-y-2 ${
            theme === 'light' 
              ? 'text-slate-800 drop-shadow-sm' 
              : 'text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
          }`}>
            {dialogueLines.map((line, idx) => {
              if (line.trim() === '') return <div key={`dline-${idx}`} className="h-2" />;
              return <p key={`dline-${idx}`}>{formatAILabInline(line, theme === 'light' ? 'light' : 'dark')}</p>;
            })}
          </div>
        )}
      </div>
    );
  }

  const lines = text.split('\n').filter(line => !line.trim().match(/^[-=]{3,}$/));
  return (
    <div className={`text-sm font-medium leading-relaxed space-y-2 ${
      theme === 'light' ? 'text-slate-800' : 'text-slate-200'
    }`}>
      {lines.map((line, idx) => {
        if (line.trim() === '') return <div key={`line-${idx}`} className="h-2" />;
        return <p key={`line-${idx}`}>{formatAILabInline(line, theme === 'light' ? 'light' : 'dark')}</p>;
      })}
    </div>
  );
};

// --- Sub-component: FeynmanChallenge ---
const FeynmanChallenge = ({ onBack, initialSession }: { onBack: () => void, initialSession?: AILabSession }) => {
  const [topic, setTopic] = useState(initialSession?.topic || '');
  const [isStarted, setIsStarted] = useState(!!initialSession);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>(initialSession?.messages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(initialSession?.id || `fey_${Date.now()}`);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { saveAILabSession, t, settings, user } = useStore();
  const lang = settings.language;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isStarted]);

  useEffect(() => {
    if (isStarted && messages.length === 0 && topic) {
      const welcome = { role: 'assistant' as const, content: t('ailab.feynmanWelcome', { topic }) };
      setMessages([welcome]);
    }
  }, [isStarted, messages.length, topic]);

  const handleStart = () => {
    if (topic.trim()) {
      setIsStarted(true);
      // Messages will be initialized by useEffect
      HapticFeedback.success();
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    // Check message quota
    const msgQuota = checkMessageQuota(user);
    if (!msgQuota.allowed) {
      alert(msgQuota.message);
      return;
    }

    if (selectedImage) {
      const imgQuota = checkPhotoQuota(user);
      if (!imgQuota.allowed) {
        alert(imgQuota.message);
        return;
      }
      incrementPhotoUsage(user);
    }
    incrementMessageUsage(user);

    const userMsg = input.trim();
    const currentImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    
    const userMessageObj = { role: 'user' as const, content: userMsg || "Analyse de l'image" };
    const newMessagesPostUser = [...messages, userMessageObj];
    setMessages(newMessagesPostUser);
    setLoading(true);
    HapticFeedback.selection();

    try {
      const currentLang = settings?.language || 'fr';
      const response = await aiService.feynmanChat(userMsg, messages, topic, currentLang, currentImage || undefined);
      const assistantMessageObj = { role: 'assistant' as const, content: response };
      const finalMessages = [...newMessagesPostUser, assistantMessageObj];
      setMessages(finalMessages);
      
      saveAILabSession({
        id: sessionId,
        type: 'feynman',
        topic,
        messages: finalMessages,
        timestamp: new Date().toISOString()
      });
      
      HapticFeedback.success();
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "Erreur de connexion";
      const errorMsg = { role: 'assistant' as const, content: `${t('ailab.leoError')}\n\n(Détails : ${errorMessage})` };
      setMessages([...newMessagesPostUser, errorMsg]);
      HapticFeedback.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="p-3 bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all flex items-center gap-2 active:scale-95 shadow-sm">
          <ArrowLeft size={20} /> <span className="hidden md:inline">{t('common.back')}</span>
        </button>
        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('ailab.feynmanTitle')}</h2>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest">{t('ailab.feynmanSubtitle')}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
          <BrainCircuit size={24} />
        </div>
      </div>

      {!isStarted ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center space-y-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-2xl relative z-10">
              <GraduationCap size={48} />
            </div>
          </div>
          <div className="text-center space-y-3 max-w-sm">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{t('ailab.topicLabel')}</h3>
            <p className="text-slate-800 dark:text-slate-300 font-semibold text-sm">{t('ailab.topicDesc')}</p>
          </div>
          <div className="w-full max-w-md space-y-4">
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t('ailab.topicPlaceholder')} className="w-full p-5 bg-white/90 dark:bg-white/5 border-2 border-slate-300/80 dark:border-white/10 rounded-[1.5rem] text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 font-bold focus:border-blue-500 transition-all outline-none text-center shadow-inner" />
            <button onClick={handleStart} disabled={!topic.trim()} className="w-full p-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-glow-blue transition-all active:scale-95">{t('ailab.startBtn')}</button>
          </div>
        </motion.div>
      ) : (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200/80 dark:border-white/5 overflow-hidden shadow-xl">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <div className="min-h-full flex flex-col justify-end space-y-6">
              {messages.map((msg, i) => (
                <motion.div key={`${msg.role}-${i}`} initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 md:p-5 rounded-3xl text-sm md:text-base font-semibold leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-lg' : 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-slate-200 rounded-tl-none border border-slate-200/80 dark:border-white/5 shadow-sm'}`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-slate-100 dark:bg-white/5 p-4 rounded-3xl rounded-tl-none border border-slate-200/80 dark:border-white/5 flex gap-1"><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-blue-500 rounded-full" /><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-blue-500 rounded-full" /><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-blue-500 rounded-full" /></div></div>}
            </div>
          </div>
          <div className="p-3 md:p-6 border-t border-slate-200/80 dark:border-white/5 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl pb-[calc(env(safe-area-inset-bottom,1.5rem)+1.5rem)] md:pb-6">
            {selectedImage && (
              <div className="mb-3 animate-fade-in">
                <div className="relative inline-block mb-2">
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-xl border border-white/20 shadow-lg" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center border border-white/20 hover:bg-slate-700 shadow-xl transition-colors">
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-2 md:gap-3 group">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setSelectedImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
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
                  className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-blue-600/20 hover:bg-blue-600/40 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl md:rounded-2xl flex items-center justify-center transition-all border border-blue-500/30"
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
                  className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-slate-200/80 dark:bg-white/5 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white rounded-xl md:rounded-2xl flex items-center justify-center transition-all border border-slate-300/80 dark:border-white/5"
                >
                  <ImageIcon size={20} className="md:w-5 md:h-5" />
                </button>
              </div>
              <div className="relative flex-1 h-12 md:h-14">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('ailab.inputPlaceholder')}
                  className="w-full h-full bg-slate-100 dark:bg-white/5 border border-slate-300/80 dark:border-white/10 outline-none rounded-xl md:rounded-2xl px-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-white/10 transition-all shadow-inner pr-12 md:pr-14"
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && !selectedImage) || loading}
                  className={`
                    absolute right-1.5 top-1.5 bottom-1.5 
                    w-10 md:w-12 flex items-center justify-center 
                    rounded-xl md:rounded-xl shadow-lg border transition-all active:scale-95 group-hover:scale-105
                    ${(input.trim() || selectedImage) && !loading
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-500/20 shadow-glow-blue'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-500 border-slate-300/80 dark:border-white/5 cursor-not-allowed opacity-50'}
                  `}
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={18} className={((input.trim() || selectedImage) && !loading) ? "animate-pulse" : ""} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-component: TimeMachine ---
const FIGURE_IMAGES: Record<string, string> = {
  napoleon: '/portraits/napoleon.png',
  curie: '/portraits/curie.png',
  socrate: '/portraits/socrate.png',
  einstein: '/portraits/einstein.png',
  davinci: '/portraits/davinci.png',
  hugo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Victor_Hugo_by_Etienne_Carjat_1876_-_full.jpg/400px-Victor_Hugo_by_Etienne_Carjat_1876_-_full.jpg',
  cleopatre: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Cleopatra_VII_Altes_Museum_Berlin.jpg/400px-Cleopatra_VII_Altes_Museum_Berlin.jpg',
  mandela: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Nelson_Mandela_1994.jpg/400px-Nelson_Mandela_1994.jpg',
  veil: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Simone_Veil_Pr%C3%A9sidente_du_Parlement_europ%C3%A9en.jpg/400px-Simone_Veil_Pr%C3%A9sidente_du_Parlement_europ%C3%A9en.jpg',
  pasteur: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Albert_Edelfelt_-_Louis_Pasteur_-_1885.jpg/400px-Albert_Edelfelt_-_Louis_Pasteur_-_1885.jpg',
  moliere: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Moliere_par_Mignard_2.jpg/400px-Moliere_par_Mignard_2.jpg',
  aristote: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Aristotle_Altemps_Inv8575.jpg/400px-Aristotle_Altemps_Inv8575.jpg',
  degaulle: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Charles_de_Gaulle-1961.jpg/400px-Charles_de_Gaulle-1961.jpg',
  jeannedarc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Joan_of_arc_miniature_graded.jpg/400px-Joan_of_arc_miniature_graded.jpg',
  newton: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/GodfreyKneller-IsaacNewton-1689.jpg/400px-GodfreyKneller-IsaacNewton-1689.jpg',
  rosaparks: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Rosa_Parks_1955.jpg/400px-Rosa_Parks_1955.jpg',
  galilee: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg/400px-Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg',
  mlk: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Martin_Luther_King%2C_Jr..jpg/400px-Martin_Luther_King%2C_Jr..jpg',
  claude_bernard: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Claude_Bernard_1870.jpg/400px-Claude_Bernard_1870.jpg',
  mozart: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Wolfgang-amadeus-mozart_1.jpg/400px-Wolfgang-amadeus-mozart_1.jpg',
  tesla: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/N.Tesla.JPG/400px-N.Tesla.JPG',
  gandhi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Mahatma-Gandhi%2C_studio%2C_1931.jpg/400px-Mahatma-Gandhi%2C_studio%2C_1931.jpg',
  lovelace: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Ada_Lovelace_portrait.jpg/400px-Ada_Lovelace_portrait.jpg',
  hawking: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Stephen_Hawking.StarChild.jpg/400px-Stephen_Hawking.StarChild.jpg',
  kahlo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg/400px-Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg',
  belfort: '',
  kiyosaki: '',
  trump: '',
  buffett: '',
  vex_king: '',
  musk: '',
  bezos: ''
};

const TimeMachine = ({ onBack, initialSession }: { onBack: () => void, initialSession?: AILabSession }) => {
  const { saveAILabSession, t, settings, user } = useStore();
  
  const historicalFigures = React.useMemo(() => {
    const figures = t('historicalFigures') as any;
    if (typeof figures !== 'object') return [];
    
    return Object.keys(FIGURE_IMAGES).map(id => {
      const charData = figures[id] || {};
      let name = charData.name || id;
      
      // Mask living authors' names and use initials
      const livingIds = ['musk', 'bezos', 'trump', 'buffett', 'vex_king', 'kiyosaki', 'belfort'];
      if (livingIds.includes(id)) {
        if (id === 'musk') name = "E. Muskes (LM)";
        else if (id === 'bezos') name = "J. Bezoses";
        else if (id === 'trump') name = "D. Trumpes";
        else if (id === 'buffett') name = "W. Buffettes";
        else if (id === 'vex_king') name = "V. Kinges";
        else if (id === 'kiyosaki') name = "R. Kiyosakies";
        else if (id === 'belfort') name = "J. Belfortes";
      }

      return {
        id,
        image: FIGURE_IMAGES[id] || `https://ui-avatars.com/api/?name=${name.split(' ')[0]}&background=1e293b&color=fff&size=512&bold=true`,
        ...charData,
        name // Override name with masked version
      };
    });
  }, [t]);

  const [selectedChar, setSelectedChar] = useState<any | null>(
    initialSession ? historicalFigures.find(f => f.name === initialSession.topic) || null : null
  );
  const [isTraveling, setIsTraveling] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>(initialSession?.messages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(initialSession?.id || `tm_${Date.now()}`);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, selectedChar]);

    useEffect(() => {
      if (selectedChar && messages.length === 0 && !isTraveling) {
        const welcomeText = `(${selectedChar.name} apparaît majestueusement devant toi dans une lueur temporelle...) Bonjour, jeune voyageur du temps ! Je suis ${selectedChar.name}, ${selectedChar.role} de l'époque ${selectedChar.era}. De quoi souhaites-tu que nous discutions aujourd'hui ?`;
        const welcome = { 
          role: 'assistant' as const, 
          content: welcomeText
        };
        const newMessages = [welcome];
        setMessages(newMessages);
        
        saveAILabSession({
          id: sessionId,
          type: 'history',
          topic: selectedChar.name,
          characterId: selectedChar.id,
          messages: newMessages,
          timestamp: new Date().toISOString()
        });
      }
    }, [selectedChar, messages.length, isTraveling, sessionId]);

    const handleSelect = (char: any) => {
      HapticFeedback.success();
      audioService.playTimeTravel();
      setSelectedChar(char);
      setSessionId(`tm_${Date.now()}`); // Génère un nouvel ID de session unique
      setMessages([]); // Réinitialise les messages pour déclencher le message d'accueil
      setIsTraveling(true);
      
      setTimeout(() => {
        setIsTraveling(false);
      }, 2000);
    };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || loading || !selectedChar) return;

    // Check message quota
    const msgQuota = checkMessageQuota(user);
    if (!msgQuota.allowed) {
      alert(msgQuota.message);
      return;
    }

    if (selectedImage) {
      const imgQuota = checkPhotoQuota(user);
      if (!imgQuota.allowed) {
        alert(imgQuota.message);
        return;
      }
      incrementPhotoUsage(user);
    }
    incrementMessageUsage(user);

    const userMsg = input.trim();
    const currentImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    
    const userMessageObj = { role: 'user' as const, content: userMsg || "Vision temporelle" };
    const newMessagesPostUser = [...messages, userMessageObj];
    setMessages(newMessagesPostUser);
    setLoading(true);
    HapticFeedback.selection();

    try {
      const currentLang = settings?.language || 'fr';
      const charName = selectedChar.name || "Inconnu";
      const charEra = selectedChar.era || "Époque inconnue";
      const charDates = selectedChar.dates || "";
      const charBio = selectedChar.bio || "";
      
      const response = await aiService.historyChat(userMsg, messages, charName, charEra, charDates, charBio, currentLang, currentImage || undefined);
      const assistantMessageObj = { role: 'assistant' as const, content: response };
      const finalMessages = [...newMessagesPostUser, assistantMessageObj];
      setMessages(finalMessages);
      
      saveAILabSession({
        id: sessionId,
        type: 'history',
        topic: selectedChar.name,
        characterId: selectedChar.id,
        messages: finalMessages,
        timestamp: new Date().toISOString()
      });
      
      HapticFeedback.success();
    } catch (error: any) {
      console.error('AI Lab Error:', error);
      const errorMessage = error.message || "Erreur de connexion";
      setMessages([...newMessagesPostUser, { 
        role: 'assistant' as const, 
        content: `${t('ailab.tmError')}\n\n(Détails : ${errorMessage})`
      }]);
      HapticFeedback.error();
    } finally {
      setLoading(false);
    }
  };

  if (isTraveling) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center overflow-hidden">
        <motion.div animate={{ rotate: [0, 360, 720, 1080], scale: [1, 1.5, 0.5, 2, 0], filter: ["blur(0px)", "blur(10px)", "blur(20px)", "blur(0px)"] }} transition={{ duration: 2, ease: "easeInOut" }} className="w-[150vw] h-[150vw] bg-gradient-to-tr from-blue-600 via-purple-600 to-transparent rounded-full flex items-center justify-center"><div className="w-1/2 h-1/2 bg-black rounded-full blur-3xl" /></motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2 }} className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4"><Hourglass size={64} className="text-white animate-spin" /><h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{t('ailab.traveling')}</h2></motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 md:p-8 max-w-7xl mx-auto relative overflow-hidden">


      <div className="flex items-center justify-between mb-8">
        <button onClick={selectedChar && !initialSession ? () => { setSelectedChar(null); setMessages([]); } : onBack} className="p-3 bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all flex items-center gap-2 active:scale-95 shadow-sm">
          <ArrowLeft size={20} /> <span className="hidden md:inline">{t('common.back')}</span>
        </button>
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('ailab.timeMachineTitle')}</h2>
          <p className="text-[10px] text-purple-700 dark:text-purple-400 font-black uppercase tracking-widest leading-loose">{selectedChar ? `${selectedChar.name} • ${selectedChar.era}` : t('ailab.timeMachineSubtitle')}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
          <History size={24} />
        </div>
      </div>

      {!selectedChar ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-20">
          {historicalFigures.map((char: any) => (
            <motion.div 
              key={char.id} 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              onClick={() => handleSelect(char)} 
              className="relative group cursor-pointer flex flex-col bg-white/80 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 hover:border-blue-500/50 rounded-3xl overflow-hidden shadow-xl transition-all h-[280px]"
            >
              {/* Image Section (Giant) */}
              <div className="relative flex-1 overflow-hidden">
                <img 
                  src={char.image} 
                  alt={char.name} 
                  className="w-full h-full object-cover object-top scale-110 group-hover:scale-125 transition-transform duration-1000" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${char.name}&background=1e293b&color=fff&size=512`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                
                {/* Floating Badge Role - Moved to bottom-left to clear the face */}
                <div className="absolute bottom-6 left-6">
                  <div className="px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    {char.role}
                  </div>
                </div>
              </div>

              {/* Info Panel */}
              <div className="p-4 bg-white/90 dark:bg-slate-950 border-t border-slate-200/80 dark:border-white/5 flex flex-col items-center gap-2">
                <h4 className="font-display font-black text-slate-900 dark:text-white text-sm text-center leading-tight truncate w-full">
                  {char.name}
                </h4>
                
                <div className="w-full bg-blue-500 py-1.5 rounded-xl shadow-lg flex flex-col items-center justify-center">
                   <p className="text-white text-[10px] font-black tracking-tight uppercase">
                     {char.dates}
                   </p>
                </div>
                
                <p className="text-[8px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest truncate w-full text-center">
                  {char.era}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="flex-1 flex flex-col bg-white/80 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200/80 dark:border-white/5 overflow-hidden shadow-xl">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <div className="min-h-full flex flex-col justify-end space-y-6">
              {messages.map((msg, i) => (
                <motion.div key={`${msg.role}-${i}`} initial={{ opacity: 0, x: msg.role === 'assistant' ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/20 flex items-center justify-center mr-3 mt-1 shrink-0">
                      <Sparkles size={14} className="text-purple-400" />
                    </div>
                  )}
                  <div className={`
                    max-w-[85%] p-4 rounded-2xl text-sm font-semibold leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-tr-none shadow-lg shadow-purple-900/20'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-slate-200 border border-slate-200/80 dark:border-white/5 rounded-tl-none shadow-sm'}
                  `}>
                    <AILabMessageFormatter text={msg.content} role={msg.role} theme={settings.theme} />
                  </div>
                </motion.div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-slate-100 dark:bg-white/5 p-4 rounded-3xl rounded-tl-none border border-slate-200/80 dark:border-white/5 flex gap-1"><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-purple-500 rounded-full" /><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-purple-500 rounded-full" /><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-purple-500 rounded-full" /></div></div>}
            </div>
          </div>
          <div className="p-4 md:p-6 bg-white/90 dark:bg-slate-950 border-t border-slate-200/80 dark:border-white/10 shrink-0 pb-[calc(env(safe-area-inset-bottom,1.5rem)+1.5rem)] md:pb-6">
            {selectedImage && (
              <div className="mb-3 animate-fade-in">
                <div className="relative inline-block mb-2">
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-xl border border-white/20 shadow-lg" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center border border-white/20 hover:bg-slate-700 shadow-xl transition-colors">
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-2 md:gap-3 group">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setSelectedImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
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
                  className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-blue-600/20 hover:bg-blue-600/40 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl md:rounded-2xl flex items-center justify-center transition-all border border-blue-500/30"
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
                  className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-slate-200/80 dark:bg-white/5 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white rounded-xl md:rounded-2xl flex items-center justify-center transition-all border border-slate-300/80 dark:border-white/5"
                >
                  <ImageIcon size={20} className="md:w-5 md:h-5" />
                </button>
              </div>
              <div className="relative flex-1 h-12 md:h-14">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('ailab.inputPlaceholder')}
                  className="w-full h-full bg-slate-100 dark:bg-white/5 border border-slate-300/80 dark:border-white/10 outline-none rounded-xl md:rounded-2xl px-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-white/10 transition-all shadow-inner pr-12 md:pr-14"
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && !selectedImage) || loading}
                  className={`
                    absolute right-1.5 top-1.5 bottom-1.5 
                    w-10 md:w-12 flex items-center justify-center 
                    rounded-xl md:rounded-xl shadow-lg border transition-all active:scale-95 group-hover:scale-105
                    ${(input.trim() || selectedImage) && !loading
                      ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-500/20 shadow-glow-purple'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-500 border-slate-300/80 dark:border-white/5 cursor-not-allowed opacity-50'}
                  `}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} className={((input.trim() || selectedImage) && !loading) ? "animate-pulse" : ""} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Component: AILab ---
export const AILab: React.FC = () => {
  const [activeView, setActiveView] = useState<'hub' | 'feynman' | 'timemachine' | 'history'>('hub');
  const [selectedSession, setSelectedSession] = useState<AILabSession | undefined>(undefined);
  const { aiLabHistory, deleteAILabSession, t, user, setAiLabHistory } = useStore();

  // Ephemeral AI Lab history cleanup for non-premium users on unmount
  // Strict check: requires is_premium=true AND valid non-expired premium_until
  const isPremiumActive = !!(user && user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > Date.now());
  useEffect(() => {
    return () => {
      if (!isPremiumActive) {
        setAiLabHistory([]);
        const labKey = user?.id ? `levelmak_${user.id}_ailab_history` : 'levelmak_ailab_history';
        localStorage.removeItem(labKey);
      }
    };
  }, [isPremiumActive, user?.id, setAiLabHistory]);

  const handleSelect = (view: 'feynman' | 'timemachine' | 'history') => {
    HapticFeedback.success();
    setActiveView(view);
    setSelectedSession(undefined);
  };

  const handleResume = (session: AILabSession) => {
    HapticFeedback.success();
    setSelectedSession(session);
    setActiveView(session.type === 'feynman' ? 'feynman' : 'timemachine');
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    HapticFeedback.warning();
    deleteAILabSession(id);
  };

  return (
    <div className="min-h-screen bg-transparent pb-32 md:pb-8 pt-[env(safe-area-inset-top,1rem)]">
      <AnimatePresence mode="wait">
        {activeView === 'hub' && (
          <motion.div key="hub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="p-6 md:p-12 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-display font-black text-slate-900 dark:text-white tracking-tighter transition-colors">
                  {t('ailab.title')} <span className="text-primary italic">{t('ailab.titleAccent')}</span>
                </h1>
              </div>
              <button 
                onClick={() => handleSelect('history')}
                className="group flex items-center gap-3 px-6 py-4 bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-3xl text-slate-800 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-95 shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <History size={20} />
                </div>
                {t('ailab.recentSessions')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* Feynman Card */}
              <motion.div whileHover={{ scale: 1.02, translateY: -10 }} whileTap={{ scale: 0.98 }} onClick={() => handleSelect('feynman')} className="relative group cursor-pointer overflow-hidden rounded-[3rem] md:rounded-[4rem] bg-gradient-to-br from-blue-500/10 via-blue-900/5 to-white/80 dark:from-blue-600/20 dark:via-blue-900/10 dark:to-transparent border border-blue-500/30 dark:border-blue-500/20 p-8 md:p-12 shadow-2xl transition-all">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><GraduationCap size={150} /></div>
                <div className="relative z-10 space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-blue-500 flex items-center justify-center text-white shadow-glow-blue"><BrainCircuit size={32} /></div>
                  <div className="space-y-2"><h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-none uppercase tracking-tighter">{t('ailab.feynmanTitle')}</h3><p className="text-blue-800 dark:text-blue-200/80 font-bold uppercase tracking-widest text-xs">{t('ailab.feynmanSubtitle')}</p></div>
                  <p className="text-slate-800 dark:text-slate-300 text-sm md:text-lg leading-relaxed font-semibold">{t('ailab.feynmanDesc')}</p>
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest text-[10px]">{t('ailab.startChallenge')} <ChevronRight size={14} /></div>
                </div>
              </motion.div>

              {/* TimeMachine Card */}
              {isFeatureAllowedForGrade('timeMachine', user?.gradeClass) ? (
                <motion.div whileHover={{ scale: 1.02, translateY: -10 }} whileTap={{ scale: 0.98 }} onClick={() => handleSelect('timemachine')} className="relative group cursor-pointer overflow-hidden rounded-[3rem] md:rounded-[4rem] bg-gradient-to-br from-purple-500/10 via-purple-900/5 to-white/80 dark:from-purple-600/20 dark:via-purple-900/10 dark:to-transparent border border-purple-500/30 dark:border-purple-500/20 p-8 md:p-12 shadow-2xl transition-all">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Hourglass size={150} /></div>
                  <div className="relative z-10 space-y-6">
                    <div className="w-16 h-16 rounded-3xl bg-purple-500 flex items-center justify-center text-white shadow-glow-purple"><History size={32} /></div>
                    <div className="space-y-2"><h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-none uppercase tracking-tighter">{t('ailab.timeMachineTitle')}</h3><p className="text-purple-800 dark:text-purple-200/80 font-bold uppercase tracking-widest text-xs">{t('ailab.timeMachineSubtitle')}</p></div>
                    <p className="text-slate-800 dark:text-slate-300 text-sm md:text-lg leading-relaxed font-semibold">{t('ailab.timeMachineDesc')}</p>
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black uppercase tracking-widest text-[10px]">{t('ailab.startChallenge')} <ChevronRight size={14} /></div>
                  </div>
                </motion.div>
              ) : (
                <div className="relative overflow-hidden rounded-[3rem] md:rounded-[4rem] bg-slate-900/40 border border-white/5 p-8 md:p-12 shadow-xl opacity-60">
                  <div className="relative z-10 space-y-6">
                    <div className="w-16 h-16 rounded-3xl bg-slate-800 flex items-center justify-center text-slate-500"><History size={32} /></div>
                    <div className="space-y-2">
                      <h3 className="text-3xl md:text-4xl font-black text-slate-400 leading-none uppercase tracking-tighter">{t('ailab.timeMachineTitle')}</h3>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Réservé aux lycéens & étudiants</p>
                    </div>
                    <p className="text-slate-500 text-sm md:text-base leading-relaxed font-medium">La Machine Temporelle est débloquée à partir de la 10ème année.</p>
                    <div className="inline-block px-4 py-2 bg-slate-800 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Niveau actuel : {user?.gradeClass || '1ère-9ème'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Sessions Quick Access */}
            {aiLabHistory.length > 0 && (
              <div className="space-y-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-400">
                  {t('ailab.historyBtn')}
                </h4>
                <div className="flex gap-4 overflow-x-auto pb-4 pr-10 snap-x custom-scrollbar">
                  {aiLabHistory.slice(0, 5).map((session) => (
                    <motion.div 
                      key={session.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleResume(session)}
                      className="flex-shrink-0 w-64 snap-start p-6 rounded-[2rem] bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-primary/50 shadow-lg transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${session.type === 'feynman' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                          {session.type === 'feynman' ? <BrainCircuit size={20} /> : <Hourglass size={20} />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase">{new Date(session.timestamp).toLocaleDateString()}</span>
                      </div>
                      <h5 className="text-slate-900 dark:text-white font-bold truncate mb-2">{session.topic}</h5>
                      <p className="text-slate-700 dark:text-slate-300 text-xs font-medium line-clamp-2 mb-4">
                        {session.messages[session.messages.length - 1]?.content || t('ailab.noMessages')}
                      </p>
                      <button 
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeView === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 md:p-12 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <button onClick={() => setActiveView('hub')} className="p-3 bg-slate-200/80 dark:bg-white/5 border border-slate-300/80 dark:border-white/10 rounded-2xl text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-all flex items-center gap-2 active:scale-95">
                <ArrowLeft size={20} /> {t('common.back')}
              </button>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('ailab.recentSessions')}</h2>
            </div>

            <div className="space-y-4">
              {aiLabHistory.length === 0 ? (
                <div className="p-12 text-center space-y-4 bg-white/80 dark:bg-white/5 rounded-[3rem] border border-dashed border-slate-300 dark:border-white/10 shadow-lg">
                  <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto text-slate-600">
                    <MessageSquare size={40} />
                  </div>
                  <p className="text-slate-700 dark:text-slate-400 font-bold">{t('ailab.noHistory')}</p>
                  <button onClick={() => setActiveView('hub')} className="px-6 py-3 bg-primary text-white rounded-full font-bold shadow-lg">{t('ailab.startChallenge')}</button>
                </div>
              ) : (
                aiLabHistory.map((session) => (
                  <motion.div 
                    key={session.id}
                    layoutId={session.id}
                    onClick={() => handleResume(session)}
                    className="p-6 rounded-[2.5rem] bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 hover:border-primary/40 shadow-lg transition-all cursor-pointer flex items-center gap-6 group"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl ${session.type === 'feynman' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                      {session.type === 'feynman' ? <BrainCircuit size={28} /> : <Hourglass size={28} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-slate-900 dark:text-white font-black uppercase tracking-tight text-lg truncate">{session.topic}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${session.type === 'feynman' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'}`}>
                          {session.type === 'feynman' ? 'Feynman' : 'Temps'}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-sm font-medium truncate">{session.messages[session.messages.length - 1]?.content}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase hidden md:block">
                        {new Date(session.timestamp).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="p-3 text-slate-500 hover:text-red-500 bg-slate-100/50 dark:bg-white/0 hover:bg-red-500/10 rounded-xl transition-all scale-0 group-hover:scale-100"
                      >
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight size={24} className="text-slate-400 dark:text-slate-700 group-hover:text-primary transition-colors" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeView === 'feynman' && (
          <motion.div key="feynman" className="fixed inset-0 z-[2000] bg-slate-50 dark:bg-slate-950 flex flex-col pt-[env(safe-area-inset-top,1.5rem)] pb-[env(safe-area-inset-bottom,1.5rem)]" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }}>
            <FeynmanChallenge onBack={() => setActiveView('hub')} initialSession={selectedSession} />
          </motion.div>
        )}

        {activeView === 'timemachine' && (
          <motion.div key="timemachine" className="fixed inset-0 z-[2000] bg-slate-50 dark:bg-slate-950 flex flex-col pt-[env(safe-area-inset-top,1.5rem)] pb-[env(safe-area-inset-bottom,1.5rem)]" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }}>
            <TimeMachine onBack={() => setActiveView('hub')} initialSession={selectedSession} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
