
import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Type,
  Trash2,
  FileSearch,
  Zap,
  BookOpen,
  Info,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../services/gemini';
import { useStore } from '../hooks/useStore';
import { SUBJECTS } from '../constants';
import { Quiz } from '../types';
import mammoth from 'mammoth';

const QuizGenerator: React.FC<{ onGenerated: (quiz: Quiz) => void }> = ({ onGenerated }) => {
  const { saveQuiz, completeMission, t, settings } = useStore();
  const [files, setFiles] = useState<{ id: string, file: File, preview: string, type: 'image' | 'pdf' | 'word' }[]>([]);
  const [manualText, setManualText] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [difficulty, setDifficulty] = useState('Intermédiaire');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (file: File): 'image' | 'pdf' | 'word' => {
    if (file.type.includes('image')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    return 'word';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles: File[] = Array.from(e.target.files || []);
    for (const file of selectedFiles) {
      const id = Math.random().toString(36).substr(2, 9);
      const type = getFileType(file);

      let preview = '';
      if (type === 'image') {
        preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string || '');
          reader.readAsDataURL(file as File);
        });
      }

      setFiles(prev => [...prev, { id, file: file as File, preview, type }]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const generate = async () => {
    if (inputMode === 'file' && files.length === 0) {
      setError(t('quiz.generator.errors.noFile'));
      return;
    }
    if (inputMode === 'text' && !manualText.trim()) {
      setError(t('quiz.generator.errors.noText'));
      return;
    }

    setIsProcessing(true);
    setError('');
    setStatus(t('quiz.generator.status.init'));

    try {
      const sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[] = [];

      if (inputMode === 'text') {
        sources.push({ type: 'text', data: manualText });
      } else {
        setStatus(t('quiz.generator.status.prep'));
        for (const f of files) {
          if (f.type === 'word') {
            setStatus(`${t('quiz.generator.status.read')} ${f.file.name}...`);
            const arrayBuffer = await (f.file as File).arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            sources.push({ type: 'text', data: result.value });
          } else {
            setStatus(`${t('quiz.generator.status.process')} ${f.file.name}...`);
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string || '');
              reader.readAsDataURL(f.file as File);
            });
            sources.push({ type: f.type, data: base64 });
          }
        }
      }

      setStatus(t('quiz.generator.status.analyze'));
      const quizData = await geminiService.generateMultimodalQuiz(sources, subject, difficulty, settings.language);

      const newQuiz: Quiz = {
        id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: quizData.title || `Quiz de ${subject}`,
        subject: subject,
        questions: quizData.questions,
        summary: quizData.summary,
        keyPoints: quizData.keyPoints,
        definitions: quizData.definitions,
        createdAt: new Date().toISOString()
      };

      saveQuiz(newQuiz);
      completeMission('m1');
      setStatus(t('quiz.generator.status.ready'));
      await new Promise(r => setTimeout(r, 800));
      onGenerated(newQuiz);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la génération.');
    } finally {
      setIsProcessing(false);
      setStatus('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-4 md:py-8 space-y-8 md:space-y-12 px-4 md:px-0">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12"
      >
        <div className="space-y-3 md:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-primary/10 rounded-full border border-primary/20 text-primary-light font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px]">
            <Sparkles size={10} md:size={14} className="animate-pulse" /> {t('quiz.generator.badge')}
          </div>
          <h1 className="text-2xl md:text-6xl font-display font-black text-white tracking-tighter leading-tight md:leading-none">
            {t('quiz.generator.title')} <span className="text-gradient-primary">{t('quiz.generator.subtitle')}</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-xl font-medium max-w-2xl leading-relaxed">
            {t('quiz.generator.desc')} <span className="text-white font-bold">{t('quiz.generator.active')}</span>.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="glass p-1 md:p-2 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 flex gap-1 md:gap-2 shadow-2xl">
            <button
              onClick={() => setInputMode('file')}
              className={`flex-1 flex items-center justify-center gap-2 md:gap-3 py-3 md:py-5 rounded-[1.2rem] md:rounded-[2rem] font-black uppercase tracking-widest text-[8px] md:text-xs transition-all duration-500 ${inputMode === 'file' ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              <Upload size={14} md:size={18} /> {t('quiz.generator.uploadBtn')}
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`flex-1 flex items-center justify-center gap-2 md:gap-3 py-3 md:py-5 rounded-[1.2rem] md:rounded-[2rem] font-black uppercase tracking-widest text-[8px] md:text-xs transition-all duration-500 ${inputMode === 'text' ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              <Type size={14} md:size={18} /> {t('quiz.generator.textBtn')}
            </button>
          </div>

          <motion.div
            layout
            className="bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3.5rem] border border-white/5 p-6 md:p-10 shadow-premium min-h-[400px] md:min-h-[550px] flex flex-col relative group"
          >
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
                >
                  <div className="relative">
                    <div className="w-32 h-32 md:w-36 md:h-36 border-4 border-primary/20 rounded-[3rem] animate-spin-slow"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap size={40} className="text-primary animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white">{status}</h3>
                </motion.div>
              ) : inputMode === 'file' ? (
                <motion.div key="file-mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col space-y-6">
                  {/* Mobile-Specific Quick Actions */}
                  <div className="flex flex-col md:hidden gap-4 mb-4">
                    <button
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.setAttribute('capture', 'environment');
                          fileInputRef.current.setAttribute('accept', 'image/*');
                          fileInputRef.current.click();
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-glow active:scale-95 transition-all"
                    >
                      <ImageIcon size={20} /> Prendre une Photo
                    </button>
                    <button
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.removeAttribute('capture');
                          fileInputRef.current.setAttribute('accept', 'image/*,.pdf,.docx');
                          fileInputRef.current.click();
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs border border-white/5 active:scale-95 transition-all"
                    >
                      <Upload size={20} /> Parcourir Documents
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <AnimatePresence>
                      {files.map((f) => (
                        <motion.div
                          key={f.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative aspect-square rounded-2xl md:rounded-3xl border border-white/10 overflow-hidden group/item bg-white/5"
                        >
                          {f.type === 'image' ? (
                            <img src={f.preview} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center space-y-2 p-4">
                              <FileText size={32} className="text-primary" />
                              <span className="text-[8px] font-black uppercase text-slate-500 truncate w-full text-center">{f.file.name}</span>
                            </div>
                          )}
                          <button
                            onClick={() => removeFile(f.id)}
                            className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-xl md:opacity-0 md:group-hover/item:opacity-100 transition-opacity z-20"
                          >
                            <Trash2 size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Desktop/Default Add Button - Hidden on small screens in favor of quick actions */}
                    <button
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.removeAttribute('capture');
                          fileInputRef.current.setAttribute('accept', 'image/*,.pdf,.docx');
                          fileInputRef.current.click();
                        }
                      }}
                      className="hidden md:flex aspect-square rounded-3xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 flex-col items-center justify-center gap-3 transition-all"
                    >
                      <div className="p-3 bg-white/5 rounded-2xl text-slate-500 group-hover:text-primary transition-colors">
                        <Plus size={24} />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase">Ajouter</span>
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.docx"
                  />

                  <p className="text-center text-[10px] md:text-xs text-slate-500 font-medium italic">
                    {t('quiz.generator.uploadDesc')}
                  </p>
                </motion.div>
              ) : (
                <motion.div key="text-mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder={t('quiz.generator.placeholder')}
                    className="flex-1 w-full p-6 md:p-10 bg-white/5 rounded-[2.5rem] border border-white/5 text-white font-medium text-lg leading-relaxed outline-none resize-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="glass rounded-[2.5rem] border border-white/5 p-6 md:p-8 space-y-8 sticky top-8">
            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">{t('quiz.generator.intensity')}</label>
              <div className="grid grid-cols-1 gap-3">
                {['Facile', 'Intermédiaire', 'Expert'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`p-4 rounded-2xl font-bold border transition-all ${difficulty === d ? 'border-primary/40 bg-primary/10 text-white shadow-glow' : 'border-white/5 text-slate-500 hover:bg-white/5'}`}
                  >
                    {d === 'Facile' ? t('quiz.generator.difficulties.easy') : d === 'Intermédiaire' ? t('quiz.generator.difficulties.medium') : t('quiz.generator.difficulties.hard')}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generate}
              disabled={isProcessing}
              className="w-full py-5 md:py-6 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl md:rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-glow disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <>{t('quiz.generator.generateBtn')} <ArrowRight size={18} /></>}
            </button>

            {error && (
              <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex gap-3 text-danger text-[10px] font-bold">
                <Info size={16} /> {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizGenerator;
