import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Loader2, X, Zap } from 'lucide-react';
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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            const imageUrl = await chatService.uploadStoryImage(selectedFile, user.id);
            await chatService.postStory(
                user.id,
                user.name,
                user.avatar?.image || '',
                "Ma nouvelle story LEVELMAK",
                'text',
                imageUrl
            );
            setShowUploadModal(false);
            setUploadPreview(null);
            setSelectedFile(null);
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    // Group stories by user for the overview (like WhatsApp)
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

    return (
        <div className="flex-1 flex flex-col h-full bg-[hsl(var(--background))] overflow-hidden p-4 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Stories</h2>
                <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 uppercase tracking-widest font-black flex items-center gap-1 shadow-glow-sm">
                    <Zap size={10} /> Amis uniquement
                </span>
            </div>

            <div className="grid grid-cols-4 gap-2 flex-1 overflow-y-auto no-scrollbar pb-24">
                {/* My Story Button */}
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="aspect-square bg-[hsl(var(--card))] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-1 group hover:border-primary/50 hover:bg-white/5 transition-all"
                >
                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform relative">
                        <Camera size={16} />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-[#0b141a] flex items-center justify-center text-white">
                            <Plus size={8} strokeWidth={4} />
                        </div>
                    </div>
                    <div className="text-center">
                        <span className="text-[8px] font-black text-white uppercase tracking-tight block leading-none">Ma Story</span>
                    </div>
                </button>

                {/* Others' Stories */}
                {Object.entries(groupedStories).map(([userId, data]: any) => (
                    <button
                        key={userId}
                        className="aspect-square bg-[hsl(var(--card))] border border-white/10 rounded-xl overflow-hidden relative group active:scale-95 transition-all"
                    >
                        <img
                            src={data.stories[0].imageUrl || data.user.avatar}
                            alt=""
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black to-transparent">
                            <div className="flex items-center gap-1">
                                <div className="w-5 h-5 rounded-full border border-primary p-0.5 shadow-glow-sm">
                                    <img src={data.user.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                                </div>
                                <span className="text-[8px] font-bold text-white truncate leading-none">{data.user.name.split(' ')[0]}</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowUploadModal(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-[hsl(var(--sidebar))] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col p-6 space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">Nouvelle Story</h3>
                                <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-[9/16] bg-white/5 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/10 transition-all overflow-hidden relative"
                            >
                                {uploadPreview ? (
                                    <img src={uploadPreview} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <>
                                        <Camera size={48} className="text-slate-600" />
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center px-8">
                                            Clique pour choisir une photo
                                        </p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile || isUploading}
                                className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-glow hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
                            >
                                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                                {isUploading ? 'Envoi...' : 'Partager Maintenant'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StoriesView;
