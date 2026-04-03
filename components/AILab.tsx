
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
  Send
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { HapticFeedback } from '../services/nativeAdapters';
import { audioService } from '../services/audio';
import { openrouterService } from '../services/openrouter';
import { AILabSession } from '../types';

// --- Sub-component: FeynmanChallenge ---
const FeynmanChallenge = ({ onBack, initialSession }: { onBack: () => void, initialSession?: AILabSession }) => {
  const [topic, setTopic] = useState(initialSession?.topic || '');
  const [isStarted, setIsStarted] = useState(!!initialSession);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>(initialSession?.messages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(initialSession?.id || `fey_${Date.now()}`);
  const { saveAILabSession, t, settings } = useStore();
  const lang = settings.language;

  const handleStart = () => {
    if (topic.trim()) {
      setIsStarted(true);
      const firstMsg = { role: 'assistant' as const, content: t('ailab.feynmanWelcome', { topic }) };
      const newMessages = [firstMsg];
      setMessages(newMessages);
      
      saveAILabSession({
        id: sessionId,
        type: 'feynman',
        topic,
        messages: newMessages,
        timestamp: new Date().toISOString()
      });
      
      HapticFeedback.success();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    const userMessageObj = { role: 'user' as const, content: userMsg };
    const newMessagesPostUser = [...messages, userMessageObj];
    setMessages(newMessagesPostUser);
    setLoading(true);
    HapticFeedback.selection();

    try {
      const response = await openrouterService.feynmanChat(userMsg, messages, topic);
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
    } catch (error) {
      console.error(error);
      const errorMsg = { role: 'assistant' as const, content: t('ailab.leoError') };
      setMessages([...newMessagesPostUser, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center gap-2 active:scale-95">
          <ArrowLeft size={20} /> <span className="hidden md:inline">{t('common.back')}</span>
        </button>
        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">{t('ailab.feynmanTitle')}</h2>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{t('ailab.feynmanSubtitle')}</p>
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
            <h3 className="text-xl md:text-2xl font-bold text-white">{t('ailab.topicLabel')}</h3>
            <p className="text-slate-500 text-sm">{t('ailab.topicDesc')}</p>
          </div>
          <div className="w-full max-w-md space-y-4">
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t('ailab.topicPlaceholder')} className="w-full p-5 bg-white/5 border-2 border-white/10 rounded-[1.5rem] text-white font-bold focus:border-blue-500 transition-all outline-none text-center" />
            <button onClick={handleStart} disabled={!topic.trim()} className="w-full p-5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:grayscale text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-glow-blue transition-all active:scale-95">{t('ailab.startBtn')}</button>
          </div>
        </motion.div>
      ) : (
        <div className="flex-1 flex flex-col bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 md:p-5 rounded-3xl text-sm md:text-base font-medium leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-lg' : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/5'}`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-white/5 p-4 rounded-3xl rounded-tl-none border border-white/5 flex gap-1"><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-blue-500 rounded-full" /><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-blue-500 rounded-full" /><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-blue-500 rounded-full" /></div></div>}
          </div>
          <div className="p-3 md:p-6 border-t border-white/5 bg-slate-900/80 backdrop-blur-xl">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 md:gap-3 items-center">
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder={t('ailab.inputPlaceholder')} 
                className="flex-1 p-3 md:p-5 bg-white/5 border border-white/10 rounded-2xl md:rounded-[1.5rem] text-white text-sm md:text-base outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium shadow-inner" 
              />
              <button 
                type="submit" 
                disabled={!input.trim() || loading} 
                className={`
                  h-12 w-12 md:h-14 md:w-14 flex items-center justify-center shrink-0
                  rounded-2xl md:rounded-[1.2rem] transition-all active:scale-90
                  ${input.trim() && !loading 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-glow-blue' 
                    : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed opacity-40'}
                `}
              >
                {loading ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} className="md:w-6 md:h-6" />}
              </button>
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
  hugo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Victor_Hugo_by_Etienne_Carjat_1876_-_full.jpg/800px-Victor_Hugo_by_Etienne_Carjat_1876_-_full.jpg',
  cleopatre: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Cleopatra_VII_Altes_Museum_Berlin.jpg/800px-Cleopatra_VII_Altes_Museum_Berlin.jpg',
  mandela: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Nelson_Mandela_1994.jpg/800px-Nelson_Mandela_1994.jpg',
  veil: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Simone_Veil_Pr%C3%A9sidente_du_Parlement_europ%C3%A9en.jpg/800px-Simone_Veil_Pr%C3%A9sidente_du_Parlement_europ%C3%A9en.jpg',
  pasteur: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Albert_Edelfelt_-_Louis_Pasteur_-_1885.jpg/800px-Albert_Edelfelt_-_Louis_Pasteur_-_1885.jpg',
  moliere: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Moliere_par_Mignard_2.jpg/800px-Moliere_par_Mignard_2.jpg',
  aristote: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Aristotle_Altemps_Inv8575.jpg/800px-Aristotle_Altemps_Inv8575.jpg',
  degaulle: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Charles_de_Gaulle-1961.jpg/800px-Charles_de_Gaulle-1961.jpg',
  jeannedarc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Joan_of_arc_miniature_graded.jpg/800px-Joan_of_arc_miniature_graded.jpg',
  newton: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/GodfreyKneller-IsaacNewton-1689.jpg/800px-GodfreyKneller-IsaacNewton-1689.jpg',
  rosaparks: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Rosa_Parks_1955.jpg/800px-Rosa_Parks_1955.jpg',
  galilee: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg/800px-Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg',
  mlk: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Martin_Luther_King%2C_Jr..jpg/800px-Martin_Luther_King%2C_Jr..jpg',
  claude_bernard: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Claude_Bernard_1870.jpg/800px-Claude_Bernard_1870.jpg',
  mozart: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Wolfgang-amadeus-mozart_1.jpg/800px-Wolfgang-amadeus-mozart_1.jpg'
};

const TimeMachine = ({ onBack, initialSession }: { onBack: () => void, initialSession?: AILabSession }) => {
  const { saveAILabSession, t } = useStore();
  
  const historicalFigures = React.useMemo(() => {
    const figures = t('historicalFigures') as any;
    if (typeof figures !== 'object') return [];
    
    return Object.keys(FIGURE_IMAGES).map(id => ({
      id,
      image: FIGURE_IMAGES[id],
      ...(figures[id] || {})
    }));
  }, [t]);

  const [selectedChar, setSelectedChar] = useState<any | null>(
    initialSession ? historicalFigures.find(f => f.name === initialSession.topic) || null : null
  );
  const [isTraveling, setIsTraveling] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>(initialSession?.messages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(initialSession?.id || `tm_${Date.now()}`);

  useEffect(() => {
    console.log("AILab Rendering Version 2.5 - Ultra High Contrast Loaded");
  }, []);

  const handleSelect = (char: any) => {
    HapticFeedback.success();
    audioService.playTimeTravel();
    setSelectedChar(char);
    setIsTraveling(true);
    
    setTimeout(() => {
      setIsTraveling(false);
      const firstMsg = { role: 'assistant' as const, content: t('ailab.tmWelcome', { name: char.name, era: char.era }) };
      const newMessages = [firstMsg];
      setMessages(newMessages);
      
      saveAILabSession({
        id: sessionId,
        type: 'history',
        topic: char.name,
        characterId: char.id,
        messages: newMessages,
        timestamp: new Date().toISOString()
      });
    }, 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !selectedChar) return;

    const userMsg = input.trim();
    setInput('');
    const userMessageObj = { role: 'user' as const, content: userMsg };
    const newMessagesPostUser = [...messages, userMessageObj];
    setMessages(newMessagesPostUser);
    setLoading(true);
    HapticFeedback.selection();

    try {
      const response = await openrouterService.historyChat(userMsg, messages, selectedChar.name, selectedChar.era);
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
    } catch (error) {
       setMessages([...newMessagesPostUser, { role: 'assistant' as const, content: "Le continuum espace-temps semble perturbé... Peux-tu reformuler ta question ?" }]);
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
    <div className="flex flex-col h-[calc(100vh-120px)] p-4 md:p-8 max-w-7xl mx-auto relative">
      {/* Dev Version Toggle */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-white/5 rounded text-[8px] text-white/20 uppercase tracking-widest font-black">V2.5 ULTRA-VISIBILITY</div>

      <div className="flex items-center justify-between mb-8">
        <button onClick={selectedChar && !initialSession ? () => { setSelectedChar(null); setMessages([]); } : onBack} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center gap-2 active:scale-95">
          <ArrowLeft size={20} /> <span className="hidden md:inline">{t('common.back')}</span>
        </button>
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">{t('ailab.timeMachineTitle')}</h2>
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest leading-loose">{selectedChar ? `${selectedChar.name} • ${selectedChar.era}` : t('ailab.timeMachineSubtitle')}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
          <History size={24} />
        </div>
      </div>

      {!selectedChar ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-y-auto pr-4 custom-scrollbar pb-20">
          {historicalFigures.map((char: any) => (
            <motion.div 
              key={char.id} 
              whileHover={{ scale: 1.05, y: -10 }} 
              whileTap={{ scale: 0.95 }} 
              onClick={() => handleSelect(char)} 
              className="relative group cursor-pointer flex flex-col bg-slate-900 border-2 border-white/5 hover:border-blue-500/50 rounded-[3rem] overflow-hidden shadow-2xl transition-all h-[550px]"
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

              {/* ULTRA-VISIBILITY INFO PANEL */}
              <div className="p-8 bg-slate-950 border-t border-white/10 flex flex-col items-center gap-6">
                <h4 className="font-display font-black text-white text-2xl md:text-3xl text-center leading-tight">
                  {char.name}
                </h4>
                
                {/* THE DATE BADGE - IMPOSSIBLE TO MISS */}
                <div className="w-full bg-yellow-400 p-4 rounded-[1.5rem] shadow-[0_0_40px_rgba(250,204,21,0.3)] flex flex-col items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                   <p className="text-slate-900 text-xl md:text-2xl font-black tracking-tighter uppercase">
                     {char.dates}
                   </p>
                   <div className="h-1 w-12 bg-slate-900/20 rounded-full mt-1" />
                </div>
                
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                  {char.era}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="flex-1 flex flex-col bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 md:p-5 rounded-3xl text-sm md:text-base font-medium leading-relaxed ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none shadow-lg shadow-purple-500/20' : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/5'}`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-white/5 p-4 rounded-3xl rounded-tl-none border border-white/5 flex gap-1"><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-purple-500 rounded-full" /><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-purple-500 rounded-full" /><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-purple-500 rounded-full" /></div></div>}
          </div>
          <div className="p-3 md:p-6 border-t border-white/5 bg-slate-900/80 backdrop-blur-xl">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 md:gap-3 items-center">
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder={t('ailab.inputPlaceholder')} 
                className="flex-1 p-3 md:p-5 bg-white/5 border border-white/10 rounded-2xl md:rounded-[1.5rem] text-white text-sm md:text-base outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all font-medium shadow-inner" 
              />
              <button 
                type="submit" 
                disabled={!input.trim() || loading} 
                className={`
                  h-12 w-12 md:h-14 md:w-14 flex items-center justify-center shrink-0
                  rounded-2xl md:rounded-[1.2rem] transition-all active:scale-90
                  ${input.trim() && !loading 
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-glow-purple' 
                    : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed opacity-40'}
                `}
              >
                {loading ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} className="md:w-6 md:h-6" />}
              </button>
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
  const { aiLabHistory, deleteAILabSession, t } = useStore();

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
    <div className="min-h-screen bg-transparent pb-32 md:pb-8">
      <AnimatePresence mode="wait">
        {activeView === 'hub' && (
          <motion.div key="hub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="p-6 md:p-12 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-500">
                  <FlaskRound size={24} />
                  <span className="font-black uppercase tracking-[0.2em] text-xs">{t('ailab.experimental')}</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-display font-black text-slate-900 dark:text-white tracking-tighter transition-colors">
                  {t('ailab.title')} <span className="text-primary italic">{t('ailab.titleAccent')}</span>
                </h1>
              </div>
              <button 
                onClick={() => handleSelect('history')}
                className="group flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-3xl text-white font-bold hover:bg-white/10 transition-all active:scale-95 shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <History size={20} />
                </div>
                {t('ailab.recentSessions')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* Feynman Card */}
              <motion.div whileHover={{ scale: 1.02, translateY: -10 }} whileTap={{ scale: 0.98 }} onClick={() => handleSelect('feynman')} className="relative group cursor-pointer overflow-hidden rounded-[3rem] md:rounded-[4rem] bg-gradient-to-br from-blue-600/20 via-blue-900/10 to-transparent border border-blue-500/20 p-8 md:p-12 shadow-2xl transition-all">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><GraduationCap size={150} /></div>
                <div className="relative z-10 space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-blue-500 flex items-center justify-center text-white shadow-glow-blue"><BrainCircuit size={32} /></div>
                  <div className="space-y-2"><h3 className="text-3xl md:text-4xl font-black text-white leading-none uppercase tracking-tighter">{t('ailab.feynmanTitle')}</h3><p className="text-blue-200/60 font-bold uppercase tracking-widest text-xs">{t('ailab.feynmanSubtitle')}</p></div>
                  <p className="text-slate-400 text-sm md:text-lg leading-relaxed font-medium">{t('ailab.feynmanDesc')}</p>
                  <div className="flex items-center gap-2 text-blue-400 font-black uppercase tracking-widest text-[10px]">{t('ailab.startChallenge')} <ChevronRight size={14} /></div>
                </div>
              </motion.div>

              {/* TimeMachine Card */}
              <motion.div whileHover={{ scale: 1.02, translateY: -10 }} whileTap={{ scale: 0.98 }} onClick={() => handleSelect('timemachine')} className="relative group cursor-pointer overflow-hidden rounded-[3rem] md:rounded-[4rem] bg-gradient-to-br from-purple-600/20 via-purple-900/10 to-transparent border border-purple-500/20 p-8 md:p-12 shadow-2xl transition-all">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Hourglass size={150} /></div>
                <div className="relative z-10 space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-purple-500 flex items-center justify-center text-white shadow-glow-purple"><History size={32} /></div>
                  <div className="space-y-2"><h3 className="text-3xl md:text-4xl font-black text-white leading-none uppercase tracking-tighter">{t('ailab.timeMachineTitle')}</h3><p className="text-purple-200/60 font-bold uppercase tracking-widest text-xs">{t('ailab.timeMachineSubtitle')}</p></div>
                  <p className="text-slate-400 text-sm md:text-lg leading-relaxed font-medium">{t('ailab.timeMachineDesc')}</p>
                  <div className="flex items-center gap-2 text-purple-400 font-black uppercase tracking-widest text-[10px]">{t('ailab.startChallenge')} <ChevronRight size={14} /></div>
                </div>
              </motion.div>
            </div>

            {/* Recent Sessions Quick Access */}
            {aiLabHistory.length > 0 && (
              <div className="space-y-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Sparkles size={16} /> {t('ailab.historyBtn')}
                </h4>
                <div className="flex gap-4 overflow-x-auto pb-4 pr-10 snap-x custom-scrollbar">
                  {aiLabHistory.slice(0, 5).map((session) => (
                    <motion.div 
                      key={session.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleResume(session)}
                      className="flex-shrink-0 w-64 snap-start p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:border-primary/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${session.type === 'feynman' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                          {session.type === 'feynman' ? <BrainCircuit size={20} /> : <Hourglass size={20} />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(session.timestamp).toLocaleDateString()}</span>
                      </div>
                      <h5 className="text-white font-bold truncate mb-2">{session.topic}</h5>
                      <p className="text-slate-500 text-xs line-clamp-2 mb-4">
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
              <button onClick={() => setActiveView('hub')} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center gap-2 active:scale-95">
                <ArrowLeft size={20} /> {t('common.back')}
              </button>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{t('ailab.recentSessions')}</h2>
            </div>

            <div className="space-y-4">
              {aiLabHistory.length === 0 ? (
                <div className="p-12 text-center space-y-4 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-600">
                    <MessageSquare size={40} />
                  </div>
                  <p className="text-slate-500 font-medium">{t('ailab.noHistory')}</p>
                  <button onClick={() => setActiveView('hub')} className="px-6 py-3 bg-primary text-white rounded-full font-bold">{t('ailab.startChallenge')}</button>
                </div>
              ) : (
                aiLabHistory.map((session) => (
                  <motion.div 
                    key={session.id}
                    layoutId={session.id}
                    onClick={() => handleResume(session)}
                    className="p-6 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center gap-6 group"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl ${session.type === 'feynman' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                      {session.type === 'feynman' ? <BrainCircuit size={28} /> : <Hourglass size={28} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-white font-black uppercase tracking-tight text-lg truncate">{session.topic}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${session.type === 'feynman' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                          {session.type === 'feynman' ? 'Feynman' : 'Temps'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm truncate">{session.messages[session.messages.length - 1]?.content}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-slate-600 uppercase hidden md:block">
                        {new Date(session.timestamp).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="p-3 text-slate-600 hover:text-red-500 bg-white/0 hover:bg-red-500/10 rounded-xl transition-all scale-0 group-hover:scale-100"
                      >
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight size={24} className="text-slate-700 group-hover:text-primary transition-colors" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeView === 'feynman' && (
          <motion.div key="feynman" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}>
            <FeynmanChallenge onBack={() => setActiveView('hub')} initialSession={selectedSession} />
          </motion.div>
        )}

        {activeView === 'timemachine' && (
          <motion.div key="timemachine" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}>
            <TimeMachine onBack={() => setActiveView('hub')} initialSession={selectedSession} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
