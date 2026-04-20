import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Loader2, X, Zap, Eye, Clock, Edit3, Type, ImagePlus, Palette, Send, ArrowLeft, Sparkles, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, LearningStory } from '../../services/communityService';
import { useStore } from '../../hooks/useStore';

const StoriesView: React.FC = () => {
    const { user } = useStore();
    const [stories, setStories] = useState<LearningStory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [storyCaption, setStoryCaption] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [createMode, setCreateMode] = useState<'choose' | 'text' | 'photo'>('choose');
    const [bgColorIndex, setBgColorIndex] = useState(0);
    const [textContent, setTextContent] = useState('');
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const [viewingUser, setViewingUser] = useState<string | null>(null);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const progressInterval = useRef<any>(null);

    useEffect(() => {
        const unsubscribe = chatService.listenToStories((activeStories) => {
            console.log('[Stories] Stories updated:', activeStories.length);
            setStories(activeStories);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setUploadPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !user) return;
        setIsUploading(true);
        try {
            console.log('[Stories] Starting photo upload...');
            const userAvatar = user.avatar?.image || user.avatar?.baseColor || '#3B82F6';
            const imageUrl = await chatService.uploadStoryImage(selectedFile, user.id);
            
            await chatService.postStory(
                user.id,
                user.name,
                userAvatar,
                storyCaption || "",
                'update',
                imageUrl
            );
            
            setShowUploadModal(false);
            setUploadPreview(null);
            setSelectedFile(null);
            setStoryCaption('');
        } catch (error: any) {
            console.error("[Stories] Upload failed:", error);
            alert("Échec de l'envoi : " + (error.message || "Vérifiez votre connexion"));
        } finally {
            setIsUploading(false);
        }
    };

    // Group stories by user
    const groupedStories = stories.reduce((acc, story) => {
        if (!acc[story.userId]) {
            acc[story.userId] = {
                user: { name: story.userName, avatar: story.userAvatar },
                stories: []
            };
        }
        acc[story.userId].stories.push(story);
        return acc;
    }, {} as any);

    // Separate my stories from others
    const myStories = user?.id ? groupedStories[user.id] : null;
    const otherUsers = Object.entries(groupedStories).filter(([userId]) => userId !== user?.id);

    // Story Viewer Logic
    useEffect(() => {
        if (viewingUser) {
            const userStories = groupedStories[viewingUser]?.stories || [];
            if (userStories.length === 0) {
                setViewingUser(null);
                return;
            }

            setProgress(0);
            if (progressInterval.current) clearInterval(progressInterval.current);

            progressInterval.current = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        handleNextStory();
                        return 0;
                    }
                    return prev + 1;
                });
            }, 50);

            if (userStories[currentStoryIndex]) {
                chatService.viewStory(userStories[currentStoryIndex].id, user?.id || '');
            }
        } else {
            if (progressInterval.current) clearInterval(progressInterval.current);
            setProgress(0);
        }

        return () => {
            if (progressInterval.current) clearInterval(progressInterval.current);
        };
    }, [viewingUser, currentStoryIndex]);

    const handleNextStory = () => {
        const userStories = groupedStories[viewingUser!]?.stories || [];
        if (currentStoryIndex < userStories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else {
            const userIds = Object.keys(groupedStories);
            const currentUserIdx = userIds.indexOf(viewingUser!);
            if (currentUserIdx < userIds.length - 1) {
                setViewingUser(userIds[currentUserIdx + 1]);
                setCurrentStoryIndex(0);
            } else {
                setViewingUser(null);
                setCurrentStoryIndex(0);
            }
        }
    };

    const handlePrevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        } else {
            setCurrentStoryIndex(0);
            setProgress(0);
        }
    };

    // Premium Gradient Ring SVG
    const StoryRing = ({ size = 64, active = true }: { size?: number; active?: boolean }) => {
        return (
            <div className="absolute inset-0 flex items-center justify-center p-1">
                <motion.div
                    animate={active ? { rotate: 360 } : {}}
                    transition={active ? { duration: 8, repeat: Infinity, ease: "linear" } : {}}
                    className="w-full h-full rounded-full border-2 border-transparent bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500"
                    style={{ 
                        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude",
                        padding: '2px'
                    }}
                />
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020617] overflow-hidden">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                
                {/* ═══════════ MY STATUS HERO ═══════════ */}
                <div className="px-6 py-6">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group overflow-hidden rounded-[32px] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 p-6 shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl">
                            <Sparkles className="w-24 h-24 text-blue-400" />
                        </div>
                        
                        <div className="flex items-center gap-6 relative z-10">
                            <button
                                onClick={() => myStories ? (() => { setViewingUser(user!.id); setCurrentStoryIndex(0); })() : (() => { setCreateMode('text'); setShowUploadModal(true); })()}
                                className="relative shrink-0"
                            >
                                <div className="w-20 h-20 rounded-[28px] overflow-hidden p-1 relative">
                                    {myStories && <StoryRing size={80} />}
                                    <div className="w-full h-full rounded-[24px] overflow-hidden bg-slate-900 border-2 border-white/5">
                                        {user?.avatar?.image ? (
                                            <img src={user.avatar.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center font-black text-white text-2xl"
                                                style={{ backgroundColor: user?.avatar?.baseColor || '#2563eb' }}
                                            >
                                                {user?.name?.[0] || '?'}
                                            </div>
                                        )}
                                    </div>
                                    {!myStories && (
                                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full border-[3px] border-[#0a1229] flex items-center justify-center shadow-lg">
                                            <Plus size={16} strokeWidth={3} className="text-white" />
                                        </div>
                                    )}
                                </div>
                            </button>
                            
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-white tracking-tight">Mon Statut</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                    {myStories 
                                        ? `${myStories.stories.length} mise${myStories.stories.length > 1 ? 's' : ''} à jour active${myStories.stories.length > 1 ? 's' : ''}`
                                        : "Partage ton humeur du jour"}
                                </p>
                                
                                <div className="flex items-center gap-2 mt-4">
                                    <button 
                                        onClick={() => { setCreateMode('text'); setShowUploadModal(true); }}
                                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-colors shadow-lg"
                                    >
                                        Écrire
                                    </button>
                                    <button 
                                        onClick={() => { setCreateMode('photo'); setShowUploadModal(true); }}
                                        className="px-4 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all"
                                    >
                                        Photo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ═══════════ RECENT UPDATES ═══════════ */}
                <div className="px-6 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.3em]">Mises à jour récentes</h3>
                        <TrendingUp size={14} className="text-slate-800" />
                    </div>

                    {otherUsers.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {otherUsers.map(([userId, data]: any, idx) => (
                                <motion.button
                                    key={userId}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={() => { setViewingUser(userId); setCurrentStoryIndex(0); }}
                                    className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden group border border-white/5"
                                >
                                    {/* Background Preview */}
                                    <div className="absolute inset-0">
                                        {data.stories[data.stories.length - 1].imageUrl ? (
                                            <img src={data.stories[data.stories.length - 1].imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                        ) : (
                                            <div 
                                                className="w-full h-full"
                                                style={{ backgroundColor: data.stories[data.stories.length - 1].backgroundColor || '#1e293b' }}
                                            >
                                                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                                                    <p className="text-xs font-black text-white/40 uppercase tracking-widest line-clamp-3 italic">
                                                        {data.stories[data.stories.length - 1].content}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"></div>
                                    </div>

                                    {/* Content Info */}
                                    <div className="absolute inset-0 p-5 flex flex-col justify-between items-start">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden p-0.5 relative z-10 border border-white/20 shadow-xl">
                                                <StoryRing size={48} />
                                                <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-900">
                                                    {data.user.avatar && (data.user.avatar.startsWith('http') || data.user.avatar.startsWith('data:')) ? (
                                                        <img src={data.user.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div
                                                            className="w-full h-full flex items-center justify-center font-black text-white text-base"
                                                            style={{ backgroundColor: data.user.avatar?.startsWith('#') ? data.user.avatar : '#475569' }}
                                                        >
                                                            {data.user.name?.[0]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-0.5 text-left">
                                            <h4 className="font-black text-white text-sm tracking-tight truncate w-full">{data.user.name}</h4>
                                            <div className="flex items-center gap-1.5 opacity-60">
                                                <Clock size={10} className="text-white" />
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                                                    {data.stories[data.stories.length - 1].timestamp
                                                        ? new Date(data.stories[data.stories.length - 1].timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                                        : 'Récent'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Indicator for multiple stories */}
                                    {data.stories.length > 1 && (
                                        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                            <span className="text-[9px] font-black text-white">+{data.stories.length - 1}</span>
                                        </div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    ) : (
                        /* Empty State */
                        !myStories && !loading && (
                            <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
                                <div className="relative w-24 h-24">
                                    <div className="absolute inset-0 bg-blue-600/10 blur-2xl rounded-full"></div>
                                    <div className="relative w-full h-full bg-white/[0.02] border border-white/10 rounded-[32px] flex items-center justify-center">
                                        <Camera size={32} className="text-slate-800" />
                                    </div>
                                </div>
                                <div className="space-y-2 px-12">
                                    <p className="text-lg font-black text-white">Silence radio...</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                        Tes contacts n'ont pas encore publié de statut aujourd'hui.
                                    </p>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Viewer Overlay */}
            <AnimatePresence>
                {viewingUser && groupedStories[viewingUser] && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[500] bg-black flex flex-col"
                    >
                        {/* Bars */}
                        <div className="absolute top-4 inset-x-4 z-20 flex gap-1.5 px-2">
                            {groupedStories[viewingUser].stories.map((_: any, idx: number) => (
                                <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-white rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: idx === currentStoryIndex ? `${progress}%` : (idx < currentStoryIndex ? '100%' : '0%')
                                        }}
                                        transition={{ duration: 0 }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Top Info */}
                        <div className="absolute top-10 inset-x-6 z-20 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl">
                                    <img src={groupedStories[viewingUser].user.avatar} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div>
                                    <h4 className="text-[15px] font-black text-white tracking-tight">
                                        {groupedStories[viewingUser].user.name}
                                    </h4>
                                    <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">
                                        {groupedStories[viewingUser].stories[currentStoryIndex]?.timestamp
                                            ? new Date(groupedStories[viewingUser].stories[currentStoryIndex].timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                            : 'À l\'instant'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setViewingUser(null); setCurrentStoryIndex(0); }}
                                className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 relative flex items-center justify-center">
                            <div className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer" onClick={handlePrevStory}></div>
                            <div className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer" onClick={handleNextStory}></div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${viewingUser}-${currentStoryIndex}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="w-full h-full flex items-center justify-center p-4 sm:p-0"
                                >
                                    {groupedStories[viewingUser].stories[currentStoryIndex]?.imageUrl ? (
                                        <img
                                            src={groupedStories[viewingUser].stories[currentStoryIndex].imageUrl}
                                            className="w-full h-full object-contain rounded-3xl"
                                            alt="Story"
                                        />
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center p-12 text-center rounded-3xl"
                                            style={{ backgroundColor: groupedStories[viewingUser].stories[currentStoryIndex]?.backgroundColor || '#1e293b' }}
                                        >
                                            <p className="text-3xl font-black text-white italic leading-tight drop-shadow-2xl">
                                                {groupedStories[viewingUser].stories[currentStoryIndex]?.content}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {/* Caption */}
                            {groupedStories[viewingUser].stories[currentStoryIndex]?.imageUrl && groupedStories[viewingUser].stories[currentStoryIndex]?.content && (
                                <div className="absolute bottom-20 inset-x-0 p-8 text-center bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-lg font-black text-white drop-shadow-xl">
                                        {groupedStories[viewingUser].stories[currentStoryIndex].content}
                                    </p>
                                </div>
                            )}

                            {/* Views */}
                            {viewingUser === user?.id && (
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/10 backdrop-blur-3xl px-6 py-3 rounded-2xl border border-white/10">
                                    <Eye size={18} className="text-white" />
                                    <span className="text-sm font-black text-white">
                                        {groupedStories[viewingUser].stories[currentStoryIndex]?.views?.length || 0} VUES
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Snapchat-Style Full-Screen Creator */}
            <AnimatePresence>
                {showUploadModal && (
                    <motion.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-[300] flex flex-col"
                    >
                        {/* TEXT MODE — Full-screen colored background */}
                        {createMode === 'text' && (
                            <div
                                className="flex-1 flex flex-col relative transition-colors duration-500"
                                style={{
                                    background: [
                                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                                        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                                        'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
                                        'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)',
                                        '#1e293b',
                                        '#000000',
                                    ][bgColorIndex]
                                }}
                            >
                                {/* Top Bar */}
                                <div className="flex items-center justify-between p-4 pt-6 z-10">
                                    <button
                                        onClick={() => {
                                            setShowUploadModal(false);
                                            setTextContent('');
                                            setCreateMode('choose');
                                        }}
                                        className="p-2 text-white/80 hover:text-white bg-black/20 rounded-full backdrop-blur-sm transition-all"
                                    >
                                        <X size={22} />
                                    </button>

                                    <div className="flex items-center gap-2">
                                        {/* Font style toggle (visual only) */}
                                        <button className="p-2.5 text-white/70 hover:text-white bg-black/20 rounded-full backdrop-blur-sm transition-all">
                                            <Type size={18} />
                                        </button>
                                        {/* Color picker */}
                                        <button
                                            onClick={() => setBgColorIndex((prev) => (prev + 1) % 10)}
                                            className="p-2.5 text-white/70 hover:text-white bg-black/20 rounded-full backdrop-blur-sm transition-all"
                                        >
                                            <Palette size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Text Input Area */}
                                <div className="flex-1 flex items-center justify-center px-8">
                                    <textarea
                                        ref={textInputRef}
                                        value={textContent}
                                        onChange={(e) => setTextContent(e.target.value)}
                                        placeholder="Écris ton statut..."
                                        autoFocus
                                        className="w-full text-center bg-transparent text-white font-bold text-2xl leading-relaxed placeholder:text-white/40 outline-none resize-none max-h-[60vh]"
                                        rows={4}
                                    />
                                </div>

                                {/* Color Dots */}
                                <div className="flex items-center justify-center gap-2 py-3">
                                    {['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#a18cd1', '#fccb90', '#0c3483', '#1e293b', '#000'].map((color, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setBgColorIndex(i)}
                                            className={`w-6 h-6 rounded-full border-2 transition-all ${bgColorIndex === i ? 'border-white scale-125' : 'border-transparent scale-100'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>

                                {/* Bottom Send Bar */}
                                <div className="p-4 pb-8 flex items-center justify-between">
                                    <button
                                        onClick={() => {
                                            setCreateMode('photo');
                                            fileInputRef.current?.click();
                                        }}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-black/20 backdrop-blur-sm rounded-full text-white/70 hover:text-white transition-all"
                                    >
                                        <ImagePlus size={18} />
                                        <span className="text-[12px] font-semibold">Photo</span>
                                    </button>

                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={async () => {
                                            if (!textContent.trim() || !user) return;
                                            setIsUploading(true);
                                            try {
                                                const bgColors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#a18cd1', '#fccb90', '#0c3483', '#1e293b', '#000000'];

                                                // Determine user avatar - use baseColor if no image
                                                const userAvatar = user.avatar?.image || user.avatar?.baseColor || '#3B82F6';

                                                await chatService.postStory(
                                                    user.id,
                                                    user.name,
                                                    userAvatar,
                                                    textContent.trim(),
                                                    'text',
                                                    undefined,
                                                    bgColors[bgColorIndex]
                                                );
                                                setShowUploadModal(false);
                                                setTextContent('');
                                                setCreateMode('choose');
                                            } catch (error: any) {
                                                console.error('Post failed:', error?.message || error);
                                                alert('Erreur lors de la publication: ' + (error?.message || 'Vérifie ta connexion'));
                                            } finally {
                                                setIsUploading(false);
                                            }
                                        }}
                                        disabled={!textContent.trim() || isUploading}
                                        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold text-[13px] shadow-lg disabled:opacity-40 transition-all hover:bg-white/90"
                                    >
                                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                        Mon Statut
                                    </motion.button>
                                </div>

                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                            </div>
                        )}

                        {/* PHOTO MODE — Gallery pick + preview */}
                        {createMode === 'photo' && (
                            <div className="flex-1 flex flex-col bg-black">
                                {/* Top Bar */}
                                <div className="flex items-center justify-between p-4 pt-6 z-10">
                                    <button
                                        onClick={() => {
                                            if (uploadPreview) {
                                                setUploadPreview(null);
                                                setSelectedFile(null);
                                                setStoryCaption('');
                                            } else {
                                                setShowUploadModal(false);
                                                setCreateMode('choose');
                                            }
                                        }}
                                        className="p-2 text-white/80 hover:text-white bg-white/10 rounded-full backdrop-blur-sm transition-all"
                                    >
                                        {uploadPreview ? <ArrowLeft size={22} /> : <X size={22} />}
                                    </button>

                                    {uploadPreview && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-white/40 font-medium">Prêt à partager</span>
                                            <Sparkles size={14} className="text-primary" />
                                        </div>
                                    )}
                                </div>

                                {/* Content Area */}
                                <div className="flex-1 flex items-center justify-center relative">
                                    {uploadPreview ? (
                                        <motion.img
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            src={uploadPreview}
                                            className="max-w-full max-h-full object-contain"
                                            alt="Preview"
                                        />
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex flex-col items-center gap-6 cursor-pointer group"
                                        >
                                            <motion.div
                                                animate={{ scale: [1, 1.05, 1] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                                className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center border-2 border-dashed border-white/15 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all"
                                            >
                                                <ImagePlus size={36} className="text-slate-500 group-hover:text-primary transition-colors" />
                                            </motion.div>
                                            <div className="text-center space-y-1">
                                                <p className="text-white font-semibold text-[15px]">Choisir une photo</p>
                                                <p className="text-slate-500 text-[12px]">Depuis ta galerie</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Bar */}
                                <div className="p-4 pb-8">
                                    {uploadPreview ? (
                                        <div className="space-y-3">
                                            {/* Caption Input */}
                                            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md rounded-full px-5 py-3 border border-white/10">
                                                <input
                                                    type="text"
                                                    value={storyCaption}
                                                    onChange={(e) => setStoryCaption(e.target.value)}
                                                    placeholder="Ajouter une légende..."
                                                    className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/30 outline-none"
                                                />
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={handleUpload}
                                                    disabled={isUploading}
                                                    className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-full font-bold text-[12px] shadow-lg disabled:opacity-40 transition-all"
                                                >
                                                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                                    Envoyer
                                                </motion.button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => setCreateMode('text')}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-full text-white/70 hover:text-white transition-all"
                                            >
                                                <Type size={18} />
                                                <span className="text-[12px] font-semibold">Texte</span>
                                            </button>

                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-[13px] shadow-lg transition-all hover:brightness-110"
                                            >
                                                <ImagePlus size={18} />
                                                Galerie
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StoriesView;
