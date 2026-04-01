
import React, { useState, useRef, useEffect } from 'react';
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
  Plus,
  X,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { openrouterService } from '../services/openrouter';
import { ocrService } from '../services/ocrService';
import { useStore } from '../hooks/useStore';
import { SUBJECTS } from '../constants';
import { Quiz } from '../types';
const QuizGenerator: React.FC<{ onGenerated: (quiz: Quiz) => void }> = ({ onGenerated }) => {
  const { saveQuiz, completeMission, t, settings } = useStore();
  const [files, setFiles] = useState<{ id: string, file: File, preview: string, type: 'image' }[]>([]);
  const [manualText, setManualText] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [difficulty, setDifficulty] = useState('Intermédiaire');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Cleanup camera on unmount or mode change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setIsCameraActive(true);
      // Need a small timeout to ensure video element is rendered before setting srcObject
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(e => console.error("Video play error:", e));
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions de votre navigateur.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const id = Math.random().toString(36).substr(2, 9);
            setFiles(prev => [...prev, { id, file, preview: dataUrl, type: 'image' }]);
          });
      }
    }
  };

  const getFileType = (file: File): 'image' => {
    return 'image';
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
      const sources: { type: 'text' | 'image', data: string }[] = [];

      if (inputMode === 'text') {
        sources.push({ type: 'text', data: manualText });
      } else {
        setStatus(t('quiz.generator.status.prep'));
        for (const f of files) {
          setStatus(`${t('quiz.generator.status.process')} ${f.file.name}...`);
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string || '');
            reader.readAsDataURL(f.file as File);
          });

          // OCR-first approach for Quiz Generator
          if (f.type === 'image') {
            setStatus(`${t('quiz.generator.status.process')} (OCR) ${f.file.name}...`);
            try {
              const langMap: any = { 'fr': 'fra+eng', 'en': 'eng', 'ar': 'ara' };
              const ocrLang = langMap[settings.language] || 'fra+eng';
              const text = await ocrService.extractText(base64, ocrLang);
              sources.push({ type: 'text', data: `[TEXTE EXTRAIT DE L'IMAGE ${f.file.name}]:\n${text}` });
            } catch (e) {
              console.warn("Fallback vision direct suite à l'échec de l'OCR:", e);
              sources.push({ type: f.type, data: base64 });
            }
          } else {
            sources.push({ type: f.type, data: base64 });
          }
        }
      }

      setStatus(t('quiz.generator.status.analyze'));
      const quizData = await openrouterService.generateMultimodalQuiz(sources, subject, difficulty, settings.language);

      if (!quizData || !quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        throw new Error("L'IA n'a pas pu générer les questions correctement à partir de ce document. Essaie avec un texte plus clair.");
      }

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
          <h1 className="text-2xl md:text-6xl font-display font-black text-slate-900 dark:text-white tracking-tighter leading-tight md:leading-none">
            {t('quiz.generator.title')} <span className="text-gradient-primary">{t('quiz.generator.subtitle')}</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-xl font-medium max-w-2xl leading-relaxed">
            {t('quiz.generator.desc')} <span className="text-slate-900 dark:text-white font-bold">{t('quiz.generator.active')}</span>.
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
              <ImageIcon size={14} md:size={18} /> PHOTOS
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
                  {/* Universal Quick Actions for Camera and Gallery */}
                  {isCameraActive ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full aspect-[4/3] md:aspect-video bg-black rounded-3xl overflow-hidden mb-6 shadow-2xl flex flex-col items-center justify-center border border-white/10">
                       <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                       
                       <div className="absolute top-4 right-4">
                         <button onClick={stopCamera} className="w-10 h-10 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all">
                           <X size={18} />
                         </button>
                       </div>

                       <div className="absolute bottom-6 inset-x-0 flex justify-center items-center gap-6 px-4">
                         <button onClick={capturePhoto} className="w-16 h-16 md:w-20 md:h-20 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all outline outline-4 outline-white/30 border-4 border-black/20">
                           <Camera size={28} className="md:w-8 md:h-8" />
                         </button>
                       </div>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <button
                        onClick={startCamera}
                        className="w-full flex items-center justify-center gap-3 py-4 md:py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-widest text-xs md:text-sm shadow-glow active:scale-95 transition-all"
                      >
                        <Camera size={20} /> Appareil Photo
                      </button>
                      <button
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.removeAttribute('capture');
                            fileInputRef.current.setAttribute('accept', 'image/*');
                            fileInputRef.current.click();
                          }
                        }}
                        className="w-full flex items-center justify-center gap-3 py-4 md:py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-widest text-xs md:text-sm border border-white/5 active:scale-95 transition-all"
                      >
                        <Upload size={20} /> Parcourir Galerie
                      </button>
                    </div>
                  )}

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
                          <img src={f.preview} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeFile(f.id)}
                            className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-xl md:opacity-0 md:group-hover/item:opacity-100 transition-opacity z-20"
                          >
                            <Trash2 size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                    accept="image/*"
                  />

                  <p className="text-center text-[10px] md:text-xs text-slate-500 font-medium italic">
                    Combine tes photos de cahiers pour générer un quiz précis.
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
