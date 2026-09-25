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
    FlaskConical,
    Activity,
    CheckCircle2,
    RefreshCw,
    Languages,
    BadgeCheck,
    Bold,
    Italic,
    Heading1,
    Heading2,
    Quote,
    List,
    FileDown,
    Plus,
    ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HapticFeedback } from '../services/nativeAdapters';
import { useStore } from '../hooks/useStore';
import { aiService } from '../services/aiService';
import { Story } from '../types';
import { jsPDF } from 'jspdf';
import { getVerifiedStories } from './verifiedStoriesData';
import { writingService, ExtendedStory, generateUUID } from '../services/writingService';
import { supabase } from '../services/supabase';

const CATEGORY_KEYS = ['story', 'poem', 'column', 'essay', 'other'] as const;

const CreativeWriting: React.FC = () => {
        const { user, stories, saveStory, deleteStory, addXp, consumePotion, t, settings, addNotification } = useStore();
    const language = settings.language;
    const consumables = user?.consumables || {};
    const [activeTab, setActiveTab] = useState<'write' | 'my-stories' | 'discover' | 'saved'>('write');

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
    const [activeAiModal, setActiveAiModal] = useState<'review' | 'help' | null>(null);
    const [aiModalContent, setAiModalContent] = useState<string>('');

    // Writing Lab State
    const [writingAnalysis, setWritingAnalysis] = useState<{
        score: number;
        criteria: { style: number; grammar: number; vocabulary: number; structure: number };
        feedback: string;
        corrections: { original: string; correction: string; reason: string }[];
        synonyms: { word: string; suggestions: string[]; context: string }[];
    } | null>(null);
    const [isLabLoading, setIsLabLoading] = useState(false);
    const [activeLabTab, setActiveLabTab] = useState<'corrections' | 'synonyms'>('corrections');

    // View Modal state
    const [viewingStory, setViewingStory] = useState<Story | null>(null);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [discoverCategoryFilter, setDiscoverCategoryFilter] = useState<string>('all');
    
    // Reactions & Saved stories state
    const [likedStories, setLikedStories] = useState<string[]>([]);
    const [storyComments, setStoryComments] = useState<{[storyId: string]: Array<{id: string, author: string, text: string, date: string}>}>({});
    const [commentInput, setCommentInput] = useState<string>('');
    const [savedStoryIds, setSavedStoryIds] = useState<string[]>([]);
    const [autoScrollSpeed, setAutoScrollSpeed] = useState<number>(0);
    const [showScrollSpeedMenu, setShowScrollSpeedMenu] = useState<boolean>(false);
    const readerScrollRef = React.useRef<HTMLDivElement>(null);

    // Load reactions and saved stories per user
    useEffect(() => {
        const likedKey = user?.id ? `levelmak_${user.id}_liked_stories` : 'levelmak_liked_stories';
        const commentsKey = user?.id ? `levelmak_${user.id}_story_comments` : 'levelmak_story_comments';
        const savedKey = user?.id ? `levelmak_${user.id}_saved_stories` : 'levelmak_saved_stories';
        
        const storedLiked = localStorage.getItem(likedKey);
        setLikedStories(storedLiked ? JSON.parse(storedLiked) : []);

        const storedComments = localStorage.getItem(commentsKey);
        setStoryComments(storedComments ? JSON.parse(storedComments) : {});

        const storedSaved = localStorage.getItem(savedKey);
        setSavedStoryIds(storedSaved ? JSON.parse(storedSaved) : []);
    }, [user?.id]);

    // Realtime Supabase Feed Stories State
    const [publicDbStories, setPublicDbStories] = useState<ExtendedStory[]>([]);
    const [isDbLoading, setIsDbLoading] = useState(false);

    // Auto-Scroll effect inside reading modal
    useEffect(() => {
        if (autoScrollSpeed === 0 || !viewingStory) return;
        
        let scrollAmount = 0.25; // slow (2x slower than original 0.5)
        if (autoScrollSpeed === 2) scrollAmount = 0.6; // medium (2x slower than original 1.2)
        if (autoScrollSpeed === 3) scrollAmount = 1.25; // fast (2x slower than original 2.5)

        let animationFrameId: number;
        let currentScroll = readerScrollRef.current ? readerScrollRef.current.scrollTop : 0;

        const scroll = () => {
            if (readerScrollRef.current) {
                const actualScroll = readerScrollRef.current.scrollTop;
                // If user scrolls manually, update our internal tracker
                if (Math.abs(actualScroll - currentScroll) > 2) {
                    currentScroll = actualScroll;
                }
                currentScroll += scrollAmount;
                readerScrollRef.current.scrollTop = currentScroll;
            }
            animationFrameId = requestAnimationFrame(scroll);
        };
        
        animationFrameId = requestAnimationFrame(scroll);
        return () => cancelAnimationFrame(animationFrameId);
    }, [autoScrollSpeed, viewingStory]);

    const handleToggleSaveStory = (storyId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        HapticFeedback.selection();
        const savedKey = user?.id ? `levelmak_${user.id}_saved_stories` : 'levelmak_saved_stories';
        setSavedStoryIds(prev => {
            const isSaved = prev.includes(storyId);
            const next = isSaved ? prev.filter(id => id !== storyId) : [...prev, storyId];
            localStorage.setItem(savedKey, JSON.stringify(next));
            return next;
        });
    };

    // Fetch and Subscribe to Supabase Feed Stories
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        
        const initDbStories = async () => {
            setIsDbLoading(true);
            const dbStories = await writingService.fetchPublicStories();
            setPublicDbStories(dbStories);
            setIsDbLoading(false);
            
            // Subscribe to real-time feed updates
            unsubscribe = writingService.subscribeToStories(async () => {
                const updatedStories = await writingService.fetchPublicStories();
                setPublicDbStories(updatedStories);
            });
        };

        initDbStories();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    // Reactions are persisted directly in their respective handler functions to prevent user overlap race conditions

    const isStoryLiked = (story: Story) => {
        if ('likesArray' in story) {
            return (story as any).likesArray?.includes(user?.id || '') || likedStories.includes(story.id);
        }
        return likedStories.includes(story.id);
    };

    const getStoryComments = (story: Story) => {
        if ('commentsArray' in story) {
            return (story as any).commentsArray || [];
        }
        return storyComments[story.id] || [];
    };

    const handleToggleLike = async (storyId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        HapticFeedback.selection();
        
        const isVerified = VERIFIED_STORIES.some(vs => vs.id === storyId);
        const dbStory = publicDbStories.find(s => s.id === storyId);
        
        if (dbStory) {
            // It's a Supabase feed story
            const currentLikes = dbStory.likesArray || [];
            let newLikes: string[] = [];
            
            if (currentLikes.includes(user?.id || '')) {
                newLikes = currentLikes.filter(id => id !== user?.id);
                setLikedStories(prev => {
                    const next = prev.filter(id => id !== storyId);
                    const likedKey = user?.id ? `levelmak_${user.id}_liked_stories` : 'levelmak_liked_stories';
                    localStorage.setItem(likedKey, JSON.stringify(next));
                    return next;
                });
            } else {
                newLikes = [...currentLikes, user?.id || '00000000-0000-0000-0000-000000000002'];
                setLikedStories(prev => {
                    const next = [...prev, storyId];
                    const likedKey = user?.id ? `levelmak_${user.id}_liked_stories` : 'levelmak_liked_stories';
                    localStorage.setItem(likedKey, JSON.stringify(next));
                    return next;
                });
            }
            
            // Sync to Supabase
            await writingService.publishStory(dbStory, newLikes, dbStory.commentsArray || []);
            // Update local state immediately for fast responsiveness
            setPublicDbStories(prev => prev.map(s => s.id === storyId ? { ...s, likes: newLikes.length, likesArray: newLikes } : s));
        } else {
            // Local story logic
            if (likedStories.includes(storyId)) {
                setLikedStories(prev => {
                    const next = prev.filter(id => id !== storyId);
                    const likedKey = user?.id ? `levelmak_${user.id}_liked_stories` : 'levelmak_liked_stories';
                    localStorage.setItem(likedKey, JSON.stringify(next));
                    return next;
                });
                if (!isVerified) {
                    const targetStory = stories.find(s => s.id === storyId);
                    if (targetStory) {
                        saveStory({
                            ...targetStory,
                            likes: Math.max(0, (targetStory.likes || 0) - 1)
                        });
                    }
                }
            } else {
                setLikedStories(prev => {
                    const next = [...prev, storyId];
                    const likedKey = user?.id ? `levelmak_${user.id}_liked_stories` : 'levelmak_liked_stories';
                    localStorage.setItem(likedKey, JSON.stringify(next));
                    return next;
                });
                if (!isVerified) {
                    const targetStory = stories.find(s => s.id === storyId);
                    if (targetStory) {
                        saveStory({
                            ...targetStory,
                            likes: (targetStory.likes || 0) + 1
                        });
                    }
                }
            }
        }
    };

    const getStoryLikes = (story: Story) => {
        const isVerified = story.id.startsWith('v_') || (story as any).isVerified;
        if (isVerified) {
            return (story.likes || 0) + (likedStories.includes(story.id) ? 1 : 0);
        }
        if ('likesArray' in story) {
            return (story as any).likesArray?.length || 0;
        }
        return story.likes || 0;
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [editorMode, setEditorMode] = React.useState<'edit' | 'preview'>('edit');

    // ✅ Security: replaced dangerouslySetInnerHTML with proper React nodes.
    // Splits on **bold** and *italic* markers to produce <strong>/<em> elements
    // with no XSS surface — user content is never injected as raw HTML.
    const parseInlineStyles = (text: string) => {
        const segments = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return (
            <span>
                {segments.map((segment, i) => {
                    if (segment.startsWith('**') && segment.endsWith('**') && segment.length > 4) {
                        return <strong key={i}>{segment.slice(2, -2)}</strong>;
                    } else if (segment.startsWith('*') && segment.endsWith('*') && segment.length > 2) {
                        return <em key={i}>{segment.slice(1, -1)}</em>;
                    }
                    return segment || null;
                })}
            </span>
        );
    };


    const renderMarkdown = (text: string) => {
        if (!text.trim()) {
            return <p className="text-slate-400 italic text-center py-10">Votre chef-d'œuvre commencera à apparaître ici au fur et à mesure de votre écriture...</p>;
        }

        const lines = text.split('\n');
        return (
            <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed font-serif text-base md:text-lg">
                {lines.map((line, idx) => {
                    let trimmed = line.trim();
                    
                    if (trimmed.startsWith('# ')) {
                        return <h1 key={idx} className="text-3xl font-display font-black text-slate-900 dark:text-white pt-4 pb-2 border-b border-white/10 uppercase tracking-tight">{trimmed.substring(2)}</h1>;
                    }
                    if (trimmed.startsWith('## ')) {
                        return <h2 key={idx} className="text-2xl font-display font-bold text-slate-900 dark:text-white pt-3 pb-1 border-b border-white/5">{trimmed.substring(3)}</h2>;
                    }
                    if (trimmed.startsWith('> ')) {
                        return <blockquote key={idx} className="border-l-4 border-secondary bg-secondary/5 pl-4 py-2 my-2 rounded-r-lg italic text-slate-400">{trimmed.substring(2)}</blockquote>;
                    }
                    if (trimmed.startsWith('- ')) {
                        return <li key={idx} className="list-disc list-inside pl-2 text-slate-600 dark:text-slate-400">{parseInlineStyles(trimmed.substring(2))}</li>;
                    }
                    if (trimmed === '') {
                        return <div key={idx} className="h-2" />;
                    }
                    return <p key={idx} className="text-justify leading-loose tracking-wide">{parseInlineStyles(line)}</p>;
                })}
            </div>
        );
    };

    const insertFormat = (type: 'bold' | 'italic' | 'h1' | 'h2' | 'quote' | 'list') => {
        HapticFeedback.selection();
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);

        let replacement = '';
        switch (type) {
            case 'bold':
                replacement = `**${selectedText || 'texte_gras'}**`;
                break;
            case 'italic':
                replacement = `*${selectedText || 'texte_italique'}*`;
                break;
            case 'h1':
                replacement = `\n# ${selectedText || 'Titre 1'}\n`;
                break;
            case 'h2':
                replacement = `\n## ${selectedText || 'Titre 2'}\n`;
                break;
            case 'quote':
                replacement = `\n> ${selectedText || 'Citation'}\n`;
                break;
            case 'list':
                replacement = `\n- ${selectedText || 'Élément'}\n`;
                break;
        }

        const newContent = text.substring(0, start) + replacement + text.substring(end);
        setContent(newContent);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + replacement.length, start + replacement.length);
        }, 50);
    };

    const exportToPDF = () => {
        if (!content.trim()) return;
        HapticFeedback.success();
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxLineWidth = pageWidth - (margin * 2);
        
        // 1. Header background and title
        doc.setFillColor(30, 41, 59); // Slate-800
        doc.rect(0, 0, pageWidth, 45, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(title || "Mon Chef-d'œuvre", margin, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'oblique');
        doc.text(`Rédigé sur LEVELMAK Pro par ${user?.name || 'Étudiant Élite'} - le ${new Date().toLocaleDateString()}`, margin, 32);
        
        // 2. Body Text
        doc.setTextColor(51, 65, 85); // Slate-700
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        
        const lines = doc.splitTextToSize(content, maxLineWidth);
        let y = 60;
        
        lines.forEach((line: string) => {
            if (y > pageHeight - margin) {
                doc.addPage();
                doc.setFillColor(30, 41, 59);
                doc.rect(0, 0, pageWidth, 15, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(title || "Mon Chef-d'œuvre", margin, 10);
                
                doc.setTextColor(51, 65, 85);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);
                y = 30;
            }
            doc.text(line, margin, y);
            y += 8; // Line spacing
        });
        
        doc.save(`${title || 'mon_histoire'}.pdf`);
    };

    // Discovery state - Filter real public stories from the store + Verified Community Stories
    const VERIFIED_STORIES: Story[] = getVerifiedStories(language);

    const discoverStories = [...VERIFIED_STORIES, ...publicDbStories.filter(s => !VERIFIED_STORIES.some(vs => vs.id === s.id))];
    const filteredDiscoverStories = discoverStories.filter(story => 
        discoverCategoryFilter === 'all' ? true : story.category === discoverCategoryFilter
    );

    // Auto-save logic
    useEffect(() => {
        if (content.length > 50) {
            const timer = setTimeout(() => {
                handleSave(true);
            }, 30000); // 30s auto-save
            return () => clearTimeout(timer);
        }
    }, [content, title]);

    const handleSave = async (isAuto = false, isPublishAction = false) => {
        if (!title || !content || !user) return;
        if (!isAuto) setIsSaving(true);

        const currentStory = editingId ? stories.find(s => s.id === editingId) : null;
        
        // If it's a publish action, we set isPublic = true, and update publishedContent
        // If it's just a save, we keep the previous values of isPublic and publishedContent
        const newIsPublic = isPublishAction ? true : (currentStory ? currentStory.isPublic : isPublic);
        const newPublishedContent = isPublishAction ? content : (currentStory ? (currentStory.publishedContent || '') : '');

        let storyId = editingId || `story_${Date.now()}`;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (isPublishAction && !uuidRegex.test(storyId)) {
            // Delete the old non-UUID local story if editing an existing local story
            if (editingId) {
                deleteStory(editingId);
            }
            storyId = generateUUID();
        }

        const story: Story = {
            id: storyId,
            title,
            content,
            publishedContent: newPublishedContent,
            authorId: user.id,
            authorName: user.name,
            category,
            isPublic: newIsPublic,
            likes: currentStory ? (currentStory.likes || 0) : 0,
            createdAt: lastSaved?.toISOString() || new Date().toISOString(),
            coverImage: coverImage || undefined
        };

        if (editingId !== storyId) setEditingId(storyId);
        setIsPublic(newIsPublic); // Keep UI state in sync

        saveStory(story);
        setLastSaved(new Date());

        if (isPublishAction) {
            const dbStory = publicDbStories.find(s => s.id === storyId);
            const likesArray = dbStory ? dbStory.likesArray : [];
            const commentsArray = dbStory ? dbStory.commentsArray : [];
            
            const published = await writingService.publishStory(story, likesArray, commentsArray);
            if (published) {
                console.log('[CreativeWriting] Story published successfully to Supabase:', published);
                setPublicDbStories(prev => {
                    const exists = prev.some(p => p.id === published.id);
                    if (exists) {
                        return prev.map(p => p.id === published.id ? published : p);
                    } else {
                        return [published, ...prev];
                    }
                });
            }
        }

        // AI/Plagiarism check (not on auto-saves)
        if (!isAuto) {
            const existingTitles = discoverStories.map(s => s.title).filter(t => t !== title);
            aiService.checkWritingPlagiarismAndAI(content, title, existingTitles).then(async (detection) => {
                if (detection.isPlagiarizedOrAI) {
                    addNotification('streak_risk', 'Alerte Plagiat / IA ⚠️', detection.reason);
                    
                    try {
                        const { error: reportError } = await supabase.from('reports').insert({
                            reporter_id: 'system',
                            target_id: storyId,
                            target_type: 'story',
                            reason: `[DÉTECTION IA/PLAGIAT] Titre: "${title}". Raison: ${detection.reason}. Confiance IA: ${detection.aiConfidence}%, Plagiat: ${detection.plagiarismConfidence}%`,
                            status: 'pending',
                            timestamp: new Date().toISOString()
                        });
                        if (reportError) console.error('Error reporting plagiarized story:', reportError);
                    } catch (reportErr) {
                        console.error('Failed to auto-report plagiarized story:', reportErr);
                    }
                }
            }).catch(err => {
                console.error('Plagiarism detection process failed:', err);
            });
        }

        if (!isAuto) {
            HapticFeedback.success();
            setTimeout(() => setIsSaving(true), 100); // Trigger saving animation
            setTimeout(() => setIsSaving(false), 800);
        }
    };

    const handleEdit = (story: Story) => {
        if (story.authorId !== user?.id) {
            alert("Vous n'êtes pas l'auteur de ce livre.");
            return;
        }
        setEditingId(story.id);
        setTitle(story.title);
        setContent(story.content);
        setCategory(story.category);
        setIsPublic(story.isPublic);
        setCoverImage(story.coverImage || null);
        setLastSaved(new Date(story.createdAt));
        setActiveTab('write');
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const storyToDelete = stories.find(s => s.id === id) || publicDbStories.find(s => s.id === id);
        if (storyToDelete && storyToDelete.authorId !== user?.id) {
            alert("Vous n'êtes pas l'auteur de ce livre.");
            return;
        }
        if (window.confirm(t('creativeWriting.list.deleteConfirm'))) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(id)) {
                await writingService.deleteStory(id);
                setPublicDbStories(prev => prev.filter(s => s.id !== id));
            }
            deleteStory(id);
            if (editingId === id) {
                setEditingId(null);
                setTitle('');
                setContent('');
                setCoverImage(null);
            }
        }
    };

    const handleNew = () => {
        setEditingId(null);
        setTitle('');
        setContent('');
        setCategory(CATEGORY_KEYS[0]);
        setIsPublic(false);
        setCoverImage(null);
        setLastSaved(null);
        setActiveTab('write');
    };

    const handleAiAction = async (mode: 'write' | 'review' | 'help') => {
        if (!content.trim()) return;
        setIsAiLoading(true);
        setAiError(null);
        try {
            let response = "";
            if (mode === 'write') {
                const prompt = `Agis comme un écrivain expérimenté. Voici un début de texte ("${title}"): "${content.substring(content.length - 1500)}". Propose-moi une suite créative d'environ 100-150 mots qui s'intègre parfaitement à ce style. Sois inspirant. Réponds en ${language === 'ar' ? 'arabe' : (language === 'en' ? 'anglais' : 'français')}.`;
                response = await aiService.coachChat(prompt, [], `Utilisateur: ${user?.name}, Niveau: ${user?.level}`);
            } else {
                response = await aiService.writingCoachChat(mode, content, title, language);
            }

            setAiSuggestions(prev => [
                { id: `ai_${Date.now()}`, text: response, type: (mode === 'write' || mode === 'help') ? 'suggestion' : 'review' },
                ...prev
            ]);

            if (mode === 'review' || mode === 'help') {
                setAiModalContent(response);
                setActiveAiModal(mode);
            }

            addXp(mode === 'help' ? 5 : 10);
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

            const response = await aiService.coachChat(prompt, [], `Utilisateur: ${user?.name}, Niveau: ${user?.level}`);

            // Extract JSON from response if possible, simplified for now
            let data = { title: "Nouvelle Idée", content: response };
            try {
                const jsonMatch = response.match(/\{.*\}/s);
                if (jsonMatch) data = JSON.parse(jsonMatch[0]);
            } catch (e) { console.error("JSON parse failed", e); }

            consumePotion('potion_inspiration');
            setTitle(data.title);
            setContent(data.content);
            setAiSuggestions(prev => [
                { id: `ai_${Date.now()}`, text: "L'Essence d'Inspiration a fonctionné ! Voici ton idée de génie.", type: 'suggestion' },
                ...prev
            ]);
            addXp(15);
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

    const handleAnalyzeWriting = async () => {
        if (content.length < 50) return;
        setIsLabLoading(true);
        setAiError(null);
        try {
            const analysis = await aiService.analyzeWriting(content, title, language);
            
            // Safety: Ensure all required fields exist to prevent crashes
            const safeAnalysis = {
                score: analysis.score || 0,
                criteria: analysis.criteria || { style: 0, grammar: 0, vocabulary: 0, structure: 0 },
                feedback: analysis.feedback || "Analyse terminée.",
                corrections: Array.isArray(analysis.corrections) ? analysis.corrections : [],
                synonyms: Array.isArray(analysis.synonyms) ? analysis.synonyms : []
            };

            setWritingAnalysis(safeAnalysis);
            addXp(10);
        } catch (e: any) {
            console.error("Analysis failed", e);
            setAiError(t('creativeWriting.coach.errorGeneral'));
            // Reset loading state and show notification if possible
        } finally {
            setIsLabLoading(false);
        }
    };

    const applyCorrection = (original: string, correction: string) => {
        setContent(prev => prev.replace(original, correction));
        setWritingAnalysis(prev => prev ? {
            ...prev,
            corrections: prev.corrections.filter(c => c.original !== original)
        } : null);
    };

    const applySynonym = (word: string, synonym: string) => {
        setContent(prev => prev.replace(word, synonym));
        setWritingAnalysis(prev => prev ? {
            ...prev,
            synonyms: prev.synonyms.filter(s => s.word !== word)
        } : null);
    };

    return (
        <div className="max-w-7xl mx-auto py-2 md:py-8 px-1 sm:px-4 space-y-4 md:space-y-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 border-b border-white/5 pb-8 md:pb-10">
                <div className="space-y-3 md:space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                        <h1 className="text-2xl md:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tighter transition-colors">
                            {t('creativeWriting.title').split(' ')[0]} {t('creativeWriting.title').split(' ').slice(1, -1).join(' ')} <span className="text-gradient-primary">{t('creativeWriting.title').split(' ').pop()}</span>
                        </h1>
                        {editingId && (
                            <button
                                onClick={handleNew}
                                className="w-fit px-4 md:px-6 py-1.5 md:py-2 bg-black/5 dark:bg-white/5 text-slate-900 dark:text-white rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-black/5 dark:border-white/10 transition-all flex items-center gap-1.5 md:gap-2"
                            >
                                <PenTool className="w-3 h-3 md:w-4 md:h-4" /> {t('creativeWriting.newDraft')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="glass p-1 rounded-xl md:rounded-[2rem] border border-white/5 flex flex-nowrap gap-1 shadow-2xl shrink-0 overflow-x-auto scrollbar-hide">
                    {(['write', 'my-stories', 'discover', 'saved'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => { HapticFeedback.selection(); setActiveTab(tab); }}
                            className={`flex-1 md:flex-none px-3 md:px-6 py-2.5 md:py-3.5 rounded-lg md:rounded-[1.5rem] font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all duration-500 flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap ${activeTab === tab ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                        >
                            {tab === 'write' ? <PenTool className="w-3 h-3 md:w-4 md:h-4" /> : tab === 'my-stories' ? <Layout className="w-3 h-3 md:w-4 md:h-4" /> : tab === 'discover' ? <Globe className="w-3 h-3 md:w-4 md:h-4" /> : <ShoppingBag className="w-3 h-3 md:w-4 md:h-4" />}
                            <span>{tab === 'write' ? t('creativeWriting.tabs.write') : tab === 'my-stories' ? t('creativeWriting.tabs.myStories') : tab === 'discover' ? t('creativeWriting.tabs.discover') : t('creativeWriting.tabs.saved')}</span>
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
                            <div className="bg-slate-100/90 dark:bg-slate-950/40 backdrop-blur-3xl rounded-2xl md:rounded-[3rem] border border-slate-300/80 dark:border-white/10 p-2.5 sm:p-6 md:p-10 shadow-premium relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-secondary/40 to-transparent"></div>

                                <div className="space-y-4 md:space-y-8">
                                    <div className="space-y-2 sm:space-y-4">
                                        <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-800 dark:text-slate-400 px-1">{t('creativeWriting.form.titleLabel')}</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder={t('creativeWriting.form.titlePlaceholder')}
                                            className="w-full bg-white dark:bg-white/5 border border-slate-300/80 dark:border-white/10 rounded-xl md:rounded-2xl px-3 md:px-8 py-2.5 md:py-6 text-base md:text-3xl font-display font-black text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:border-secondary/50 outline-none transition-all shadow-sm"
                                        />
                                    </div>

                                    <div className="space-y-2 sm:space-y-4">
                                        <div className="flex items-center justify-between px-1 md:px-4">
                                            <label className="text-[8px] md:text-[10px] font-extrabold uppercase tracking-[0.3em] text-slate-800 dark:text-slate-400">{t('creativeWriting.form.contentLabel')}</label>
                                            <div className="flex items-center gap-3 md:gap-6">
                                                <div className="flex items-center gap-1.5 md:gap-2">
                                                    <Type className="w-3 h-3 md:w-3.5 md:h-3.5 text-secondary" />
                                                    <span className="text-[8px] md:text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest">{content.length} {t('creativeWriting.form.characters')}</span>
                                                </div>
                                                {lastSaved && (
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 text-success" />
                                                        <span className="text-[8px] md:text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest">{lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Rich Editing Toolbar & PDF Export */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 sm:p-3 bg-slate-200/90 dark:bg-slate-950/60 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-slate-300/80 dark:border-white/10 mx-0">
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                                {/* Modes: Edition & Apercu */}
                                                <div className="flex bg-slate-300/80 dark:bg-black/30 p-1 rounded-xl border border-slate-300/80 dark:border-white/5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => { HapticFeedback.selection(); setEditorMode('edit'); }}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                                            editorMode === 'edit'
                                                                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow shadow-primary/20'
                                                                : 'text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        Édition
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { HapticFeedback.selection(); setEditorMode('preview'); }}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                                            editorMode === 'preview'
                                                                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow shadow-primary/20'
                                                                : 'text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        Aperçu Réel 👁️
                                                    </button>
                                                </div>
                                                
                                                {editorMode === 'edit' && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => insertFormat('bold')}
                                                            className="p-2 text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-white/10 rounded-xl transition-all"
                                                            title="Gras (**)"
                                                        >
                                                            <Bold size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => insertFormat('italic')}
                                                            className="p-2 text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-white/10 rounded-xl transition-all"
                                                            title="Italique (*)"
                                                        >
                                                            <Italic size={16} />
                                                        </button>
                                                        <div className="w-[1px] h-4 bg-slate-400/40 dark:bg-white/10 mx-1"></div>
                                                        <button
                                                            type="button"
                                                            onClick={() => insertFormat('h1')}
                                                            className="p-2 text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-white/10 rounded-xl transition-all flex items-center"
                                                            title="Titre 1 (#)"
                                                        >
                                                            <Heading1 size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => insertFormat('h2')}
                                                            className="p-2 text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-white/10 rounded-xl transition-all flex items-center"
                                                            title="Titre 2 (##)"
                                                        >
                                                            <Heading2 size={16} />
                                                        </button>
                                                        <div className="w-[1px] h-4 bg-slate-400/40 dark:bg-white/10 mx-1"></div>
                                                        <button
                                                            type="button"
                                                            onClick={() => insertFormat('quote')}
                                                            className="p-2 text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-white/10 rounded-xl transition-all"
                                                            title="Citation (>)"
                                                        >
                                                            <Quote size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => insertFormat('list')}
                                                            className="p-2 text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-white/10 rounded-xl transition-all"
                                                            title="Liste à puces (-)"
                                                        >
                                                            <List size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {content.trim() && (
                                                <button
                                                    type="button"
                                                    onClick={exportToPDF}
                                                    className="px-3 py-1.5 bg-gradient-to-r from-primary to-secondary hover:scale-[1.03] active:scale-95 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-glow shadow-primary/20"
                                                    title="Exporter mon manuscrit en PDF"
                                                >
                                                    <FileDown size={14} /> PDF
                                                </button>
                                            )}
                                        </div>

                                        {editorMode === 'edit' ? (
                                            <textarea
                                                ref={textareaRef}
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                placeholder={t('creativeWriting.form.contentPlaceholder')}
                                                className="w-full h-[320px] md:h-[600px] bg-white dark:bg-white/5 border border-slate-300/80 dark:border-white/10 rounded-xl md:rounded-[2.5rem] p-3 md:p-12 text-sm md:text-xl leading-relaxed text-slate-900 dark:text-slate-200 placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:border-secondary/50 outline-none transition-all resize-none custom-scrollbar font-medium shadow-inner"
                                            />
                                        ) : (
                                            <div className="w-full h-[320px] md:h-[600px] bg-white/80 dark:bg-slate-950/20 border border-slate-300/80 dark:border-white/10 rounded-xl md:rounded-[2.5rem] p-4 md:p-12 overflow-y-auto custom-scrollbar">
                                                {renderMarkdown(content)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI & Config Side Panel (RHS) */}
                        <div className="lg:col-span-4 space-y-8">
                            {/* AI Coach Area */}
                            <div className="bg-slate-100/90 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[2rem] md:rounded-[3rem] border border-slate-300/80 dark:border-white/5 p-6 md:p-8 space-y-6 md:space-y-8 flex flex-col min-h-[400px] md:min-h-[500px] shadow-xl">
                                <div className="space-y-4 border-b border-slate-300/80 dark:border-white/5 pb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-secondary/20 text-secondary rounded-xl flex items-center justify-center border border-secondary/20 shrink-0">
                                            <Sparkles size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-display font-bold text-base md:text-lg text-slate-900 dark:text-white truncate leading-tight transition-colors">{t('creativeWriting.coach.title')}</h4>
                                            <p className="text-[8px] font-extrabold text-slate-700 dark:text-slate-400 uppercase tracking-widest truncate">{t('creativeWriting.coach.subtitle')}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => {
                                                    if (!content.trim()) {
                                                        alert("Veuillez d'abord écrire du contenu avant de demander un avis.");
                                                        return;
                                                    }
                                                    handleAiAction('review');
                                                }}
                                                disabled={isAiLoading || !content.trim()}
                                                className={`flex-1 py-4 rounded-2xl text-xs font-extrabold uppercase tracking-widest border transition-all ${isAiLoading || !content.trim() ? 'opacity-50 cursor-not-allowed bg-slate-200/50 dark:bg-white/5 border-slate-300 dark:border-white/5 text-slate-400' : 'bg-slate-200/90 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white shadow-md active:scale-95'}`}
                                            >
                                                AVIS
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!content.trim()) {
                                                        alert("Veuillez d'abord écrire du contenu avant de demander de l'aide.");
                                                        return;
                                                    }
                                                    handleAiAction('help');
                                                }}
                                                disabled={isAiLoading || !content.trim()}
                                                className={`flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow shadow-purple-500/20`}
                                            >
                                                {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                                M'AIDER
                                            </button>
                                        </div>
                                        {consumables['potion_inspiration'] > 0 && (
                                            <button
                                                onClick={handleInspirationPotion}
                                                disabled={isAiLoading}
                                                className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all group shadow-inner"
                                            >
                                                <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-amber-500/10 shadow-glow shadow-amber-500/20">
                                                    <img src="/assets/fiole magique/WhatsApp Image 2026-02-10 at 02.26.07.jpeg" alt="Inspiration" className="w-full h-full object-contain group-hover:rotate-12 transition-transform" />
                                                </div>
                                                {t('creativeWriting.coach.potion')} ({consumables['potion_inspiration']})
                                            </button>
                                        )}
                                    </div>

                                    {aiSuggestions.length > 0 && (
                                        <div className="space-y-3 mt-4 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                                            {aiSuggestions.map(sugg => (
                                                <div key={sugg.id} className="p-4 bg-white dark:bg-white/5 border border-slate-300/80 dark:border-white/10 rounded-2xl relative group shadow-sm">
                                                    <button onClick={() => setAiSuggestions(prev => prev.filter(s => s.id !== sugg.id))} className="absolute top-3 right-3 p-1.5 bg-slate-200/80 dark:bg-black/20 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                        <X size={14} />
                                                    </button>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        {sugg.type === 'suggestion' ? <Zap size={14} className="text-secondary" /> : <Sparkles size={14} className="text-primary" />}
                                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-700 dark:text-slate-400">
                                                            {sugg.type === 'suggestion' ? 'Idée' : 'Avis du Coach'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-900 dark:text-slate-200 font-semibold leading-relaxed mb-3 whitespace-pre-wrap line-clamp-3">{sugg.text}</p>
                                                    <button
                                                        onClick={() => {
                                                            setAiModalContent(sugg.text);
                                                            setActiveAiModal(sugg.type === 'suggestion' ? 'help' : 'review');
                                                        }}
                                                        className="text-[9px] font-black uppercase tracking-widest text-secondary hover:text-white transition-colors flex items-center gap-1 bg-secondary/10 px-3 py-1.5 rounded-lg border border-secondary/20 mt-2"
                                                    >
                                                        Lire la suite
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Writing Lab Area */}
                            <div className="bg-slate-100/90 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[2rem] md:rounded-[3rem] border border-slate-300/80 dark:border-white/5 p-6 md:p-8 space-y-6 md:space-y-8 flex flex-col shadow-xl">
                                <div className="space-y-4 border-b border-slate-300/80 dark:border-white/5 pb-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                                                <FlaskConical size={20} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-display font-bold text-base md:text-lg text-slate-900 dark:text-white truncate leading-tight transition-colors">{t('creativeWriting.writingLab.title')}</h4>
                                                <p className="text-[8px] font-extrabold text-slate-700 dark:text-slate-400 uppercase tracking-widest truncate">{t('creativeWriting.writingLab.strength')}</p>
                                            </div>
                                        </div>
                                        {writingAnalysis && (
                                            <div className="relative w-12 h-12 flex items-center justify-center">
                                                <svg className="w-full h-full -rotate-90">
                                                    <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-300 dark:text-white/5" />
                                                    <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={125.6} strokeDashoffset={125.6 * (1 - writingAnalysis.score / 100)} className="text-primary transition-all duration-1000" />
                                                </svg>
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-900 dark:text-white">{writingAnalysis.score}</span>
                                            </div>
                                        )}
                                    </div>

                                    {!writingAnalysis ? (
                                        <button
                                            onClick={handleAnalyzeWriting}
                                            disabled={isLabLoading || content.length < 50}
                                            className="w-full py-4 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-glow flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                                        >
                                            {isLabLoading ? <Loader2 className="animate-spin" size={18} /> : <Activity size={18} />}
                                            {isLabLoading ? t('creativeWriting.writingLab.analyzing') : t('creativeWriting.writingLab.analyzeBtn')}
                                        </button>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setActiveLabTab('corrections')}
                                                className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${activeLabTab === 'corrections' ? 'bg-primary/20 border-primary/40 text-primary font-bold' : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/5 text-slate-700 dark:text-slate-400'}`}
                                            >
                                                {t('creativeWriting.writingLab.corrections')} ({writingAnalysis.corrections.length})
                                            </button>
                                            <button
                                                onClick={() => setActiveLabTab('synonyms')}
                                                className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${activeLabTab === 'synonyms' ? 'bg-primary/20 border-primary/40 text-primary font-bold' : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/5 text-slate-700 dark:text-slate-400'}`}
                                            >
                                                {t('creativeWriting.writingLab.synonyms')} ({writingAnalysis.synonyms.length})
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-6 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                    {!writingAnalysis ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-70">
                                            <FlaskConical size={48} className="text-slate-500 dark:text-slate-600" />
                                            <p className="text-xs font-extrabold text-slate-700 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                                                {t('creativeWriting.writingLab.empty')}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {activeLabTab === 'corrections' ? (
                                                <div className="space-y-4">
                                                    {writingAnalysis.corrections.length === 0 ? (
                                                        <div className="p-8 text-center bg-success/5 border border-success/20 rounded-3xl">
                                                            <CheckCircle2 size={32} className="mx-auto mb-3 text-success" />
                                                            <p className="text-[10px] font-black text-success uppercase tracking-widest">{t('common.success')}</p>
                                                        </div>
                                                    ) : (
                                                        writingAnalysis.corrections.map((corr, i) => (
                                                            <div key={corr.original || `corr-${i}`} className="p-5 bg-danger/5 border border-danger/10 rounded-2xl space-y-3 group hover:border-danger/30 transition-all relative overflow-hidden">
                                                                <div className="absolute top-0 right-0 w-16 h-16 bg-danger/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-danger/10 transition-colors"></div>
                                                                <div className="flex items-start justify-between gap-2 relative z-10">
                                                                    <div className="space-y-1">
                                                                        <span className="text-[8px] font-black text-danger uppercase tracking-widest opacity-70">Erreur détectée</span>
                                                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-through decoration-danger/50 italic">"{corr.original}"</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => applyCorrection(corr.original, corr.correction)}
                                                                        className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all"
                                                                        title={t('creativeWriting.writingLab.apply')}
                                                                    >
                                                                        <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                                                    </button>
                                                                </div>
                                                                <div className="p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                                                                    <p className="text-sm text-slate-900 dark:text-white font-bold transition-colors">→ {corr.correction}</p>
                                                                </div>
                                                                <div className="flex items-start gap-3 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                                                                    <Sparkles size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                                                    <p className="text-[10px] text-slate-800 dark:text-blue-200/70 font-semibold leading-relaxed italic">"{corr.reason}"</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {writingAnalysis.synonyms.map((syn, i) => (
                                                        <div key={syn.word || `syn-${i}`} className="p-5 bg-primary/5 border border-primary/10 rounded-2xl space-y-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Languages size={14} className="text-primary" />
                                                                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest transition-colors">{syn.word}</span>
                                                            </div>
                                                            <p className="text-[9px] text-slate-600 dark:text-slate-500 leading-relaxed mb-3">"{syn.context}"</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {syn.suggestions.map((s, si) => (
                                                                    <button
                                                                        key={si}
                                                                        onClick={() => applySynonym(syn.word, s)}
                                                                        className="px-3 py-1.5 bg-white dark:bg-white/5 hover:bg-primary hover:text-white border border-slate-300 dark:border-white/10 rounded-lg text-[10px] font-bold transition-all text-slate-800 dark:text-slate-300"
                                                                    >
                                                                        {s}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={handleAnalyzeWriting}
                                                        className="w-full py-3 bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-300 dark:border-white/5 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <RefreshCw size={12} /> {t('creativeWriting.writingLab.getSynonyms')}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Document Config Area */}
                            <div className="bg-slate-100/90 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[2rem] md:rounded-[3rem] border border-slate-300/80 dark:border-white/5 p-6 md:p-8 space-y-6 md:space-y-8 shadow-xl">
                                <div className="space-y-6">
                                    {/* Cover Image Selector */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-800 dark:text-slate-400 px-1 truncate block">COUVERTURE DU LIVRE</label>
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full aspect-[3/4] rounded-3xl bg-white dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-secondary/50 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center group relative shadow-inner"
                                        >
                                            {coverImage ? (
                                                <>
                                                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <PenTool size={32} className="text-white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 rounded-2xl bg-slate-200/80 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-500 group-hover:text-secondary group-hover:scale-110 transition-all mb-4">
                                                        <Globe size={32} />
                                                    </div>
                                                    <p className="text-[10px] font-extrabold text-slate-700 dark:text-slate-500 uppercase tracking-widest text-center px-6">Ajouter une image de couverture</p>
                                                </>
                                            )}
                                        </div>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setCoverImage(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            accept="image/*" 
                                            className="hidden" 
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-800 dark:text-slate-400 px-1 truncate block">{t('creativeWriting.form.documentSettings')}</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {CATEGORY_KEYS.map(catKey => (
                                                <button
                                                    key={catKey}
                                                    onClick={() => setCategory(catKey)}
                                                    className={`py-3 px-4 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border transition-all ${category === catKey ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/5 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:text-white'}`}
                                                >
                                                    {t(`creativeWriting.categories.${catKey}`)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-300/80 dark:border-white/5 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isPublic ? 'bg-success/10 text-success' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-500'}`}>
                                                {isPublic ? <Globe size={18} /> : <Lock size={18} />}
                                            </div>
                                            <p className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase tracking-widest transition-colors">{t('creativeWriting.form.public')}</p>
                                        </div>
                                        <button
                                            onClick={() => setIsPublic(!isPublic)}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${isPublic ? 'bg-success' : 'bg-slate-400 dark:bg-slate-700'}`}
                                        >
                                            <motion.div
                                                className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full"
                                                animate={{ x: isPublic ? 20 : 0 }}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => handleSave(false, false)}
                                            disabled={isSaving || !title || !content}
                                            className="w-full py-4 bg-slate-200/90 hover:bg-slate-300/90 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-300/80 dark:border-white/10 text-slate-900 dark:text-white rounded-[1.2rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shadow-md"
                                        >
                                            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                            SAUVEGARDER LE BROUILLON
                                        </button>
                                        <button
                                            onClick={() => handleSave(false, true)}
                                            disabled={isSaving || !title || !content}
                                            className="w-full py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-[1.2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-glow flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                                        >
                                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                            PUBLIER MAINTENANT
                                        </button>
                                    </div>
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
                                    <div className="w-24 h-24 bg-black/5 dark:bg-white/5 rounded-[2rem] flex items-center justify-center border border-black/5 dark:border-white/10 text-slate-400 dark:text-slate-700">
                                        <PenTool size={48} strokeWidth={1} />
                                    </div>
                                    <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white uppercase tracking-tighter transition-colors">{t('creativeWriting.list.empty')}</h3>
                                    <button onClick={() => setActiveTab('write')} className="px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-glow hover:scale-105 transition-all">{t('creativeWriting.list.startBtn')}</button>
                                </motion.div>
                            ) : (
                                stories.map(story => (
                                    <motion.div
                                        key={story.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                        className="glass p-4 rounded-[2.5rem] border border-white/5 hover:border-secondary/30 transition-all group relative overflow-hidden flex flex-col h-[500px]"
                                    >
                                        {/* Cover Image Background */}
                                        <div className="absolute inset-0 z-0">
                                            {story.coverImage ? (
                                                <img src={story.coverImage} alt={`Couverture : ${story.title}`} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-700" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
                                        </div>

                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="px-3 py-1 bg-secondary/20 backdrop-blur-xl border border-secondary/20 text-secondary-light text-[8px] font-black uppercase tracking-widest rounded-full">{t(`creativeWriting.categories.${story.category as any}`)}</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => handleToggleSaveStory(story.id, e)}
                                                        className="p-2 bg-white/10 backdrop-blur-xl rounded-lg text-slate-300 hover:text-white transition-all hover:scale-110"
                                                        title={savedStoryIds.includes(story.id) ? t('creativeWriting.reader.removeFromCart') : t('creativeWriting.reader.addToCart')}
                                                    >
                                                        <ShoppingBag size={14} className={savedStoryIds.includes(story.id) ? "fill-secondary-light text-secondary-light" : ""} />
                                                    </button>
                                                    <button
                                                        onClick={() => setViewingStory(story)}
                                                        className="p-2 bg-white/10 backdrop-blur-xl rounded-lg text-slate-300 hover:text-white transition-all hover:scale-110"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(story.id, e)}
                                                        className="p-2 bg-danger/10 backdrop-blur-xl rounded-lg text-danger transition-all hover:scale-110 hover:bg-danger hover:text-white"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-display font-black text-white leading-tight mb-3 group-hover:text-secondary-light transition-colors line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{story.title}</h4>
                                            <p className="text-xs text-slate-300 line-clamp-4 mb-6 flex-1 transition-colors leading-relaxed font-medium">{story.content}</p>
                                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={(e) => handleToggleLike(story.id, e)}
                                                        className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-danger hover:scale-105 active:scale-95 transition-all"
                                                    >
                                                        <Heart size={12} className={isStoryLiked(story) ? "fill-danger text-danger" : "text-slate-400"} />
                                                        <span>{getStoryLikes(story)}</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setViewingStory(story); }}
                                                        className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                                    >
                                                        <MessageSquare size={12} />
                                                        <span>{getStoryComments(story).length}</span>
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => handleEdit(story)}
                                                    className="text-primary-light font-black uppercase tracking-widest text-[9px] flex items-center gap-1 group/btn hover:text-white transition-all"
                                                >
                                                    {t('creativeWriting.list.modified')} <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
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
                        {/* Category Selector Filter Bar */}
                        <div className="col-span-full flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                            <button
                                onClick={() => setDiscoverCategoryFilter('all')}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${discoverCategoryFilter === 'all' ? 'bg-primary text-white border-primary shadow-glow shadow-primary/20' : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'}`}
                            >
                                Tout
                            </button>
                            {CATEGORY_KEYS.map(catKey => (
                                <button
                                    key={catKey}
                                    onClick={() => setDiscoverCategoryFilter(catKey)}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all whitespace-nowrap ${discoverCategoryFilter === catKey ? 'bg-primary text-white border-primary shadow-glow shadow-primary/20' : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'}`}
                                >
                                    {t(`creativeWriting.categories.${catKey}`)}
                                </button>
                            ))}
                        </div>

                        {filteredDiscoverStories.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-slate-400 italic font-medium">
                                Aucun texte de cette catégorie n'est encore disponible.
                            </div>
                        ) : (
                            filteredDiscoverStories.map(story => (
                                <div 
                                    key={story.id} 
                                    onClick={() => setViewingStory(story)}
                                    className="glass rounded-[2.5rem] border border-white/5 hover:border-primary/30 hover:scale-[1.01] transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between min-h-[300px] p-8 md:p-10"
                                >
                                    {/* Cover Image Background */}
                                    <div className="absolute inset-0 z-0">
                                        {story.coverImage ? (
                                            <img src={story.coverImage} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-700" alt="" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
                                    </div>

                                    <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-black/30 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${story.authorName}`} alt="avatar" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-white font-bold text-xs tracking-tight">{story.authorName}</p>
                                                        {(story as any).isVerified && (
                                                            <BadgeCheck size={12} className="text-secondary fill-secondary/20" />
                                                        )}
                                                    </div>
                                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{t(`creativeWriting.categories.${story.category as any}`)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleToggleSaveStory(story.id, e)}
                                                    className="p-2 bg-white/10 backdrop-blur-xl rounded-lg text-slate-300 hover:text-white transition-all hover:scale-110"
                                                    title={savedStoryIds.includes(story.id) ? t('creativeWriting.reader.removeFromCart') : t('creativeWriting.reader.addToCart')}
                                                >
                                                    <ShoppingBag size={14} className={savedStoryIds.includes(story.id) ? "fill-secondary-light text-secondary-light" : ""} />
                                                </button>
                                                <span className="px-3 py-1 bg-primary/20 backdrop-blur-xl border border-primary/20 text-primary-light text-[8px] font-black uppercase tracking-widest rounded-full">{t(`creativeWriting.categories.${story.category as any}`)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-xl md:text-2xl font-display font-black text-white leading-tight group-hover:text-primary-light transition-colors line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{story.title}</h3>
                                            <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed font-medium">
                                                {story.publishedContent || story.content}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-20">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={(e) => handleToggleLike(story.id, e)}
                                                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-danger hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    <Heart size={12} className={isStoryLiked(story) ? "fill-danger text-danger" : "text-slate-400"} />
                                                    <span>{getStoryLikes(story)}</span>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setViewingStory(story); }}
                                                    className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    <MessageSquare size={12} />
                                                    <span>{getStoryComments(story).length}</span>
                                                </button>
                                            </div>
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{new Date(story.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </motion.div>
                )}

                {activeTab === 'saved' && (
                    <motion.div
                        key="saved-tab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                        {(() => {
                            const VERIFIED_STORIES: Story[] = getVerifiedStories(language);
                            const discoverStories = [...VERIFIED_STORIES, ...publicDbStories.filter(s => !VERIFIED_STORIES.some(vs => vs.id === s.id))];
                            const savedStories = [...stories, ...discoverStories].filter(
                                (story, index, self) => 
                                    savedStoryIds.includes(story.id) && self.findIndex(s => s.id === story.id) === index
                            );
                            if (savedStories.length === 0) {
                                return (
                                    <div className="col-span-full py-20 text-center text-slate-400 italic font-medium">
                                        {t('creativeWriting.reader.emptyCart')}
                                    </div>
                                );
                            }
                            return savedStories.map(story => (
                                <div 
                                    key={story.id} 
                                    onClick={() => setViewingStory(story)}
                                    className="glass rounded-[2.5rem] border border-white/5 hover:border-primary/30 hover:scale-[1.01] transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between min-h-[300px] p-8 md:p-10"
                                >
                                    {/* Cover Image Background */}
                                    <div className="absolute inset-0 z-0">
                                        {story.coverImage ? (
                                            <img src={story.coverImage} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-700" alt="" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
                                    </div>

                                    <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-black/30 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${story.authorName}`} alt="avatar" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-white font-bold text-xs tracking-tight">{story.authorName}</p>
                                                        {(story as any).isVerified && (
                                                            <BadgeCheck size={12} className="text-secondary fill-secondary/20" />
                                                        )}
                                                    </div>
                                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{t(`creativeWriting.categories.${story.category as any}`)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleToggleSaveStory(story.id, e)}
                                                    className="p-2 bg-white/10 backdrop-blur-xl rounded-lg text-secondary-light hover:scale-110 active:scale-95 transition-all"
                                                    title={t('creativeWriting.reader.removeFromCart')}
                                                >
                                                    <ShoppingBag size={14} className="fill-secondary-light text-secondary-light" />
                                                </button>
                                                <span className="px-3 py-1 bg-primary/20 backdrop-blur-xl border border-primary/20 text-primary-light text-[8px] font-black uppercase tracking-widest rounded-full">{t(`creativeWriting.categories.${story.category as any}`)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-xl md:text-2xl font-display font-black text-white leading-tight group-hover:text-primary-light transition-colors line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{story.title}</h3>
                                            <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed font-medium">
                                                {story.publishedContent || story.content}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-20">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={(e) => handleToggleLike(story.id, e)}
                                                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-danger hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    <Heart size={12} className={isStoryLiked(story) ? "fill-danger text-danger" : "text-slate-400"} />
                                                    <span>{getStoryLikes(story)}</span>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setViewingStory(story); }}
                                                    className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    <MessageSquare size={12} />
                                                    <span>{getStoryComments(story).length}</span>
                                                </button>
                                            </div>
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{new Date(story.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ));
                        })()}
                    </motion.div>
                )}

            </AnimatePresence>

            {/* View Story Modal */}
            <AnimatePresence>
                {viewingStory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setViewingStory(null); setAutoScrollSpeed(0); setShowScrollSpeedMenu(false); }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-4xl bg-slate-900/95 border border-white/10 rounded-[3rem] h-[80vh] flex flex-col shadow-2xl overflow-hidden"
                        >
                            {/* Cover Image Background */}
                            <div className="absolute inset-0 z-0 pointer-events-none select-none">
                                {viewingStory.coverImage ? (
                                    <img src={viewingStory.coverImage} className="w-full h-full object-cover opacity-75" alt="" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
                            </div>

                            <button
                                onClick={() => { setViewingStory(null); setAutoScrollSpeed(0); setShowScrollSpeedMenu(false); }}
                                className="absolute top-8 right-8 p-3 bg-white/10 backdrop-blur-md rounded-full text-slate-400 hover:text-white transition-colors z-30"
                            >
                                <X size={20} />
                            </button>
                            
                            <div ref={readerScrollRef} className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 space-y-8">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="space-y-4 flex-1">
                                        <span className="px-4 py-1.5 bg-secondary/20 text-secondary-light text-[10px] font-black uppercase tracking-widest rounded-full border border-secondary/20">{t(`creativeWriting.categories.${viewingStory.category as any}`)}</span>
                                        <h2 className="text-3xl md:text-5xl font-display font-black text-white dark:text-white leading-none transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{viewingStory.title}</h2>
                                        <div className="flex items-center gap-4 text-slate-200 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                            <span>{t('creativeWriting.list.by')} {viewingStory.authorName}</span>
                                            <span>•</span>
                                            <span>{new Date(viewingStory.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 relative z-30">
                                        {/* Panier Button */}
                                        <button
                                            onClick={() => handleToggleSaveStory(viewingStory.id)}
                                            className="px-4 py-2.5 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                        >
                                            <ShoppingBag size={14} className={savedStoryIds.includes(viewingStory.id) ? "fill-secondary-light text-secondary-light" : ""} />
                                            <span>{savedStoryIds.includes(viewingStory.id) ? t('creativeWriting.reader.removeFromCart') : t('creativeWriting.reader.addToCart')}</span>
                                        </button>
                                        
                                        {/* AutoScroll Button */}
                                        <button
                                            onClick={() => { HapticFeedback.selection(); setShowScrollSpeedMenu(true); }}
                                            className={`px-4 py-2.5 border rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${autoScrollSpeed > 0 ? 'bg-secondary border-secondary shadow-glow shadow-secondary/20' : 'bg-white/10 border-white/10 hover:bg-white/20'}`}
                                        >
                                            <Zap size={14} className={autoScrollSpeed > 0 ? "animate-pulse text-white" : "text-slate-300"} />
                                            <span>
                                                {t('creativeWriting.reader.autoScroll')} : {
                                                    autoScrollSpeed === 0 ? t('creativeWriting.reader.scrollSpeed.off') :
                                                    autoScrollSpeed === 1 ? t('creativeWriting.reader.scrollSpeed.slow') :
                                                    autoScrollSpeed === 2 ? t('creativeWriting.reader.scrollSpeed.medium') :
                                                    t('creativeWriting.reader.scrollSpeed.fast')
                                                }
                                            </span>
                                        </button>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-950/70 backdrop-blur-md border border-white/15 rounded-[1.2rem] md:rounded-[2.5rem] p-6 md:p-12 shadow-2xl text-slate-100 dark:text-slate-100 [&_h1]:!text-white [&_h1]:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] [&_h2]:!text-white [&_h2]:drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)] [&_p]:!text-slate-100 [&_p]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] [&_li]:!text-slate-200 [&_blockquote]:!text-slate-200 [&_strong]:!text-white">
                                    {renderMarkdown(viewingStory.authorId === user?.id ? viewingStory.content : (viewingStory.publishedContent || viewingStory.content))}
                                    
                                    {/* Comments Section */}
                                    <div className="pt-8 border-t border-white/5 space-y-6">
                                        <h3 className="text-lg font-display font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <MessageSquare size={18} className="text-primary-light" />
                                            Commentaires ({getStoryComments(viewingStory).length})
                                        </h3>
                                        
                                        {/* Add Comment Input */}
                                        <div className="flex gap-4 items-start bg-white/5 border border-white/10 rounded-2xl p-4">
                                            <div className="w-10 h-10 bg-primary/20 rounded-xl overflow-hidden shrink-0 border border-white/10">
                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Visiteur'}`} alt="avatar" />
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <textarea
                                                    value={commentInput}
                                                    onChange={(e) => setCommentInput(e.target.value)}
                                                    placeholder="Laissez votre point de vue sur cet écrit..."
                                                    className="w-full bg-transparent border-0 resize-none text-sm text-slate-200 placeholder-slate-500 focus:ring-0 focus:outline-none min-h-[60px]"
                                                />
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={async () => {
                                                            if (!commentInput.trim()) return;
                                                            const newComment = {
                                                                id: `comment_${Date.now()}`,
                                                                author: user?.name || "Écrivain TMAB",
                                                                text: commentInput.trim(),
                                                                date: new Date().toLocaleDateString()
                                                            };
                                                            
                                                            const dbStory = publicDbStories.find(s => s.id === viewingStory.id);
                                                            if (dbStory) {
                                                                const updatedComments = [...(dbStory.commentsArray || []), newComment];
                                                                await writingService.publishStory(dbStory, dbStory.likesArray || [], updatedComments);
                                                                setPublicDbStories(prev => prev.map(s => s.id === viewingStory.id ? { ...s, commentsArray: updatedComments } : s));
                                                                setViewingStory(prev => prev ? { ...prev, commentsArray: updatedComments } as any : null);
                                                            } else {
                                                                setStoryComments(prev => {
                                                                    const next = {
                                                                        ...prev,
                                                                        [viewingStory.id]: [...(prev[viewingStory.id] || []), newComment]
                                                                    };
                                                                    const commentsKey = user?.id ? `levelmak_${user.id}_story_comments` : 'levelmak_story_comments';
                                                                    localStorage.setItem(commentsKey, JSON.stringify(next));
                                                                    return next;
                                                                });
                                                            }
                                                            
                                                            setCommentInput('');
                                                            HapticFeedback.success();
                                                        }}
                                                        className="px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-glow shadow-primary/20"
                                                    >
                                                        Commenter
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Comments List */}
                                        <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">

                                            
                                            {getStoryComments(viewingStory).map((comment: any) => (
                                                <div key={comment.id} className="flex gap-4 items-start bg-slate-900/30 p-4 rounded-2xl border border-white/5">
                                                    <div className="w-8 h-8 bg-primary/20 rounded-lg overflow-hidden shrink-0">
                                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author}`} alt="avatar" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-white">{comment.author}</span>
                                                            <span className="text-[8px] text-slate-500 uppercase tracking-widest">{comment.date}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-300 mt-1">{comment.text}</p>
                                                    </div>
                                                </div>
                                            ))}

                                            {(!viewingStory.id.startsWith('v_') && getStoryComments(viewingStory).length === 0) && (
                                                <p className="text-center text-xs text-slate-500 py-6 italic font-medium">Aucun commentaire pour le moment. Soyez le premier à donner votre avis !</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {viewingStory.authorId === user?.id && (
                                    <div className="pt-8 border-t border-white/5 flex justify-end gap-4 relative z-30">
                                        <button
                                            onClick={(e) => { handleDelete(viewingStory.id, e); setViewingStory(null); }}
                                            className="px-8 py-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            Supprimer
                                        </button>
                                        <button
                                            onClick={() => { handleEdit(viewingStory); setViewingStory(null); }}
                                            className="px-10 py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-glow hover:scale-[1.05] active:scale-95 transition-all"
                                        >
                                            {t('creativeWriting.list.modified')}
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {/* Centered Scroll Speed Selector Modal */}
                            <AnimatePresence>
                                {showScrollSpeedMenu && (
                                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => setShowScrollSpeedMenu(false)}
                                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                            className="relative w-full max-w-md bg-slate-900/95 border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl z-10 flex flex-col gap-5 text-center"
                                        >
                                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                    <Zap className="w-4 h-4 text-secondary-light" />
                                                    Vitesse de défilement
                                                </h3>
                                                <button
                                                    onClick={() => setShowScrollSpeedMenu(false)}
                                                    className="p-1.5 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            
                                            <p className="text-xs text-slate-400 font-medium leading-relaxed text-left">
                                                Choisissez la vitesse à laquelle vous souhaitez que le texte défile automatiquement pendant votre lecture.
                                            </p>

                                            <div className="flex flex-col gap-2.5 mt-2">
                                                {[
                                                    { speed: 0, label: t('creativeWriting.reader.scrollSpeed.off'), desc: "Désactiver le défilement automatique", color: 'hover:bg-red-500/10 border-red-500/20 text-red-400' },
                                                    { speed: 1, label: t('creativeWriting.reader.scrollSpeed.slow'), desc: "Idéal pour une lecture tranquille", color: 'hover:bg-white/5 border-white/10 text-slate-200' },
                                                    { speed: 2, label: t('creativeWriting.reader.scrollSpeed.medium'), desc: "Vitesse de lecture standard", color: 'hover:bg-white/5 border-white/10 text-slate-200' },
                                                    { speed: 3, label: t('creativeWriting.reader.scrollSpeed.fast'), desc: "Pour les lecteurs rapides", color: 'hover:bg-white/5 border-white/10 text-slate-200' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.speed}
                                                        onClick={() => {
                                                            HapticFeedback.selection();
                                                            setAutoScrollSpeed(opt.speed);
                                                            setShowScrollSpeedMenu(false);
                                                        }}
                                                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${opt.color} ${autoScrollSpeed === opt.speed ? 'bg-secondary/20 border-secondary text-secondary-light font-bold' : 'bg-white/5'}`}
                                                    >
                                                        <div className="flex flex-col text-left">
                                                            <span className="text-xs font-black uppercase tracking-wider">{opt.label}</span>
                                                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">{opt.desc}</span>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${autoScrollSpeed === opt.speed ? 'border-secondary bg-secondary text-white' : 'border-slate-600'}`}>
                                                            {autoScrollSpeed === opt.speed && <CheckCircle2 size={12} className="text-white" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Coach IA Modal (Avis / Aide) */}
            <AnimatePresence>
                {activeAiModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 md:p-12 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveAiModal(null)}
                            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="relative w-full max-w-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl md:rounded-[2.5rem] p-4 sm:p-7 md:p-9 flex flex-col shadow-2xl overflow-hidden max-h-[86dvh] sm:max-h-[85vh] z-10 my-auto"
                        >
                            {/* Decorative background glow */}
                            <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
                                <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 transition-all ${
                                    activeAiModal === 'review' ? 'bg-primary' : 'bg-secondary'
                                }`} />
                            </div>

                            <button
                                onClick={() => setActiveAiModal(null)}
                                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-slate-300 hover:text-white transition-colors z-30 shadow-md"
                            >
                                <X size={18} />
                            </button>

                            <div className="relative z-10 flex items-center gap-3 border-b border-white/10 pb-3 mb-3 shrink-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                                    activeAiModal === 'review' 
                                        ? 'bg-primary/20 border-primary/20 text-primary-light' 
                                        : 'bg-secondary/20 border-secondary/20 text-secondary'
                                }`}>
                                    {activeAiModal === 'review' ? <Sparkles size={20} /> : <Zap size={20} />}
                                </div>
                                <div className="pr-8">
                                    <h3 className="text-base md:text-xl font-display font-black text-white dark:text-white leading-tight">
                                        {activeAiModal === 'review' ? "Avis du Coach IA" : "Aide & Suite du Récit"}
                                    </h3>
                                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5 animate-pulse">
                                        {activeAiModal === 'review' 
                                            ? "Analyse pédagogique et retours sur votre écrit" 
                                            : "Conseils, inspirations et idées pour continuer"}
                                    </p>
                                </div>
                            </div>

                            <div className="relative z-10 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 mb-3 text-slate-200 dark:text-slate-200 text-sm md:text-base leading-relaxed space-y-3 font-serif">
                                {aiModalContent.split('\n').map((line, idx) => {
                                    let trimmed = line.trim();
                                    if (trimmed === '') return <div key={idx} className="h-2" />;
                                    return <p key={idx} className="text-justify whitespace-pre-wrap">{parseInlineStyles(line)}</p>;
                                })}
                            </div>

                            <div className="relative z-10 shrink-0 flex justify-center sm:justify-end border-t border-white/10 pt-3 mt-auto">
                                <button
                                    onClick={() => setActiveAiModal(null)}
                                    className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-primary to-secondary hover:brightness-110 border border-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    Retour à mon écriture
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};



export default CreativeWriting;
