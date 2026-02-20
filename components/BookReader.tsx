
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Maximize2,
    Minimize2,
    Sparkles,
    BookOpen,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Settings,
    Download,
    Share2,
    Info
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { Book } from '../types';

interface BookReaderProps {
    book: Book;
    onClose: () => void;
}

const BookReader: React.FC<BookReaderProps> = ({ book, onClose }) => {
    const { t, addActivity } = useStore();
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // Some URLs might need the Google Docs viewer for better mobile compatibility
    const getViewerUrl = (url: string) => {
        if (!url) return '';

        // Handle local files for Capacitor Webview
        if (url.startsWith('/livre')) {
            // No viewer for local files, just direct path
            return url;
        }

        // For external links, Google Docs viewer is more reliable on mobile webviews.
        if (url.startsWith('http') && !url.includes('google.com') && !url.includes('archive.org')) {
            return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
        }
        return url;
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => {
                console.error(`Error attempting to enable full-screen mode: ${e.message}`);
            });
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    return (
        <div
            id="ultimate-book-reader"
            className="fixed inset-0 flex flex-col"
            style={{
                height: '100vh',
                width: '100vw',
                backgroundColor: '#020617 !important',
                zIndex: 2147483647,
                position: 'fixed',
                top: 0,
                left: 0
            }}
        >
            {/* Debug Tag */}
            <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[2147483647] pointer-events-none">
                <span className="text-[8px] text-white/20 font-mono tracking-tighter">FIX V3 ACTIVE</span>
            </div>
            {/* Top Toolbar */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ y: -100 }}
                        animate={{ y: 0 }}
                        exit={{ y: -100 }}
                        className="absolute top-0 left-0 right-0 z-[100] bg-slate-900 border-b border-white/5 p-4 flex items-center justify-between"
                        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
                    >
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center border border-primary/20">
                                    <BookOpen size={20} />
                                </div>
                                <div className="overflow-hidden">
                                    <h2 className="text-white font-display font-bold text-sm md:text-base truncate max-w-[140px] md:max-w-md">{book.title}</h2>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate">{book.author}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content (PDF Viewer) */}
            <div
                className="flex-1 bg-[#020617] relative flex flex-col items-center justify-center"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)' }}
                onClick={() => setShowControls(!showControls)}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617] z-10">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{t('common.loading')}</p>
                    </div>
                )}

                <iframe
                    src={getViewerUrl(book.uri || '')}
                    className="w-full h-full border-none pointer-events-auto bg-white"
                    title={book.title}
                    allowFullScreen
                    onLoad={() => setIsLoading(false)}
                />

                {/* Forced Fallback if it keeps being blank */}
                {!isLoading && (
                    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 pointer-events-auto opacity-60 hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(book.uri, '_blank');
                            }}
                            className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md"
                        >
                            <ExternalLink size={12} /> Problème d'affichage ? Ouvrir en externe
                        </button>
                    </div>
                )}

                {!showControls && (
                    <div className="absolute top-24 right-6 p-3 bg-black/40 backdrop-blur-md rounded-full text-white/40 animate-pulse">
                        <Settings size={20} />
                    </div>
                )}
            </div>

            {/* Bottom Info Bar */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="absolute bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md border-t border-white/5 p-4 md:p-6 pb-8 md:pb-6"
                    >
                        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                            <div className="flex items-center gap-6">
                                <div className="hidden md:block">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Catégorie</div>
                                    <div className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-bold border border-blue-500/20">
                                        {book.category}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-primary group flex items-center gap-2 cursor-help" title="Lecture en cours">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                                        <span className="text-xs font-black uppercase tracking-widest text-primary-light">Mode Lecture</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.05] active:scale-95 transition-all shadow-glow">
                                    <Sparkles size={14} /> Aide IA
                                </button>
                                <button className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all">
                                    <Share2 size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BookReader;
