import React, { useState, useEffect, useRef } from 'react';
import { Newspaper, Send, Image as ImageIcon, Video, Heart, MessageCircle, Share2, MoreHorizontal, Loader2, Zap, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, SocialPost } from '../../services/communityService';
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
    const [expandedComments, setExpandedComments] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const mediaInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubPosts = chatService.listenToPosts((newPosts) => {
            console.log('[Feed] Posts updated:', newPosts.length);
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
        console.log('[Feed] Creating post...');
        try {
            let mediaUrl = undefined;
            let mediaType: 'image' | 'video' | undefined = undefined;

            if (selectedMedia) {
                console.log('[Feed] Uploading media...');
                mediaUrl = await chatService.uploadMedia(selectedMedia, user.id, 'posts');
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

            console.log('[Feed] Post created successfully');
            setPostContent('');
            setSelectedMedia(null);
            setMediaPreview(null);
        } catch (error) {
            console.error("[Feed] Post creation failed", error);
            alert("Erreur lors de la publication. Veuillez réessayer.");
        } finally {
            setIsPosting(false);
        }
    };

    const handleLike = (postId: string) => {
        if (!user) return;
        chatService.likePost(postId, user.id);
    };

    const handleAddComment = async (postId: string) => {
        if (!commentText.trim() || !user) return;
        try {
            await chatService.addComment(
                postId,
                user.id,
                user.name,
                user.avatar?.image || '',
                commentText.trim()
            );
            setCommentText('');
        } catch (error) {
            console.error("Comment failed", error);
        }
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

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020617] overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">
                
                {/* ═══════════ CREATE POST ═══════════ */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative group p-6 rounded-[32px] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-xl"
                >
                    <div className="flex gap-4">
                        <div className="shrink-0">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-[1.5px] shadow-lg">
                                <div className="w-full h-full rounded-[14.5px] bg-slate-900 overflow-hidden flex items-center justify-center">
                                    {user?.avatar?.image ? (
                                        <img src={user.avatar.image} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <span className="text-white font-black">{user?.name?.[0]}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 space-y-4">
                            <textarea
                                value={postContent}
                                onChange={(e) => setPostContent(e.target.value)}
                                placeholder="Quoi de neuf aujourd'hui ?"
                                className="w-full bg-transparent border-none resize-none outline-none text-white text-lg placeholder:text-slate-600 font-medium min-h-[80px] pt-1"
                            />
                            
                            {mediaPreview && (
                                <div className="relative rounded-3xl overflow-hidden border border-white/10 group/preview shadow-2xl bg-black/40">
                                    <img src={mediaPreview} className="w-full max-h-72 object-contain" alt="" />
                                    <button
                                        onClick={() => { setSelectedMedia(null); setMediaPreview(null); }}
                                        className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-red-500 transition-all backdrop-blur-md"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => mediaInputRef.current?.click()}
                                        className="p-3 bg-white/5 text-slate-400 hover:text-white hover:bg-blue-600/20 rounded-2xl transition-all border border-transparent hover:border-blue-500/30"
                                    >
                                        <ImageIcon size={20} />
                                    </button>
                                    <button
                                        onClick={() => mediaInputRef.current?.click()}
                                        className="p-3 bg-white/5 text-slate-400 hover:text-white hover:bg-purple-600/20 rounded-2xl transition-all border border-transparent hover:border-purple-500/30"
                                    >
                                        <Video size={20} />
                                    </button>
                                    <input type="file" ref={mediaInputRef} accept="image/*,video/*" onChange={handleMediaSelect} className="hidden" />
                                </div>
                                <button
                                    onClick={handleCreatePost}
                                    disabled={(!postContent.trim() && !selectedMedia) || isPosting}
                                    className="px-8 py-3 bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all flex items-center gap-3"
                                >
                                    {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Publier
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ═══════════ FEED ═══════════ */}
                <div className="space-y-8">
                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            /* Loading State */
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 h-64 animate-pulse" />
                            ))
                        ) : posts.length > 0 ? (
                            posts.map((post, idx) => (
                                <motion.div
                                    key={post.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="relative group bg-white/[0.02] border border-white/[0.08] rounded-[40px] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] backdrop-blur-3xl"
                                >
                                    {/* Glassmorphic border glow */}
                                    <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-[40px]"></div>

                                    <div className="p-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-inner">
                                                    <img src={post.userAvatar} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-black text-white tracking-tight">{post.userName}</h4>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">
                                                        {post.createdAt?.toDate?.().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) || 'À l\'instant'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)}
                                                    className="w-10 h-10 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all flex items-center justify-center"
                                                >
                                                    <MoreHorizontal size={20} />
                                                </button>

                                                <AnimatePresence>
                                                    {activeMenu === post.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                            className="absolute right-0 top-12 bg-[#0f172a] border border-white/10 rounded-2xl p-2 shadow-2xl z-20 min-w-[160px] backdrop-blur-xl"
                                                        >
                                                            {post.userId === user?.id ? (
                                                                <button
                                                                    onClick={() => handleDeletePost(post.id)}
                                                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                                                >
                                                                    <Trash2 size={16} /> Supprimer
                                                                </button>
                                                            ) : (
                                                                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                                                     Signaler
                                                                </button>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <p className="text-slate-200 text-base leading-[1.8] font-medium selection:bg-blue-500 selection:text-white whitespace-pre-wrap">{post.content}</p>
                                        </div>
                                    </div>

                                    {post.mediaUrl && (
                                        <div className="mx-6 mb-6 rounded-[32px] overflow-hidden border border-white/10 bg-black/40 group/media shadow-inner relative">
                                            {post.mediaType === 'video' ? (
                                                <video src={post.mediaUrl} controls className="w-full rounded-[30px]" />
                                            ) : (
                                                <img src={post.mediaUrl} className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-1000" alt="" />
                                            )}
                                            {/* Hover overlay hint */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity pointer-events-none"></div>
                                        </div>
                                    )}

                                    <div className="px-8 py-6 bg-white/[0.01] border-t border-white/[0.03] flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleLike(post.id)}
                                                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all border ${post.likes?.includes(user?.id || '') 
                                                    ? 'text-pink-500 bg-pink-500/10 border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]' 
                                                    : 'text-slate-500 bg-white/5 border-transparent hover:text-white hover:border-white/10'}`}
                                            >
                                                <Heart size={20} weight="fill" fill={post.likes?.includes(user?.id || '') ? 'currentColor' : 'none'} className={post.likes?.includes(user?.id || '') ? 'scale-110 animate-bounce' : ''} />
                                                <span className="text-[11px] font-black uppercase tracking-widest">{post.likes?.length || 0}</span>
                                            </button>
                                            
                                            <button
                                                onClick={() => setExpandedComments(expandedComments === post.id ? null : post.id)}
                                                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all border ${expandedComments === post.id 
                                                    ? 'text-blue-400 bg-blue-600/10 border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
                                                    : 'text-slate-500 bg-white/5 border-transparent hover:text-white hover:border-white/10'}`}
                                            >
                                                <MessageCircle size={20} />
                                                <span className="text-[11px] font-black uppercase tracking-widest">{post.comments?.length || 0}</span>
                                            </button>
                                        </div>
                                        
                                        <button className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                                            <Share2 size={20} />
                                        </button>
                                    </div>

                                    {/* ═══════════ COMMENTS ═══════════ */}
                                    <AnimatePresence>
                                        {expandedComments === post.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-white/[0.03] bg-white/[0.005] overflow-hidden"
                                            >
                                                <div className="p-8 space-y-6">
                                                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                                        {(post.comments || []).map((comment: any) => (
                                                            <div key={comment.id} className="flex gap-4 group/comment">
                                                                <div className="shrink-0">
                                                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden shadow-xl">
                                                                        <img src={comment.userAvatar} className="w-full h-full object-cover" alt="" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-[24px] p-4 group-hover/comment:bg-white/[0.05] transition-all">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-sm font-black text-white tracking-tight">{comment.userName}</span>
                                                                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                                                            {new Date(comment.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-400 leading-relaxed">{comment.text}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 shrink-0 overflow-hidden shadow-xl">
                                                            <img src={user?.avatar?.image} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="text"
                                                                value={commentText}
                                                                onChange={(e) => setCommentText(e.target.value)}
                                                                onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                                                                placeholder="Écris ton avis..."
                                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 pr-14 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30 transition-all font-bold shadow-inner"
                                                            />
                                                            <button
                                                                onClick={() => handleAddComment(post.id)}
                                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 hover:scale-110 active:scale-90 transition-all"
                                                            >
                                                                <Send size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-24 text-center space-y-6">
                                <div className="relative mx-auto w-24 h-24">
                                    <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full"></div>
                                    <div className="relative w-full h-full bg-white/[0.03] border border-white/10 rounded-[32px] flex items-center justify-center">
                                        <Newspaper size={32} className="text-slate-800" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-lg font-black text-white">Le fil est vide</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sois le premier à partager quelque chose !</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default FeedView;
