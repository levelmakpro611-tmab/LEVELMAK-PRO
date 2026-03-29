import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Loader2, X, Zap, Eye, Clock, Edit3, Type, ImagePlus, Palette, Send, ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, LearningStory } from '../../services/firebase-chat';
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
            // Determine user avatar - use baseColor if no image
            const userAvatar = user.avatar?.image || user.avatar?.baseColor || '#3B82F6';

            const imageUrl = await chatService.uploadStoryImage(selectedFile, user.id);
            await chatService.postStory(
                user.id,
                user.name,
                userAvatar,
                storyCaption || "",
                'update', // Changed from 'text' to 'update' for photos
                imageUrl
            );
            setShowUploadModal(false);
            setUploadPreview(null);
            setSelectedFile(null);
            setStoryCaption('');
        } catch (error: any) {
            console.error("Upload failed", error);
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
            // Move to next user's stories
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

    // WhatsApp segmented ring SVG for story borders
    const StoryRing = ({ count, size = 56 }: { count: number; size?: number }) => {
        const radius = size / 2 - 2;
        const circumference = 2 * Math.PI * radius;
        const gap = count > 1 ? 4 : 0;
        const segmentLength = (circumference - gap * count) / count;

        return (
            <svg width={size} height={size} className="absolute inset-0 -rotate-90">
                {Array.from({ length: count }).map((_, i) => (
                    <circle
                        key={i}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2.5"
                        strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                        strokeDashoffset={-(i * (segmentLength + gap))}
                        strokeLinecap="round"
                    />
                ))}
            </svg>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[hsl(var(--background))] overflow-hidden">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                {/* My Status Section */}
                <div className="px-4 pt-4 pb-2">
                    <button
                        onClick={() => myStories ? (() => { setViewingUser(user!.id); setCurrentStoryIndex(0); })() : (() => { setCreateMode('text'); setShowUploadModal(true); })()}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98]"
                    >
                        <div className="relative">
                            <div className={`w-14 h-14 rounded-full overflow-hidden ${myStories ? '' : 'border-2 border-white/10'}`}>
                                {myStories && <StoryRing count={myStories.stories.length} size={56} />}
                                <div className="w-full h-full rounded-full overflow-hidden p-[3px]">
                                    {user?.avatar?.image ? (
                                        <img src={user.avatar.image} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <div
                                            className="w-full h-full rounded-full flex items-center justify-center font-bold text-white text-lg"
                                            style={{ backgroundColor: user?.avatar?.baseColor || 'hsl(var(--primary))' }}
                                        >
                                            {user?.name?.[0] || '?'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {!myStories && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full border-2 border-[hsl(var(--background))] flex items-center justify-center">
                                    <Plus size={12} strokeWidth={3} className="text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 text-left">
                            <h4 className="text-[15px] font-semibold text-white">Mon Statut</h4>
                            <p className="text-[12px] text-slate-500">
                                {myStories
                                    ? `${myStories.stories.length} statut${myStories.stories.length > 1 ? 's' : ''} • Appuie pour voir`
                                    : 'Appuie pour ajouter un statut'
                                }
                            </p>
                        </div>
                        {!myStories && (
                            <div className="p-2 text-primary">
                                <Edit3 size={20} />
                            </div>
                        )}
                    </button>
                </div>

                {/* Recent Updates */}
                {otherUsers.length > 0 && (
                    <div className="px-4">
                        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest px-3 py-3">
                            Mises à jour récentes
                        </p>

                        <div className="space-y-0.5">
                            {otherUsers.map(([userId, data]: any) => (
                                <button
                                    key={userId}
                                    onClick={() => {
                                        setViewingUser(userId);
                                        setCurrentStoryIndex(0);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98]"
                                >
                                    <div className="relative w-14 h-14">
                                        <StoryRing count={data.stories.length} size={56} />
                                        <div className="w-full h-full rounded-full overflow-hidden p-[3px]">
                                            {data.user.avatar && (data.user.avatar.startsWith('http') || data.user.avatar.startsWith('data:')) ? (
                                                <img src={data.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <div
                                                    className="w-full h-full rounded-full flex items-center justify-center font-bold text-white text-lg"
                                                    style={{ backgroundColor: (data.user.avatar && data.user.avatar.startsWith('#')) ? data.user.avatar : '#475569' }}
                                                >
                                                    {data.user.name?.[0]}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <h4 className="text-[15px] font-semibold text-white truncate">{data.user.name}</h4>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Clock size={11} className="text-slate-500" />
                                            <span className="text-[12px] text-slate-500">
                                                {data.stories[data.stories.length - 1].timestamp
                                                    ? new Date(data.stories[data.stories.length - 1].timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                                    : 'Récent'}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {otherUsers.length === 0 && !myStories && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center px-8">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                            <Camera size={32} className="text-slate-600" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-white text-lg">Aucun statut récent</p>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Les mises à jour de statut de tes contacts apparaîtront ici.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* FAB - Two buttons like Snapchat */}
            <div className="absolute bottom-28 right-6 flex flex-col gap-3 z-10">
                <button
                    onClick={() => { setCreateMode('text'); setShowUploadModal(true); }}
                    className="w-12 h-12 bg-white/10 backdrop-blur-md text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-white/10"
                >
                    <Edit3 size={20} />
                </button>
                <button
                    onClick={() => { setCreateMode('photo'); setShowUploadModal(true); }}
                    className="w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                >
                    <Camera size={24} />
                </button>
            </div>

            {/* Full Story Viewer Overlay */}
            <AnimatePresence>
                {viewingUser && groupedStories[viewingUser] && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black flex flex-col"
                    >
                        {/* Progress Bars */}
                        <div className="absolute top-3 inset-x-3 z-20 flex gap-1">
                            {groupedStories[viewingUser].stories.map((_: any, idx: number) => (
                                <div key={idx} className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden">
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

                        {/* Top Info Bar */}
                        <div className="absolute top-6 inset-x-4 z-20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full border-2 border-white/30 overflow-hidden">
                                    <img
                                        src={groupedStories[viewingUser].user.avatar}
                                        className="w-full h-full rounded-full object-cover"
                                        alt=""
                                    />
                                </div>
                                <div>
                                    <h4 className="text-[14px] font-bold text-white leading-tight">
                                        {groupedStories[viewingUser].user.name}
                                    </h4>
                                    <p className="text-[10px] text-white/50 font-medium">
                                        {groupedStories[viewingUser].stories[currentStoryIndex]?.timestamp
                                            ? new Date(groupedStories[viewingUser].stories[currentStoryIndex].timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                            : 'Récent'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setViewingUser(null); setCurrentStoryIndex(0); }}
                                className="p-2 text-white/80 hover:text-white transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Story Content */}
                        <div className="flex-1 relative flex items-center justify-center">
                            {/* Tap Zones */}
                            <div className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" onClick={handlePrevStory}></div>
                            <div className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer" onClick={handleNextStory}></div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${viewingUser}-${currentStoryIndex}`}
                                    initial={{ opacity: 0, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full flex items-center justify-center"
                                >
                                    {groupedStories[viewingUser].stories[currentStoryIndex]?.imageUrl ? (
                                        <img
                                            src={groupedStories[viewingUser].stories[currentStoryIndex].imageUrl}
                                            className="w-full h-full object-contain"
                                            alt="Story"
                                        />
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center p-12 text-center"
                                            style={{ backgroundColor: groupedStories[viewingUser].stories[currentStoryIndex]?.backgroundColor || '#1e293b' }}
                                        >
                                            <p className="text-2xl font-black text-white italic leading-tight">
                                                {groupedStories[viewingUser].stories[currentStoryIndex]?.content}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {/* Caption */}
                            {groupedStories[viewingUser].stories[currentStoryIndex]?.imageUrl && groupedStories[viewingUser].stories[currentStoryIndex]?.content && (
                                <div className="absolute bottom-8 inset-x-0 p-6 text-center bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                    <p className="text-[15px] font-semibold text-white leading-relaxed drop-shadow-lg">
                                        {groupedStories[viewingUser].stories[currentStoryIndex].content}
                                    </p>
                                </div>
                            )}

                            {/* View count for own stories */}
                            {viewingUser === user?.id && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full z-10">
                                    <Eye size={14} className="text-white/70" />
                                    <span className="text-[12px] font-bold text-white/70">
                                        {groupedStories[viewingUser].stories[currentStoryIndex]?.views?.length || 0} vues
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
