
import React, { useState, useEffect } from 'react';
import {
    PenTool,
    Sparkles,
    BookOpen,
    Globe,
    Lock,
    Save,
    Trash2,
    Send,
    Zap,
    Clock,
    ChevronRight,
    Eye,
    Type,
    Layout,
    MessageSquare,
    Heart,
    X,
    Loader2,
    FlaskConical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import { geminiService } from '../services/gemini';
import { Story } from '../types';

const CATEGORY_KEYS = ['story', 'poem', 'column', 'essay', 'other'] as const;

const CreativeWriting: React.FC = () => {
    const { user, stories, saveStory, deleteStory, addXp, usePotion, t, settings } = useStore();
    const language = settings.language;
    const consumables = user?.consumables || {};
    const [activeTab, setActiveTab] = useState<'write' | 'my-stories' | 'discover'>('write');

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<string>(CATEGORY_KEYS[0]);
    const [isPublic, setIsPublic] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // AI Suggestions state
    const [aiSuggestions, setAiSuggestions] = useState<{ id: string, text: string, type: 'suggestion' | 'review' }[]>([]);
    const [aiError, setAiError] = useState<string | null>(null);

    // View Modal state
    const [viewingStory, setViewingStory] = useState<Story | null>(null);

    // Discovery state (mocking some public stories)
    const discoverStories = [
        { id: 'ext1', title: "L'ombre du Baobab", authorName: 'Ibrahim67', category: 'Chronique', likes: 124, content: "Sous le soleil de midi, l'ombre du vieux baobab était le seul refuge..." },
        { id: 'ext2', title: "Les ailes du désert", authorName: 'Aminata_Dev', category: 'Histoire', likes: 89, content: "Le vent de sable hurlait entre les dunes, mais Ali ne s'arrêtait pas..." },
    ];

    // Auto-save logic
    useEffect(() => {
        if (content.length > 50) {
            const timer = setTimeout(() => {
                handleSave(true);
            }, 30000); // 30s auto-save
            return () => clearTimeout(timer);
        }
    }, [content, title]);

    const handleSave = async (isAuto = false) => {
        if (!title || !content || !user) return;
        if (!isAuto) setIsSaving(true);

        const story: Story = {
            id: editingId || `story_${Date.now()}`,
            title,
            content,
            authorId: user.id,
            authorName: user.name,
            category,
            isPublic,
            likes: 0,
            createdAt: lastSaved?.toISOString() || new Date().toISOString()
        };

        if (!editingId) setEditingId(story.id);

        saveStory(story);
        setLastSaved(new Date());
        if (!isAuto) setTimeout(() => setIsSaving(false), 800);
    };

    const handleEdit = (story: Story) => {
        setEditingId(story.id);
        setTitle(story.title);
        setContent(story.content);
        setCategory(story.category);
        setIsPublic(story.isPublic);
        setLastSaved(new Date(story.createdAt));
        setActiveTab('write');
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(t('creativeWriting.list.deleteConfirm'))) {
            deleteStory(id);
            if (editingId === id) {
                setEditingId(null);
                setTitle('');
                setContent('');
            }
        }
    };

    const handleNew = () => {
        setEditingId(null);
        setTitle('');
        setContent('');
        setCategory(CATEGORY_KEYS[0]);
        setIsPublic(false);
        setLastSaved(null);
        setActiveTab('write');
    };

    const handleAiAction = async (mode: 'write' | 'review') => {
        if (!content && !title) return;
        setIsAiLoading(true);
        setAiError(null);
        try {
            let prompt = "";
            if (mode === 'write') {
                prompt = `Agis comme un écrivain expérimenté. Voici un début de texte ("${title}"): "${content.substring(content.length - 1500)}". Propose-moi une suite créative d'environ 100-150 mots qui s'intègre parfaitement à ce style. Sois inspirant. Réponds en ${language === 'ar' ? 'arabe' : (language === 'en' ? 'anglais' : 'français')}.`;
            } else {
                prompt = `Agis comme un critique littéraire bienveillant. Analyse ce texte ("${title}"): "${content}". Donne ton avis honnête : ce que tu aimes, ce qui pourrait être amélioré (style, rythme, vocabulaire). Sois constructif et encourageant. Réponds en ${language === 'ar' ? 'arabe' : (language === 'en' ? 'anglais' : 'français')}.`;
            }

            const response = await geminiService.coachChat(prompt, [], `Utilisateur: ${user?.name}, Niveau: ${user?.level}`);

            setAiSuggestions(prev => [
                { id: `ai_${Date.now()}`, text: response, type: mode === 'write' ? 'suggestion' : 'review' },
                ...prev
            ]);
            addXp(mode === 'write' ? 10 : 15);
        } catch (e: any) {
            console.error("AI Action failed", e);
            if (e.message?.includes('429')) {
                setAiError(t('creativeWriting.coach.errorQuota'));
            } else {
                setAiError(t('creativeWriting.coach.errorGeneral'));
            }
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleInspirationPotion = async () => {
        if (!consumables['potion_inspiration']) return;
        setIsAiLoading(true);
        setAiError(null);
        try {
            const prompt = `Agis comme un auteur de best-sellers. Génère une idée de roman UNIQUE et PERCUTANTE. 
            Retourne uniquement un JSON avec : 
            "title": Un titre accrocheur, 
            "content": Un premier paragraphe (environ 100 mots) immersif qui lance l'intrigue.
            Sois très créatif, évite les clichés.`;

            const response = await geminiService.coachChat(prompt, [], `Utilisateur: ${user?.name}, Niveau: ${user?.level}`);

            // Extract JSON from response if possible, simplified for now
            let data = { title: "Nouvelle Idée", content: response };
            try {
                const jsonMatch = response.match(/\{.*\}/s);
                if (jsonMatch) data = JSON.parse(jsonMatch[0]);
            } catch (e) { console.error("JSON parse failed", e); }

            usePotion('potion_inspiration');
            setTitle(data.title);
            setContent(data.content);
            setAiSuggestions(prev => [
                { id: `ai_${Date.now()}`, text: "L'Essence d'Inspiration a fonctionné ! Voici ton idée de génie.", type: 'suggestion' },
                ...prev
            ]);
            addXp(50);
        } catch (e) {
            console.error("Inspiration failed", e);
            setAiError("La magie de l'inspiration a échoué. Réessaie.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const applySuggestion = (text: string) => {
        setContent(prev => {
            const separator = prev.endsWith('\n') || !prev ? '' : '\n\n';
            return prev + separator + text;
        });
    };

    return (
        <div className="max-w-7xl mx-auto py-4 md:py-8 px-4 space-y-8 md:space-y-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 border-b border-white/5 pb-8 md:pb-10">
                <div className="space-y-3 md:space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-secondary/10 rounded-full border border-secondary/20 text-secondary-light font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px]">
                        <PenTool size={10} md:size={14} className="animate-pulse" /> {t('creativeWriting.tag')}
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                        <h1 className="text-2xl md:text-5xl font-display font-black text-white tracking-tighter">{t('creativeWriting.title').split(' ')[0]} {t('creativeWriting.title').split(' ').slice(1, -1).join(' ')} <span className="text-gradient-primary">{t('creativeWriting.title').split(' ').pop()}</span></h1>
                        {editingId && (
                            <button
                                onClick={handleNew}
                                className="w-fit px-4 md:px-6 py-1.5 md:py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center gap-1.5 md:gap-2"
                            >
                                <PenTool size={12} md:size={14} /> {t('creativeWriting.newDraft')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="glass p-1 rounded-xl md:rounded-[2rem] border border-white/5 flex flex-nowrap gap-1 shadow-2xl shrink-0 overflow-x-auto scrollbar-hide">
                    {(['write', 'my-stories', 'discover'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 md:flex-none px-3 md:px-8 py-2.5 md:py-3.5 rounded-lg md:rounded-[1.5rem] font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all duration-500 flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap ${activeTab === tab ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                        >
                            {tab === 'write' ? <PenTool size={10} md:size={12} /> : tab === 'my-stories' ? <Layout size={10} md:size={12} /> : <Globe size={10} md:size={12} />}
                            <span>{tab === 'write' ? t('creativeWriting.tabs.write') : tab === 'my-stories' ? t('creativeWriting.tabs.myStories') : t('creativeWriting.tabs.discover')}</span>
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'write' && (
                    <motion.div
                        key="write-tab"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start"
                    >
                        {/* Main Editor Section (LHS) */}
                        <div className="lg:col-span-8 space-y-6 w-full overflow-hidden">
                            <div className="bg-slate-950/40 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] border border-white/10 p-6 md:p-10 shadow-premium relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-secondary/40 to-transparent"></div>

                                <div className="space-y-6 md:space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">{t('creativeWriting.form.titleLabel')}</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder={t('creativeWriting.form.titlePlaceholder')}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-6 text-base md:text-3xl font-display font-black text-white placeholder:text-slate-800 focus:border-secondary/50 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-3 md:space-y-4">
                                        <div className="flex items-center justify-between px-3 md:px-4">
                                            <label className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{t('creativeWriting.form.contentLabel')}</label>
                                            <div className="flex items-center gap-3 md:gap-6">
                                                <div className="flex items-center gap-1.5 md:gap-2">
                                                    <Type size={12} md:size={14} className="text-secondary" />
                                                    <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{content.length} {t('creativeWriting.form.characters')}</span>
                                                </div>
                                                {lastSaved && (
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <Clock size={12} md:size={14} className="text-success" />
                                                        <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder={t('creativeWriting.form.contentPlaceholder')}
                                            className="w-full h-[300px] md:h-[600px] bg-white/5 border border-white/10 rounded-[1.2rem] md:rounded-[2.5rem] p-4 md:p-12 text-sm md:text-xl leading-relaxed text-slate-300 placeholder:text-slate-800 focus:border-secondary/50 outline-none transition-all resize-none custom-scrollbar"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI & Config Side Panel (RHS) */}
                        <div className="lg:col-span-4 space-y-8">
                            {/* AI Coach Area */}
                            <div className="glass rounded-[2rem] md:rounded-[3rem] border border-white/5 p-6 md:p-8 space-y-6 md:space-y-8 flex flex-col min-h-[400px] md:min-h-[500px]">
                                <div className="space-y-4 border-b border-white/5 pb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-secondary/20 text-secondary rounded-xl flex items-center justify-center border border-secondary/20 shrink-0">
                                            <Sparkles size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-display font-bold text-xl text-white truncate">{t('creativeWriting.coach.title')}</h4>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">{t('creativeWriting.coach.subtitle')}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAiAction('review')}
                                                disabled={isAiLoading || (!content && !title)}
                                                className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                            >
                                                {t('creativeWriting.coach.reviewBtn')}
                                            </button>
                                            <button
                                                onClick={() => handleAiAction('write')}
                                                disabled={isAiLoading || (!content && !title)}
                                                className="flex-1 px-3 py-2 bg-gradient-to-r from-secondary to-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-glow"
                                            >
                                                {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                                {t('creativeWriting.coach.helpBtn')}
                                            </button>
                                        </div>
                                        {consumables['potion_inspiration'] > 0 && (
                                            <button
                                                onClick={handleInspirationPotion}
                                                disabled={isAiLoading}
                                                className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all group"
                                            >
                                                <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center bg-amber-500/10 shadow-glow shadow-amber-500/20">
                                                    <img src="/assets/fiole magique/WhatsApp Image 2026-02-10 at 02.26.07.jpeg" alt="Inspiration" className="w-full h-full object-contain group-hover:rotate-12 transition-transform" />
                                                </div>
                                                {t('creativeWriting.coach.potion')} ({consumables['potion_inspiration']})
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 space-y-6 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                    {aiError && (
                                        <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-[10px] font-bold uppercase tracking-widest text-center animate-shake">
                                            {aiError}
                                        </div>
                                    )}

                                    <AnimatePresence initial={false}>
                                        {aiSuggestions.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-40">
                                                <MessageSquare size={48} className="text-slate-600" />
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                                    {t('creativeWriting.coach.empty')}
                                                </p>
                                            </div>
                                        ) : (
                                            aiSuggestions.map((sig) => (
                                                <motion.div
                                                    key={sig.id}
                                                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    className={`p-6 rounded-2xl border transition-all relative group ${sig.type === 'review' ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/10'}`}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className={`text-[8px] font-black uppercase tracking-[0.2rem] ${sig.type === 'review' ? 'text-primary' : 'text-secondary'}`}>
                                                            {sig.type === 'review' ? t('creativeWriting.coach.analysis') : t('creativeWriting.coach.suggestion')}
                                                        </span>
                                                        <button
                                                            onClick={() => setAiSuggestions(prev => prev.filter(s => s.id !== sig.id))}
                                                            className="text-slate-600 hover:text-danger p-1 transition-colors"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{sig.text}</p>

                                                    {sig.type === 'suggestion' && (
                                                        <button
                                                            onClick={() => applySuggestion(sig.text)}
                                                            className="mt-4 w-full py-3 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Send size={12} /> {t('creativeWriting.coach.insert')}
                                                        </button>
                                                    )}
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Document Config Area */}
                            <div className="glass rounded-[2rem] md:rounded-[3rem] border border-white/5 p-6 md:p-8 space-y-6 md:space-y-8">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">{t('creativeWriting.form.documentSettings')}</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {CATEGORY_KEYS.map(catKey => (
                                                <button
                                                    key={catKey}
                                                    onClick={() => setCategory(catKey)}
                                                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${category === catKey ? 'bg-secondary/20 border-secondary/40 text-secondary-light' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    {t(`creativeWriting.categories.${catKey}`)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isPublic ? 'bg-success/10 text-success' : 'bg-slate-800 text-slate-500'}`}>
                                                {isPublic ? <Globe size={18} /> : <Lock size={18} />}
                                            </div>
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest">{t('creativeWriting.form.public')}</p>
                                        </div>
                                        <button
                                            onClick={() => setIsPublic(!isPublic)}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${isPublic ? 'bg-success' : 'bg-slate-700'}`}
                                        >
                                            <motion.div
                                                className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full"
                                                animate={{ x: isPublic ? 20 : 0 }}
                                            />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleSave()}
                                        disabled={isSaving || !title || !content}
                                        className="w-full py-6 bg-gradient-to-r from-primary to-secondary text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-glow flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        {isSaving ? t('creativeWriting.form.saving') : t('creativeWriting.form.saveBtn')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'my-stories' && (
                    <motion.div
                        key="stories-tab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        <AnimatePresence mode="popLayout">
                            {stories.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-6"
                                >
                                    <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 text-slate-700">
                                        <PenTool size={48} strokeWidth={1} />
                                    </div>
                                    <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">{t('creativeWriting.list.empty')}</h3>
                                    <button onClick={() => setActiveTab('write')} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px]">{t('creativeWriting.list.startBtn')}</button>
                                </motion.div>
                            ) : (
                                stories.map(story => (
                                    <motion.div
                                        key={story.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                        className="glass p-8 rounded-[2.5rem] border border-white/5 hover:border-secondary/30 transition-all group relative overflow-hidden flex flex-col"
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <span className="px-3 py-1 bg-secondary/10 text-secondary-light text-[8px] font-black uppercase tracking-widest rounded-full">{t(`creativeWriting.categories.${story.category as any}`)}</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setViewingStory(story)}
                                                    className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all hover:scale-110"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(story.id, e)}
                                                    className="p-2 bg-danger/10 rounded-lg text-danger transition-all hover:scale-110 hover:bg-danger hover:text-white"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className="text-2xl font-display font-bold text-white leading-tight mb-4 group-hover:text-secondary-light transition-colors line-clamp-2">{story.title}</h4>
                                        <p className="text-sm text-slate-500 line-clamp-3 mb-8 flex-1">{story.content}</p>
                                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{new Date(story.createdAt).toLocaleDateString()}</span>
                                            <button
                                                onClick={() => handleEdit(story)}
                                                className="text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-1 group/btn hover:text-white transition-all"
                                            >
                                                {t('creativeWriting.list.modified')} <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {activeTab === 'discover' && (
                    <motion.div
                        key="discover-tab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                        {discoverStories.map(story => (
                            <div key={story.id} className="bg-slate-900/40 rounded-[3rem] border border-white/5 p-10 space-y-6 hover:border-primary/30 transition-all cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl overflow-hidden border border-white/10">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${story.authorName}`} alt="avatar" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm tracking-tight">{story.authorName}</p>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{story.category}</p>
                                    </div>
                                </div>
                                <h3 className="text-3xl font-display font-black text-white leading-tight group-hover:text-primary-light transition-colors">{story.title}</h3>
                                <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-danger uppercase tracking-widest">
                                        <Heart size={14} className="fill-danger" /> {story.likes}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <MessageSquare size={14} /> 24
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* View Story Modal */}
                <AnimatePresence>
                    {viewingStory && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setViewingStory(null)}
                                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[3rem] p-12 max-h-[80vh] overflow-y-auto custom-scrollbar shadow-2xl"
                            >
                                <button
                                    onClick={() => setViewingStory(null)}
                                    className="absolute top-8 right-8 p-3 bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <span className="px-4 py-1.5 bg-secondary/20 text-secondary-light text-[10px] font-black uppercase tracking-widest rounded-full border border-secondary/20">{t(`creativeWriting.categories.${viewingStory.category as any}`)}</span>
                                        <h2 className="text-5xl font-display font-black text-white leading-none">{viewingStory.title}</h2>
                                        <div className="flex items-center gap-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                            <span>{t('creativeWriting.list.by')} {viewingStory.authorName}</span>
                                            <span>•</span>
                                            <span>{new Date(viewingStory.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <p className="text-xl text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                                        {viewingStory.content}
                                    </p>
                                    <div className="pt-8 border-t border-white/5 flex justify-end">
                                        <button
                                            onClick={() => { handleEdit(viewingStory); setViewingStory(null); }}
                                            className="px-10 py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-glow hover:scale-[1.05] active:scale-95 transition-all"
                                        >
                                            {t('creativeWriting.list.modified')}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </AnimatePresence>
        </div>
    );
};



export default CreativeWriting;
