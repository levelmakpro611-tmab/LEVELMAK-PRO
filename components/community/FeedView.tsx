import React, { useState, useEffect, useRef } from 'react';
import { Newspaper, Send, Image as ImageIcon, Video, Heart, MessageCircle, Share2, MoreHorizontal, Loader2, Zap, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, SocialPost } from '../../services/firebase-chat';
import { useStore } from '../../hooks/useStore';

const FeedView: React.FC = () => {
    const { user } = useStore();
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [postContent, setPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = chatService.listenToStories(() => { }); // Dummy call to ensure service is ready if needed
        const unsubPosts = chatService.listenToPosts((newPosts) => {
            setPosts(newPosts);
            setLoading(false);
        });
        return () => unsubPosts();
    }, []);

    const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedMedia(file);
            const reader = new FileReader();
            reader.onloadend = () => setMediaPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleCreatePost = async () => {
        if ((!postContent.trim() && !selectedMedia) || !user || isPosting) return;
        setIsPosting(true);
        try {
            let mediaUrl = undefined;
            let mediaType: 'image' | 'video' | undefined = undefined;

            if (selectedMedia) {
                mediaUrl = await chatService.uploadPostMedia(selectedMedia, user.id);
                mediaType = selectedMedia.type.startsWith('video') ? 'video' : 'image';
            }

            await chatService.createPost(
                user.id,
                user.name,
                user.avatar?.image || '',
                postContent.trim(),
                mediaUrl,
                mediaType
            );

            setPostContent('');
            setSelectedMedia(null);
            setMediaPreview(null);
        } catch (error) {
            console.error("Post creation failed", error);
        } finally {
            setIsPosting(false);
        }
    };

    const handleLike = (postId: string) => {
        if (!user) return;
        chatService.likePost(postId, user.id);
    };

    const handleDeletePost = async (postId: string) => {
        if (!window.confirm("Supprimer cette publication ?")) return;
        try {
            await chatService.deletePost(postId);
            setActiveMenu(null);
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handleShare = async (post: SocialPost) => {
        const shareData = {
            title: 'LEVELMAK',
            text: post.content,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(`${post.content}\n\n${window.location.href}`);
                alert("Lien copié dans le presse-papier !");
            }
        } catch (err) {
            console.error('Share failed', err);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[hsl(var(--background))] overflow-hidden p-4 space-y-6">
            <h2 className="text-2xl font-bold text-white">Contenu</h2>

            {/* Create Post Card */}
            <div className="bg-[hsl(var(--card))] border border-white/10 rounded-3xl p-4 space-y-4 shadow-xl">
                <div className="flex gap-3">
                    <div className="shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                            {user?.avatar?.image ? <img src={user.avatar.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-bold">{user?.name?.[0]}</div>}
                        </div>
                    </div>
                    <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Exprime-toi..."
                        className="flex-1 bg-transparent border-none resize-none outline-none text-white text-sm pt-2 min-h-[60px]"
                    />
                </div>

                {mediaPreview && (
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-60 bg-black">
                        <img src={mediaPreview} className="w-full h-full object-contain" alt="Preview" />
                        <button
                            onClick={() => { setSelectedMedia(null); setMediaPreview(null); }}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex gap-2">
                        <button
                            onClick={() => mediaInputRef.current?.click()}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        >
                            <ImageIcon size={20} />
                        </button>
                        <button
                            onClick={() => mediaInputRef.current?.click()}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        >
                            <Video size={20} />
                        </button>
                        <input type="file" ref={mediaInputRef} accept="image/*,video/*" onChange={handleMediaSelect} className="hidden" />
                    </div>
                    <button
                        onClick={handleCreatePost}
                        disabled={(!postContent.trim() && !selectedMedia) || isPosting}
                        className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-glow hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2"
                    >
                        {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Publier
                    </button>
                </div>
            </div>

            {/* Posts Feed */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-24">
                <AnimatePresence mode="popLayout">
                    {posts.length > 0 ? (
                        posts.map((post) => (
                            <motion.div
                                key={post.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-[hsl(var(--card))] border border-white/10 rounded-3xl overflow-hidden shadow-lg relative"
                            >
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                            <img src={post.userAvatar} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">{post.userName}</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                                {post.createdAt?.toDate?.().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) || 'Récent'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)}
                                            className="p-2 text-slate-500 hover:text-white"
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>

                                        <AnimatePresence>
                                            {activeMenu === post.id && post.userId === user?.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                                    className="absolute right-0 top-10 bg-[hsl(var(--sidebar))] border border-white/10 rounded-xl p-1 shadow-2xl z-20 min-w-[140px]"
                                                >
                                                    <button
                                                        onClick={() => handleDeletePost(post.id)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        <Trash2 size={14} /> Supprimer
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="px-4 pb-3">
                                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                                </div>

                                {post.mediaUrl && (
                                    <div className="bg-black/50 aspect-video relative overflow-hidden flex items-center justify-center">
                                        {post.mediaType === 'video' ? (
                                            <video src={post.mediaUrl} controls className="max-w-full max-h-full" />
                                        ) : (
                                            <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />
                                        )}
                                    </div>
                                )}

                                <div className="p-2 px-4 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleLike(post.id)}
                                            className={`flex items-center gap-1.5 p-2 rounded-xl transition-all ${post.likes?.includes(user?.id || '') ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <Heart size={18} fill={post.likes?.includes(user?.id || '') ? 'currentColor' : 'none'} />
                                            <span className="text-xs font-bold">{post.likes?.length || 0}</span>
                                        </button>
                                        <button className="flex items-center gap-1.5 p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                            <MessageCircle size={18} />
                                            <span className="text-xs font-bold">{post.comments?.length || 0}</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleShare(post)}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                    >
                                        <Share2 size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="py-20 text-center text-slate-500 space-y-2">
                            <Newspaper size={48} className="mx-auto opacity-20" />
                            <p>Aucun contenu pour le moment</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FeedView;
