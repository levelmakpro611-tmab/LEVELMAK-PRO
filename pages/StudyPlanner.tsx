import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    BookOpen,
    Zap,
    Clock,
    CheckCircle2,
    ChevronRight,
    Plus,
    Trash2,
    Loader2,
    Sparkles,
    Target,
    AlertCircle,
    ArrowRight,
    Camera,
    Image as ImageIcon,
    X,
    FileText,
    Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useStore } from '../hooks/useStore';
import { aiPlannerService } from '../services/ai-planner';
import { geminiService } from '../services/gemini';
import { StudyPlan } from '../types';
import mammoth from 'mammoth';

const StudyPlanner: React.FC = () => {
    const {
        studyPlan: plan,
        saveStudyPlan: setPlan,
        deleteStudyPlan,
        toggleTaskCompletion,
        user, t, settings
    } = useStore();

    const [examDate, setExamDate] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [subjects, setSubjects] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [files, setFiles] = useState<{ id: string, file: File, preview: string, type: 'image' | 'pdf' | 'word' }[]>([]);

    const getFileType = (file: File): 'image' | 'pdf' | 'word' => {
        if (file.type.includes('image')) return 'image';
        if (file.type === 'application/pdf') return 'pdf';
        return 'word';
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selectedFiles = Array.from(e.target.files || []) as File[];

        for (const file of selectedFiles) {
            const id = Math.random().toString(36).substr(2, 9);
            const type = getFileType(file);

            let preview = '';
            if (type === 'image') {
                preview = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string || '');
                    reader.readAsDataURL(file);
                });
            }

            setFiles(prev => [...prev, { id, file, preview, type }]);
        }
        e.target.value = '';
    };

    const handleExportPDF = () => {
        if (!plan) return;

        const doc = new jsPDF();

        // Header
        doc.setFillColor(79, 70, 229); // indigo-600
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('LEVELMAK - PLAN DE RÉVISION', 20, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Examen le: ${new Date(examDate).toLocaleDateString()}`, 150, 25);

        // Content
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Ma Timeline Stratégique', 20, 55);

        let yPos = 70;

        plan.tasks.forEach((task, i) => {
            if (yPos > 250) { doc.addPage(); yPos = 20; }

            doc.setFillColor(248, 250, 252); // slate-50
            doc.rect(15, yPos - 5, 180, 25, 'F');

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(79, 70, 229);
            doc.text(`${new Date(task.date).toLocaleDateString()} - ${task.subject}`, 20, yPos + 2);

            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text(`${task.title} (${task.duration})`, 20, yPos + 10);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            const splitDesc = doc.splitTextToSize(task.description, 170);
            doc.text(splitDesc, 20, yPos + 16);

            yPos += 30 + (splitDesc.length > 1 ? (splitDesc.length - 1) * 5 : 0);
        });

        // AI Tips
        if (yPos > 220) { doc.addPage(); yPos = 20; }
        yPos += 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text("Conseils de l'IA pour ta réussite", 20, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("Focus & Productivité:", 20, yPos);
        doc.setFont('helvetica', 'normal');
        const splitFocus = doc.splitTextToSize(t('planner.focusDesc'), 170);
        doc.text(splitFocus, 20, yPos + 5);
        yPos += 15 + (splitFocus.length * 5);

        doc.setFont('helvetica', 'bold');
        doc.text("Technique Pomodoro:", 20, yPos);
        doc.setFont('helvetica', 'normal');
        const splitPomo = doc.splitTextToSize(t('planner.pomodoroDesc'), 170);
        doc.text(splitPomo, 20, yPos + 5);

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} sur ${pageCount} - Généré par LEVELMAK AI`, 105, 290, { align: 'center' });
        }

        doc.save(`Plan_Revision_LEVELMAK_${new Date().getTime()}.pdf`);
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleAddSubject = () => {
        if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
            setSubjects([...subjects, newSubject.trim()]);
            setNewSubject('');
        }
    };

    const handleRemoveSubject = (index: number) => {
        setSubjects(subjects.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (!examDate || subjects.length === 0) {
            setError(t('planner.validation.selectDateAndSubject'));
            return;
        }

        setIsGenerating(true);
        setError(null);
        try {
            let result: StudyPlan;
            if (files.length > 0) {
                const sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[] = [];
                for (const f of files) {
                    if (f.type === 'word') {
                        const arrayBuffer = await f.file.arrayBuffer();
                        const wordResult = await mammoth.extractRawText({ arrayBuffer });
                        sources.push({ type: 'text', data: wordResult.value });
                    } else {
                        const base64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string || '');
                            reader.readAsDataURL(f.file);
                        });
                        sources.push({ type: f.type, data: base64 });
                    }
                }
                result = await geminiService.generatePlanMultimodal(examDate, subjects, sources, settings.language);
            } else {
                result = await aiPlannerService.generatePlan(examDate, subjects);
            }
            setPlan(result);
        } catch (err: any) {
            const errorMsg = err?.message || 'Erreur inconnue';
            if (errorMsg.includes('temporairement épuisées') || errorMsg.includes('limite de requêtes')) {
                setError(t('planner.errorQuota'));
            } else {
                setError(t('planner.errorFail'));
            }
            console.error('Erreur génération plan:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-4 md:py-8 px-4 space-y-8 md:space-y-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 text-primary-light font-black uppercase tracking-[0.2em] text-[10px]">
                        <Calendar size={14} className="animate-pulse" /> {t('planner.strategic')}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter">
                        {t('planner.successScheduled').split(' ').map((word, i) => i === 1 ? <span key={i} className="text-gradient-primary"> {word} </span> : word + ' ')}
                    </h1>
                    <p className="text-slate-400 max-w-xl font-medium leading-relaxed">
                        {t('planner.subtitle')}
                    </p>
                </div>

                {!plan && (
                    <div className="bg-slate-900/50 border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 shadow-2xl backdrop-blur-xl w-full max-w-sm">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-2">{t('planner.examDate')}</label>
                                <input
                                    type="date"
                                    value={examDate}
                                    onChange={(e) => setExamDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-2">{t('planner.subjectsToReview')}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newSubject}
                                        onChange={(e) => setNewSubject(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                                        placeholder={t('planner.subjectPlaceholder')}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-primary/50 outline-none transition-all"
                                    />
                                    <button
                                        onClick={handleAddSubject}
                                        className="p-3 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <AnimatePresence>
                                        {subjects.map((sub, i) => (
                                            <motion.span
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                key={i}
                                                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white font-bold flex items-center gap-2 group"
                                            >
                                                {sub}
                                                <button onClick={() => handleRemoveSubject(i)} className="text-slate-500 hover:text-danger">
                                                    <Trash2 size={12} />
                                                </button>
                                            </motion.span>
                                        ))}
                                    </AnimatePresence>
                                </div>
                                {subjects.length === 0 && newSubject && (
                                    <p className="text-xs text-yellow-500/80 flex items-center gap-1 pl-1">
                                        <ArrowRight size={12} />
                                        {t('planner.validation.clickToAdd').replace('{title}', newSubject)}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-4 pt-2">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-2">{t('planner.docsAndPhotos')}</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {files.map((f) => (
                                        <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10 bg-white/5">
                                            {f.type === 'image' ? (
                                                <img src={f.preview} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                                    <FileText size={20} className="text-primary mb-1" />
                                                    <span className="text-[7px] text-slate-500 font-bold truncate w-full">{f.file.name}</span>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => removeFile(f.id)}
                                                className="absolute top-1 right-1 p-1.5 bg-danger/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer group">
                                        <Plus size={20} className="text-slate-500 group-hover:text-primary transition-colors" />
                                        <span className="text-[8px] font-black text-slate-500 uppercase">{t('planner.add')}</span>
                                        <input type="file" multiple accept="image/*,.pdf,.docx" onChange={handleFileChange} className="hidden" />
                                    </label>
                                </div>
                                <p className="text-[9px] text-slate-500 font-medium italic">
                                    {t('planner.aiAnalysisDesc')}
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-[10px] font-bold flex items-center gap-2">
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !examDate || subjects.length === 0}
                                className={`w-full py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 transition-all shadow-glow ${isGenerating || !examDate || subjects.length === 0
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                                    : 'bg-gradient-to-r from-primary to-secondary text-white hover:scale-[1.02] active:scale-95'
                                    }`}
                                title={
                                    !examDate && subjects.length === 0
                                        ? t('planner.tooltip.fillDateAndSubject')
                                        : !examDate
                                            ? t('planner.tooltip.selectDate')
                                            : subjects.length === 0
                                                ? t('planner.tooltip.addSubject')
                                                : t('planner.tooltip.generatePlan')
                                }
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={16} className="md:w-[18px] md:h-[18px] animate-spin" />
                                        {t('planner.generating')}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} className="md:w-[18px] md:h-[18px]" />
                                        {t('planner.generatePlan')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Plan Display */}
            {plan && (
                <div className="space-y-8 animate-slide-up">
                    <div className="flex items-center justify-between bg-slate-900/50 p-6 rounded-[2rem] border border-white/10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center border border-primary/20">
                                <Target size={32} className="text-primary-light" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-display font-black text-white">{plan.title}</h2>
                                <p className="text-sm text-slate-500 font-medium">{t('planner.start')} : {plan.startDate} • {t('planner.end')} : {plan.endDate}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            {plan.extractedTopics && (
                                <div className="hidden md:flex flex-col items-end gap-2">
                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{t('planner.topicsIdentified')}</span>
                                    <div className="flex gap-2">
                                        {plan.extractedTopics.slice(0, 3).map((topic, i) => (
                                            <span key={i} className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent-light rounded-lg text-[9px] font-bold">{topic}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    deleteStudyPlan();
                                    setFiles([]);
                                }}
                                className="px-4 md:px-6 py-2 md:py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                {t('planner.redoPlan')}
                            </button>
                            <button
                                onClick={handleExportPDF}
                                className="px-4 md:px-6 py-2 md:py-3 bg-primary text-white rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-glow"
                            >
                                <Download size={14} /> {t('common.exportPDF')}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <h3 className="text-lg font-display font-black text-white px-2">{t('planner.timeline')}</h3>
                            <div className="space-y-4">
                                {plan.tasks.map((task, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={task.id}
                                        className="group bg-slate-900 border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 hover:border-primary/50 transition-all flex flex-col md:flex-row gap-4 md:gap-6 relative"
                                    >
                                        {/* Priority Indicator */}
                                        <div className={`absolute top-0 right-10 bottom-0 w-1 ${task.priority === 'high' ? 'bg-danger' :
                                            task.priority === 'medium' ? 'bg-accent' : 'bg-success'
                                            } opacity-30`} />

                                        <div className="flex flex-col items-center justify-center min-w-[80px] md:min-w-[100px] border-r border-white/5 pr-4 md:pr-6">
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{t('common.date') || 'Date'}</span>
                                            <span className="text-sm font-display font-black text-white">{new Date(task.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="px-3 py-1 bg-primary/10 text-primary-light border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-widest">{task.subject}</span>
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Clock size={12} />
                                                    <span className="text-[10px] font-bold">{task.duration} {t('planner.duration')}</span>
                                                </div>
                                            </div>
                                            <h4 className="text-lg font-bold text-white group-hover:text-primary-light transition-colors">{task.title}</h4>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed">{task.description}</p>
                                        </div>

                                        <button
                                            onClick={() => toggleTaskCompletion(task.id)}
                                            className={`self-center p-4 rounded-2xl transition-all group/btn ${task.completed
                                                ? 'bg-success text-white shadow-lg shadow-success/20'
                                                : 'bg-white/5 text-slate-500 hover:bg-success/20 hover:text-success'
                                                }`}
                                        >
                                            <CheckCircle2 size={24} className={task.completed ? 'scale-110' : 'group-active/btn:scale-90'} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-lg font-display font-black text-white px-2">{t('planner.aiTips')}</h3>
                            <div className="bg-gradient-to-br from-secondary/20 to-primary/20 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                                        <Zap size={24} className="text-accent" />
                                    </div>
                                    <h4 className="font-bold text-white">{t('planner.focusTitle')}</h4>
                                    <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                        {t('planner.focusDesc')}
                                    </p>
                                </div>
                                <div className="h-px bg-white/10" />
                                <div className="space-y-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                                        <BookOpen size={24} className="text-primary-light" />
                                    </div>
                                    <h4 className="font-bold text-white">{t('planner.pomodoroTitle')}</h4>
                                    <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                        {t('planner.pomodoroDesc')}
                                    </p>
                                </div>
                                <button className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all">
                                    {t('planner.moreTips')} <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyPlanner;
