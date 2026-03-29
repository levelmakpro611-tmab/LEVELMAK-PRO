import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import { openrouterService } from '../services/openrouter';
import { fetchAllLivre21Books, Livre21Book } from '../services/livre21';
import { getLocalBooks, formatFileSize } from '../services/localBooks';
import { Quiz, FlashcardDeck, Flashcard, Book as BookType } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
    Book as BookIcon,
    Sparkles,
    Search,
    Download,
    ExternalLink,
    Loader2,
    Globe,
    Trash2,
    Zap,
    Layers,
    BookOpen,
    Clock,
    BarChart3,
    X,
    HardDrive,
    CheckCircle2,
    Wifi,
    WifiOff
} from 'lucide-react';
import Skeleton from '../components/Skeleton';

interface LibraryProps {
    onNavigate: (tab: string) => void;
    onQuizGenerated: (quiz: Quiz) => void;
    onFlashcardsGenerated: (deck: FlashcardDeck, cards: Flashcard[]) => void;
    onReadBook: (book: BookType) => void;
}

const Library: React.FC<LibraryProps> = ({ onNavigate, onQuizGenerated, onFlashcardsGenerated, onReadBook }) => {
    const { user, books, saveBook, deleteBook, incrementBooksRead, addActivity, downloadCourse, offlinePacks, t, settings } = useStore();

    // Library Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchStatus, setSearchStatus] = useState('');
    const [searchIntro, setSearchIntro] = useState('');

    // AI Summary State
    const [activeSummary, setActiveSummary] = useState<any | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);

    // Livre21 State
    const [livre21Books, setLivre21Books] = useState<Livre21Book[]>([]);
    const [isLoadingLivre21, setIsLoadingLivre21] = useState(false);

    // Reader State (Removed legacy, using onReadBook prop)

    // Local Books State
    const [showLocalBooks, setShowLocalBooks] = useState(true);
    const localBooks = getLocalBooks();

    const handleBookSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchStatus(t('library.geminiSearch'));

        try {
            setTimeout(() => {
                if (isSearching) setSearchStatus(t('library.geminiAnalyze'));
            }, 1500);

            const results = await openrouterService.searchBooksWithGemini(searchQuery, settings.language);
            setSearchResults(results.links);
            setSearchIntro(results.text || '');
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsSearching(false);
            setSearchStatus("");
        }
    };

    const handleLoadLivre21Books = async () => {
        setIsLoadingLivre21(true);
        try {
            const books = await fetchAllLivre21Books();
            setLivre21Books(books);
        } catch (error) {
            console.error("Erreur lors du chargement des livres livre21:", error);
        } finally {
            setIsLoadingLivre21(false);
        }
    };

    const handleSummarizeBook = async (book: any) => {
        setIsSummarizing(true);
        try {
            const summary = await openrouterService.summarizeBook(book.title, book.author, book.description, settings.language);
            setActiveSummary({ ...summary, bookTitle: book.title });
        } catch (error) {
            alert("Erreur lors de la génération du résumé.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleReadBook = (url: string, title: string) => {
        const isGoogleSearch = url.includes('google.com') || url.includes('google.fr');
        const isEmbedFriendly = url.includes('gallica.bnf.fr') || url.includes('archive.org') || url.toLowerCase().endsWith('.pdf');

        if (isGoogleSearch || !isEmbedFriendly) {
            window.open(url, '_blank');
        } else {
            // Convert to Book type if needed or pass as partial
            onReadBook({
                id: `book_${Date.now()}`,
                title: title,
                author: 'Auteur',
                uri: url,
                category: 'Lecture',
                cover: 'https://via.placeholder.com/200x300?text=' + encodeURIComponent(title),
                description: ''
            });
        }
        // Ne pas compter comme "lu" au simple clic d'ouverture
    };

    const handleReadSummary = (book: any) => {
        if (!book.content) {
            window.open(book.uri, '_blank');
            return;
        }

        try {
            const summaryData = JSON.parse(book.content);
            setActiveSummary({
                bookTitle: summaryData.title || book.title,
                mainSummary: summaryData.mainSummary,
                keyTakeaways: summaryData.keyPoints || summaryData.keyTakeaways || [],
                difficulty: summaryData.difficulty || 'Moyen',
                estimatedReadingTime: summaryData.estimatedReadingTime || '5 min',
                definitions: summaryData.definitions || []
            });
            // Ne pas compter comme "lu" ici, l'élève n'a fait qu'ouvrir le résumé
        } catch (e) {
            console.error("Failed to parse summary content", e);
            window.open(book.uri, '_blank');
        }
    };

    const handleCreateQuizFromBook = async (book: any) => {
        setIsSearching(true);
        try {
            const quiz = await openrouterService.generateQuiz(book.description, book.title, 'Intermédiaire', settings.language);
            onQuizGenerated(quiz);
            onNavigate('quiz');
        } catch (error) {
            alert("Impossible de générer le quiz.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleCreateFlashcardsFromBook = async (book: any) => {
        setIsSearching(true);
        try {
            const strDescription = typeof book.description === 'string'
                ? book.description
                : book.title + " " + (book.author || '');

            const cards = await openrouterService.generateFlashcards(strDescription, book.title, settings.language);

            const deck: FlashcardDeck = {
                id: `deck_${Date.now()}`,
                title: `Flashcards: ${book.title}`,
                subject: book.category || 'Lecture',
                cardCount: cards.length,
                lastStudied: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };

            onFlashcardsGenerated(deck, cards);
            onNavigate('flashcards');
        } catch (error) {
            console.error(error);
            alert("Impossible de générer les flashcards.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSaveBook = (book: any) => {
        saveBook({
            id: book.id || `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: book.title,
            author: book.authors || book.author || 'Auteur Inconnu',
            category: book.category || 'Général',
            cover: book.thumbnail || book.cover || 'https://via.placeholder.com/200x300?text=No+Cover',
            description: book.description || '',
            uri: book.pdfUrl || book.downloadLink || book.uri,
            fallbacks: (book as any).fallbacks
        });

        const audio = new Audio('/sounds/success.mp3');
        audio.play().catch(() => { });
    };

    const handleExportPDF = () => {
        if (!activeSummary) return;

        const doc = new jsPDF();
        const title = activeSummary.bookTitle || 'Résumé LEVELMAK';

        // Header
        doc.setFillColor(37, 99, 235); // Blue 600
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('LEVELMAK - RÉSUMÉ IA', 20, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString(), 170, 25);

        // Content
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 20, 55);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const splitSummary = doc.splitTextToSize(activeSummary.mainSummary, 170);
        doc.text(splitSummary, 20, 70);

        let yPos = 70 + (splitSummary.length * 7);

        // Key Points
        if (activeSummary.keyTakeaways && activeSummary.keyTakeaways.length > 0) {
            yPos += 10;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Points Clés', 20, yPos);
            yPos += 10;

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            activeSummary.keyTakeaways.forEach((point: string) => {
                if (yPos > 270) { doc.addPage(); yPos = 20; }
                const splitPoint = doc.splitTextToSize(`• ${point}`, 160);
                doc.text(splitPoint, 25, yPos);
                yPos += (splitPoint.length * 6);
            });
        }

        // Glossary
        if (activeSummary.definitions && activeSummary.definitions.length > 0) {
            yPos += 15;
            if (yPos > 250) { doc.addPage(); yPos = 20; }
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Glossaire', 20, yPos);
            yPos += 10;

            doc.setFontSize(10);
            activeSummary.definitions.forEach((def: any) => {
                if (yPos > 270) { doc.addPage(); yPos = 20; }
                doc.setFont('helvetica', 'bold');
                doc.text(`${def.term}:`, 25, yPos);
                doc.setFont('helvetica', 'normal');
                const splitDef = doc.splitTextToSize(def.definition, 140);
                doc.text(splitDef, 50, yPos);
                yPos += Math.max(7, splitDef.length * 5);
            });
        }

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} sur ${pageCount} - Généré par LEVELMAK AI`, 105, 290, { align: 'center' });
        }

        doc.save(`Resume_${title.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDownloadAndSave = (book: any) => {
        handleSaveBook(book);

        const link = document.createElement('a');
        link.href = book.pdfUrl || book.downloadLink || book.uri;
        link.setAttribute('download', `${book.title}.pdf`);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addActivity('reading', 'Livre Conservé 📚', `Tu as téléchargé "${book.title}" et il a été ajouté à ta collection privée.`);
    };

    return (
        <div className="max-w-6xl mx-auto py-4 md:py-8 space-y-8 md:space-y-12 animate-fade-in px-4 md:px-0">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-8 border-b border-slate-200 dark:border-white/5 pb-8 md:pb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 md:gap-3 text-blue-600 dark:text-primary-light font-black uppercase tracking-[0.2em] text-[10px] md:text-xs">
                        <BookIcon size={14} /> {t('library.subtitle')}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tighter leading-none">{t('library.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm md:text-lg font-medium max-w-xl">{t('library.desc')}</p>
                </div>

                <form onSubmit={handleBookSearch} className="w-full lg:max-w-md relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <div className="relative">
                        <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('library.searchPlaceholder')}
                            className="w-full pl-12 md:pl-14 pr-24 md:pr-32 py-4 md:py-5 bg-black/[0.03] dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white font-bold placeholder:text-slate-400 text-sm md:text-base"
                        />
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="absolute right-1.5 md:right-2 top-1.5 md:top-2 bottom-1.5 md:bottom-2 px-3 md:px-6 bg-gradient-to-r from-primary to-secondary text-white rounded-lg md:rounded-xl font-black uppercase tracking-widest text-[8px] md:text-[10px] flex items-center gap-1 md:gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSearching ? <Loader2 size={12} className="md:w-[14px] md:h-[14px] animate-spin" /> : t('library.searchBtn')}
                        </button>
                    </div>
                </form>
            </div>

            <div className="flex justify-center py-6">
                <button
                    onClick={handleLoadLivre21Books}
                    disabled={isLoadingLivre21}
                    className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-glow flex items-center gap-2 md:gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                    {isLoadingLivre21 ? (
                        <>
                            <Loader2 size={16} className="md:w-[18px] md:h-[18px] animate-spin" />
                            {t('common.loading')}
                        </>
                    ) : (
                        <>
                            <Download size={16} className="md:w-[18px] md:h-[18px]" />
                            {t('library.freeBooks')}
                        </>
                    )}
                </button>
            </div>

            {isLoadingLivre21 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="glass p-6 rounded-[2rem] border border-white/5 space-y-4">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="space-y-2 pt-3 border-t border-white/5">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showLocalBooks && localBooks.length > 0 && (
                <div className="space-y-8 animate-slide-up">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center border border-purple-500/20">
                                    <HardDrive size={20} />
                                </div>
                                {t('library.localBooks')} ({localBooks.length})
                            </h3>
                        </div>
                        <button onClick={() => setShowLocalBooks(false)} className="text-xs font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors py-2 px-4 rounded-xl hover:bg-red-500/10">{t('library.hide')}</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {localBooks.map((book) => (
                            <div key={book.id} className="glass p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl hover:border-purple-500/30 transition-all group relative overflow-hidden flex flex-col">
                                <div className="absolute top-4 right-4 z-10">
                                    <span className="px-2.5 py-1 bg-purple-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                                        {book.category}
                                    </span>
                                </div>

                                <div className="relative z-10 space-y-4 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h4 className="font-display font-bold text-slate-900 dark:text-white text-base mb-1 line-clamp-2 leading-tight group-hover:text-purple-500 transition-colors">{book.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">📁 {t('library.localBooks')}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{formatFileSize(book.sizeBytes)}</p>
                                    </div>

                                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
                                        <button
                                            onClick={() => handleReadBook(book.filePath, book.title)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white hover:bg-purple-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-glow"
                                        >
                                            <Download size={14} /> {t('library.download')}
                                        </button>
                                        <button
                                            onClick={() => onReadBook({
                                                id: book.id,
                                                title: book.title,
                                                author: 'Ma Collection Locale',
                                                uri: book.filePath,
                                                category: book.category,
                                                cover: '/logo.png',
                                                description: 'Livre local'
                                            })}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 text-purple-500 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-purple-500/20"
                                        >
                                            <ExternalLink size={12} /> {t('library.open')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isSearching && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                    {[1, 2].map(i => (
                        <div key={i} className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-6">
                            <div className="flex gap-2">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                            <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                            <div className="space-y-3">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <div className="space-y-2 pt-3 border-t border-white/5">
                                    <Skeleton className="h-12 w-full" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {searchResults.length > 0 && (
                <div className="space-y-8 animate-slide-up">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500/10 text-blue-600 dark:text-secondary rounded-xl flex items-center justify-center border border-blue-500/20 shadow-glow">
                                    <Sparkles size={20} />
                                </div>
                                {t('library.analyzing')}
                            </h3>
                            <button onClick={() => { setSearchResults([]); setSearchIntro(''); }} className="text-xs font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors py-2 px-4 rounded-xl hover:bg-red-500/10">{t('library.clear')}</button>
                        </div>

                        {searchIntro && (
                            <div className="p-6 bg-blue-600/5 dark:bg-blue-600/10 border border-blue-600/20 rounded-[2rem] relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl group-hover:bg-blue-600/10 transition-colors"></div>
                                <p className="text-sm md:text-base text-slate-700 dark:text-blue-100 italic leading-relaxed relative z-10 flex gap-4">
                                    <span className="text-2xl opacity-50">"</span>
                                    {searchIntro}
                                    <span className="text-2xl self-end opacity-50">"</span>
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {searchResults.map((book: any, idx) => (
                            <div key={idx} className="glass p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl hover:border-blue-500/30 transition-all group relative overflow-hidden flex flex-col hover:-translate-y-1">
                                <div className="absolute top-4 left-4 z-10 flex gap-2">
                                    <span className="px-2.5 py-1 bg-blue-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-glow flex items-center gap-1">
                                        <Zap size={10} /> {t('library.reco')}
                                    </span>
                                    <span className="px-2.5 py-1 bg-slate-800 text-white rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10">
                                        {book.source || 'Biblio IA'}
                                    </span>
                                </div>

                                {book.thumbnail && (
                                    <div className="mb-4 rounded-xl overflow-hidden aspect-[3/4] bg-slate-100 dark:bg-slate-800/50">
                                        <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                )}

                                <div className="relative z-10 space-y-4 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h4 className="font-display font-bold text-slate-900 dark:text-white text-base mb-1 line-clamp-2 leading-tight group-hover:text-blue-500 transition-colors">{book.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">{book.authors}</p>
                                        {book.description && (
                                            <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">{book.description}</p>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                                        <button
                                            onClick={() => handleReadBook(book.uri, book.title)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-glow"
                                        >
                                            <ExternalLink size={14} /> {t('library.startRead')}
                                        </button>

                                        {book.fallbacks && Object.keys(book.fallbacks).length > 0 && (
                                            <div className="space-y-1.5 px-1">
                                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Globe size={12} /> {t('library.sources')}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(book.fallbacks).map(([name, url]) => (
                                                        <a
                                                            key={name}
                                                            href={url as string}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-lg text-[9px] font-bold transition-all hover:border-blue-500/30"
                                                        >
                                                            {name}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => handleDownloadAndSave(book)}
                                                className="flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                <Download size={12} /> {t('library.download')}
                                            </button>

                                            <button
                                                onClick={() => handleSaveBook(book)}
                                                className="flex items-center justify-center gap-2 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-white/10 text-slate-900 dark:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
                                            >
                                                <BookIcon size={12} /> {t('library.keep')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {livre21Books.length > 0 && (
                <div className="space-y-8 animate-slide-up">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center border border-green-500/20">
                                    <BookOpen size={20} />
                                </div>
                                {t('library.freeBooks')} ({livre21Books.length})
                            </h3>
                        </div>
                        <button onClick={() => setLivre21Books([])} className="text-xs font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors py-2 px-4 rounded-xl hover:bg-red-500/10">{t('library.hide')}</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {livre21Books.map((book, idx) => (
                            <div key={idx} className="glass p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl hover:border-green-500/30 transition-all group relative overflow-hidden flex flex-col">
                                <div className="absolute top-4 right-4 z-10">
                                    <span className="px-2.5 py-1 bg-green-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                                        {book.category}
                                    </span>
                                </div>

                                <div className="relative z-10 space-y-4 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h4 className="font-display font-bold text-slate-900 dark:text-white text-base mb-1 line-clamp-2 leading-tight group-hover:text-green-500 transition-colors">{book.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">livre21.com</p>
                                    </div>

                                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
                                        <button
                                            onClick={() => handleReadBook(book.pdfUrl, book.title)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-glow"
                                        >
                                            <ExternalLink size={14} /> {t('library.readOnline')}
                                        </button>
                                        <button
                                            onClick={() => handleDownloadAndSave(book)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                        >
                                            <Download size={12} /> {t('library.downloadKeep')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-8">
                <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/10 text-blue-600 dark:text-secondary rounded-lg md:rounded-xl flex items-center justify-center border border-blue-500/20">
                        <BookIcon size={18} />
                    </div>
                    {t('library.privateCollection')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-8 pb-32 md:pb-0">
                    {books.map(book => (
                        <div key={book.id} className="group relative">
                            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3 shadow-xl transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-blue-500/20">
                                <img src={book.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={book.title} />
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center p-4 gap-2">
                                    <button
                                        onClick={() => handleSummarizeBook(book)}
                                        className="w-full py-2 md:py-2.5 bg-blue-500 text-white rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 md:gap-2"
                                    >
                                        <Sparkles size={11} className="md:w-3 md:h-3" /> {t('library.summarize')}
                                    </button>
                                    <button
                                        onClick={() => handleCreateFlashcardsFromBook(book)}
                                        className="w-full py-2 bg-purple-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <Layers size={12} /> {t('library.flashcards')}
                                    </button>
                                    <button
                                        onClick={() => handleCreateQuizFromBook(book)}
                                        className="w-full py-2 bg-orange-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <Zap size={12} /> {t('library.quiz')}
                                    </button>
                                    {book.category === 'Synthèse' ? (
                                        <button
                                            onClick={() => handleReadSummary(book)}
                                            className="w-full py-2 bg-white text-slate-900 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <BookOpen size={12} /> {t('library.read')}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onReadBook(book)}
                                            className="w-full py-2 bg-white text-slate-900 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={12} /> {t('library.read')}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <h4 className="font-bold text-slate-900 dark:text-white truncate text-xs">{book.title}</h4>
                                <p className="text-slate-500 text-[10px] font-medium truncate">{book.author}</p>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(t('library.deleteConfirm'))) deleteBook(book.id);
                                }}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    ))}
                </div>

                {activeSummary && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-white/5">
                            <div className="p-6 md:p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                                            <Sparkles size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('library.summaryTitle')}</h2>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{activeSummary.bookTitle}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveSummary(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                        <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{activeSummary.mainSummary}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <BarChart3 size={12} /> {t('library.keyPoints')}
                                            </h4>
                                            <ul className="space-y-2">
                                                {activeSummary.keyTakeaways.map((item: string, i: number) => (
                                                    <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                    <Clock size={14} /> {t('library.readingTime')}
                                                </div>
                                                <span className="text-sm font-black text-blue-500">{activeSummary.estimatedReadingTime}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                    <BarChart3 size={14} /> {t('library.difficulty')}
                                                </div>
                                                <span className={`text-sm font-black ${activeSummary.difficulty === 'Facile' ? 'text-green-500' :
                                                    activeSummary.difficulty === 'Moyen' ? 'text-orange-500' : 'text-red-500'
                                                    }`}>{activeSummary.difficulty}</span>
                                            </div>

                                            {activeSummary.definitions && activeSummary.definitions.length > 0 && (
                                                <div className="mt-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <BookIcon size={12} /> {t('library.glossary')}
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {activeSummary.definitions.slice(0, 3).map((def: any, i: number) => (
                                                            <div key={i}>
                                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">{def.term}</p>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{def.definition}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4 pt-4">
                                    <button
                                        onClick={() => {
                                            setActiveSummary(null);
                                            handleCreateQuizFromBook({ title: activeSummary.bookTitle, description: activeSummary.mainSummary });
                                        }}
                                        className="flex-1 min-w-[140px] py-3 md:py-4 bg-primary text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-glow"
                                    >
                                        {t('library.createQuiz')}
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="flex-1 min-w-[140px] py-3 md:py-4 bg-slate-900 text-white border border-white/10 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] flex items-center justify-center gap-2"
                                    >
                                        <Download size={14} /> {t('common.exportPDF')}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (activeSummary) {
                                                const fakeQuizId = `q_${Date.now()}`; // Or use a persistent ID if available
                                                // Simplified download for demo: assuming courseId = bookTitle for now
                                                await downloadCourse(activeSummary.bookTitle);
                                            }
                                        }}
                                        className={`flex-1 min-w-[140px] py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] flex items-center justify-center gap-2 ${offlinePacks.includes(activeSummary.bookTitle)
                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                            }`}
                                    >
                                        {offlinePacks.includes(activeSummary.bookTitle) ? (
                                            <><CheckCircle2 size={14} /> {t('library.downloaded') || 'Téléchargé'}</>
                                        ) : (
                                            <><Download size={14} /> {t('library.offline') || 'Hors-ligne'}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isSummarizing && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4">
                            <Loader2 size={40} className="animate-spin text-blue-500" />
                            <p className="font-black uppercase tracking-widest text-xs text-blue-500">{t('library.loadingSummary')}</p>
                        </div>
                    </div>
                )}

                {/* Legacy Reader Removed */}
            </div>
        </div>
    );
};

export default Library;
