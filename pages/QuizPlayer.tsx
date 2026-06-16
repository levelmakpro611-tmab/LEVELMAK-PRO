import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Trophy,
  Zap,
  BookOpen,
  Repeat,
  Home,
  Download,
  AlertCircle,
  Lightbulb,
  Check,
  ChevronRight,
  History,
  Target,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logUserActivity } from '../services/activityService';
import { Quiz, QuizQuestion } from '../types';
import { useStore } from '../hooks/useStore';
import { feedbackService } from '../services/feedbackService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { WorldBrainMap } from '../components/WorldBrainMap';
import { useFlashcardStore } from '../services/flashcardStore';
import { audioService } from '../services/audio';

interface QuizPlayerProps {
  quiz: Quiz;
  onClose: () => void;
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onClose }) => {
  const { user, addXp, addActivity, trackTime, usePotion, betLevelCoins, addLevelCoins, updateSRSMetadata, plantInGarden, saveQuiz, t, updateProfile } = useStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState<{
    correct: number;
    incorrect: number;
    xpGained: number;
    timeSpent: number;
    betAmount: number;
    betTarget: number;
    betWon: boolean | null;
    flashcardsSaved?: boolean;
  } | null>(null);

  const [wrongQuestions, setWrongQuestions] = useState<QuizQuestion[]>([]);
  const { addFromErrors } = useFlashcardStore();

  const [shieldActive, setShieldActive] = useState(false);
  const [showOracle, setShowOracle] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [betTarget, setBetTarget] = useState(80); // Target score percentage

  const consumables = user?.consumables || {};

  const [startTime] = useState(Date.now());
  const [encouragement, setEncouragement] = useState('');

  // DEBUG: Check mount
  useEffect(() => {
    console.log("🧩 QuizPlayer mounted with quiz:", quiz.title);
    console.log("🔮 Oracle State (showOracle):", showOracle);
    
    // Start background piano music
    audioService.startBackgroundPiano();
    return () => {
      audioService.stopBackgroundPiano();
    };
  }, [quiz.title, showOracle]);

  // Start quiz logging
  useEffect(() => {
    if (quiz && user) {
      logUserActivity(user.id, user.name, 'quiz', `Started Quiz: ${quiz.title}`, { subject: quiz.subject });
    }
  }, [quiz, user]);

  const encouragements = t('quiz.player.feedback.success', { returnObjects: true }) as string[];

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-white/10 p-8 rounded-[2rem] text-center space-y-4 max-w-sm w-full shadow-2xl">
          <AlertCircle size={48} className="text-danger mx-auto animate-pulse" />
          <h2 className="text-xl font-bold text-white">Quiz Corrompu</h2>
          <p className="text-slate-400 text-sm">Oups ! Ce quiz n'a pas été généré correctement ou ne contient aucune question.</p>
          <button onClick={onClose} className="w-full py-3 mt-4 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-all">Retourner à l'accueil</button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIdx];

  const handleOptionClick = async (idx: number) => {
    if (isAnswered) return;

    await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    audioService.playClick();
    setSelectedOption(idx);
    setIsAnswered(true);

    const correct = idx === currentQuestion.correctAnswer;
    if (correct) {
      setScore(prev => prev + 1);
      setEncouragement(encouragements[Math.floor(Math.random() * encouragements.length)]);
      feedbackService.answerFeedback(true);
      audioService.playSuccess('quiz');
    } else {
      if (shieldActive) {
        setShieldActive(false);
        setIsAnswered(false);
        setSelectedOption(null);
        setEncouragement(t('quiz.player.feedback.shield'));
        return;
      }
      setWrongQuestions(prev => {
        // Prevent storing the same question twice if they retry
        if (prev.find(q => q.id === currentQuestion.id)) return prev;
        return [...prev, currentQuestion];
      });
      setEncouragement(t('quiz.player.feedback.fail'));
      feedbackService.answerFeedback(false);
      audioService.playError('quiz');
    }
  };

  const useSkipPotion = () => {
    if (isAnswered || !consumables['potion_skip']) return;
    usePotion('potion_skip');
    setEncouragement(t('quiz.player.feedback.skip'));
    setIsAnswered(true);
    setTimeout(nextQuestion, 1500);
  };

  const handleExportPDF = () => {
    if (!quiz || !resultsData) return;

    const doc = new jsPDF();
    const title = quiz.title || 'Résultat Quiz LEVELMAK';

    // Header
    doc.setFillColor(245, 158, 11); // Amber 500 for Quiz
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('LEVELMAK - RÉSULTAT QUIZ', 20, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString(), 170, 25);

    // Score Summary
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, 55);

    doc.setFontSize(14);
    doc.text(`Score Final: ${score}/${quiz.questions.length} (${Math.round((score / quiz.questions.length) * 100)}%)`, 20, 65);
    doc.text(`XP Gagnés: +${resultsData.xpGained}`, 20, 75);

    let yPos = 90;

    // Questions and Explanations
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Récapitulatif des Questions', 20, yPos);
    yPos += 10;

    quiz.questions.forEach((q, i) => {
      if (yPos > 250) { doc.addPage(); yPos = 20; }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const splitQuestion = doc.splitTextToSize(`${i + 1}. ${q.text}`, 170);
      doc.text(splitQuestion, 20, yPos);
      yPos += (splitQuestion.length * 6);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(16, 185, 129); // Green for correct answer
      doc.text(`Réponse correcte: ${q.options[q.correctAnswer]}`, 25, yPos);
      yPos += 6;

      if (q.explanation) {
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.setFont('helvetica', 'italic');
        const splitExpl = doc.splitTextToSize(`Explication: ${q.explanation}`, 160);
        doc.text(splitExpl, 25, yPos);
        yPos += (splitExpl.length * 5) + 5;
      }

      doc.setTextColor(30, 41, 59); // Reset to Slate 800
      yPos += 5;
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} sur ${pageCount} - LEVELMAK AI Learning`, 105, 290, { align: 'center' });
    }

    doc.save(`Resultats_Quiz_${title.replace(/\s+/g, '_')}.pdf`);
  };

  const useShieldPotion = () => {
    if (isAnswered || shieldActive || !consumables['potion_shield']) return;
    usePotion('potion_shield');
    setShieldActive(true);
  };

  const nextQuestion = async () => {
    await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setEncouragement('');
    } else {
      finishQuiz();
    }
  };

  const handleStartWithBet = () => {
    audioService.playClick();
    if (betAmount > 0) {
      const success = betLevelCoins(betAmount);
      if (!success) {
        alert("Tu n'as pas assez de LevelCoins pour ce pari ! 🪙");
        return;
      }
    }
    setShowOracle(false);
  };

  const handleInviteFromMap = () => {
    if (betAmount > 0 && user && user.levelCoins < betAmount) {
      alert("Tu n'as pas assez de LevelCoins pour parier cette somme ! 🪙");
      return;
    }
    setIsInviting(true);
  };

  const finishQuiz = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const successPercentage = (score / quiz.questions.length) * 100;

    // Strict performance based rewards
    const maxXP = quiz.questions.length * 10; // e.g. 100 max XP for 10 questions
    const xpGained = Math.round((successPercentage / 100) * maxXP) || 0;
    
    // Base coins scaling
    const baseCoins = Math.round((successPercentage / 100) * 15) || 0;

    feedbackService.mediumImpact();

    const betWon = betAmount > 0 ? successPercentage >= betTarget : null;

    if (betWon) {
      addLevelCoins(betAmount * 3 + baseCoins);
      addActivity('badge', 'Oracle Validé ! 🔮', `Tu as triplé ton pari de ${betAmount} coins !`);
    } else {
      if (baseCoins > 0) addLevelCoins(baseCoins);
    }

    if (xpGained > 0) addXp(xpGained);
    trackTime(timeSpent / 60, quiz.subject); // Convert seconds to minutes and track time with subject

    // Plant in garden if score is >= 50%
    if (successPercentage >= 50) {
      const plantTypes: ('flower' | 'tree' | 'cactus' | 'bonsai' | 'lotus')[] = ['flower', 'tree', 'cactus', 'bonsai', 'lotus'];
      // Increase probability of getting an actual tree since the user specifically requested 'l'arbre'
      const weightedTypes = [...plantTypes, 'tree', 'tree', 'tree'];
      const randomType = weightedTypes[Math.floor(Math.random() * weightedTypes.length)] as any;
      plantInGarden(randomType);
      addActivity('mission', 'Nouvelle Plante ! 🌱', `Bravo ! Ton score de ${Math.round(successPercentage)}% a fait pousser une nouvelle plante dans ton jardin.`);
    }

    // SRS Update for Quiz
    let srsRating: 1 | 3 | 4 | 5 = 1;
    if (successPercentage === 100) srsRating = 5;
    else if (successPercentage >= 80) srsRating = 4;
    else if (successPercentage >= 60) srsRating = 3;
    updateSRSMetadata(quiz.id, 'quiz', srsRating);
    addActivity('quiz', 'Quiz Terminé', `Tu as complété le quiz "${quiz.title}" avec un score de ${score}/${quiz.questions.length}`);

    // Update real-time quiz performance analytics for exam prediction
    if (user) {
      const currentAnalytics = user.analytics || {
        studyTimeBySubject: {},
        studyTimeByDay: [],
        quizPerformance: [],
        weeklyGoals: { target: 120, achieved: 0 },
        examPredictions: []
      };
      
      const subject = quiz.subject || "Général";
      const attempts = currentAnalytics.quizPerformance || [];
      const existingIdx = attempts.findIndex(
        (p: any) => p && p.subject && p.subject.toLowerCase() === subject.toLowerCase()
      );
      
      let updatedAttempts = [...attempts];
      const scoreRate = score / quiz.questions.length;
      
      if (existingIdx !== -1) {
        const existing = attempts[existingIdx];
        const newTotal = (existing.totalAttempts || 0) + 1;
        const newCorrectRate = ((existing.correctRate || 0) * (existing.totalAttempts || 0) + scoreRate) / newTotal;
        updatedAttempts[existingIdx] = {
          ...existing,
          correctRate: newCorrectRate,
          totalAttempts: newTotal,
          lastScore: score
        };
      } else {
        updatedAttempts.push({
          subject,
          correctRate: scoreRate,
          totalAttempts: 1,
          lastScore: score
        });
      }
      
      updateProfile(user.name, user.phoneNumber, {
        analytics: {
          ...currentAnalytics,
          quizPerformance: updatedAttempts
        }
      });
      
      logUserActivity(user.id, user.name, 'quiz', `Completed Quiz: ${quiz.title}`, { score: score, total: quiz.questions.length, xpGained: xpGained, timeSpent: timeSpent });
    }

    // Removed automatic flashcard creation to make it optional via button in results

    setResultsData({
      correct: score,
      incorrect: quiz.questions.length - score,
      xpGained,
      timeSpent,
      betAmount,
      betTarget,
      betWon
    });
    setShowResults(true);

    if (score > quiz.questions.length * 0.7) {
      feedbackService.celebrate();
    }
  };

  if (isInviting) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl animate-fade-in">
        <WorldBrainMap 
          customBattleMode="custom_quiz" 
          customBattleData={quiz} 
          customBetAmount={betAmount} 
          onCloseMap={() => setIsInviting(false)} 
        />
      </div>
    );
  }

  if (showOracle) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] p-8 md:p-12 space-y-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/20 rounded-[1.5rem] flex items-center justify-center mx-auto border border-primary/20 mb-6">
              <History size={40} className="text-primary animate-pulse" />
            </div>
            <h2 className="text-3xl font-display font-bold text-white tracking-tight">{t('quiz.player.oracle.title')}</h2>
            <p className="text-slate-500 text-sm font-medium">{t('quiz.player.oracle.subtitle')}</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-4 text-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('quiz.player.oracle.betAmount')}</label>
              <div className="flex justify-center gap-3">
                {[0, 10, 20, 50, 100].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    className={`px-4 py-3 rounded-2xl font-black text-xs transition-all border ${betAmount === amount ? 'bg-primary border-primary text-white shadow-glow' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/10'}`}
                  >
                    {amount === 0 ? t('quiz.player.oracle.none') : `${amount} 🪙`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 text-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('quiz.player.oracle.betTarget')}</label>
              <div className="flex justify-center gap-3">
                {[75, 85, 95, 100].map(target => (
                  <button
                    key={target}
                    onClick={() => setBetTarget(target)}
                    className={`px-4 py-3 rounded-2xl font-black text-xs transition-all border ${betTarget === target ? 'bg-secondary border-secondary text-white shadow-glow' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/10'}`}
                  >
                    {target}%+
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleStartWithBet}
              className="w-full py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-glow hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {t('quiz.player.oracle.startBtn')}
            </button>
            <button
              onClick={handleInviteFromMap}
              className="w-full py-4 bg-transparent border-2 border-primary/30 text-primary hover:bg-primary/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-glow"
            >
              Défier sur la Carte 🗺️
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showResults && resultsData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto py-8 px-4 space-y-12"
      >
        {/* Results Header */}
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="w-32 h-32 bg-gradient-to-br from-primary to-secondary rounded-[2.5rem] flex items-center justify-center mx-auto shadow-glow relative"
          >
            <Trophy size={64} className="text-white fill-white" />
            <div className="absolute -bottom-2 -right-2 bg-accent text-white px-4 py-1.5 rounded-full font-black text-sm border-4 border-slate-950">
              +{resultsData.xpGained} XP
            </div>
          </motion.div>

          {/* New: Oracle Bet Result */}
          {resultsData.betAmount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`max-w-xs mx-auto p-4 rounded-2xl border ${resultsData.betWon ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'}`}
            >
              <div className="flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs mb-1">
                {resultsData.betWon ? (
                  <><Target size={14} /> {t('quiz.player.results.betWin')}</>
                ) : (
                  <><AlertCircle size={14} /> {t('quiz.player.results.betFail')}</>
                )}
              </div>
              <p className="text-[10px] font-bold opacity-80">
                {resultsData.betWon
                  ? `${t('quiz.player.results.betWinMsg')} ${resultsData.betAmount * 3} 🪙`
                  : `${t('quiz.player.results.betFailMsg')} ${resultsData.betTarget}% .`}
              </p>
            </motion.div>
          )}

          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter">{t('quiz.player.results.title')}</h1>
            <p className="text-slate-400 font-medium">{t('quiz.player.results.completed')} <span className="text-white">{quiz.title}</span></p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: t('quiz.player.results.score'), value: `${score}/${quiz.questions.length}`, color: 'text-primary' },
            { label: t('quiz.player.results.precision'), value: `${Math.round((score / quiz.questions.length) * 100)}%`, color: 'text-success' },
            { label: t('quiz.player.results.xp'), value: resultsData.xpGained, color: 'text-secondary' },
            { label: t('quiz.player.results.time'), value: `${Math.floor(resultsData.timeSpent / 60)}m ${resultsData.timeSpent % 60}s`, color: 'text-accent' }
          ].map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i}
              className="glass p-6 rounded-[2rem] border border-white/5 text-center space-y-2"
            >
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-2xl font-display font-black ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Summary & Definitions (Prompt 7) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-12 space-y-8">
            <div className="glass p-10 rounded-[3rem] border border-white/5 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] -rotate-12 translate-x-1/4 -translate-y-1/4">
                <BookOpen size={300} />
              </div>

              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-2xl text-white">{t('quiz.player.results.summary')}</h3>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('quiz.player.results.summarySub')}</p>
                  </div>
                </div>
                <p className="text-lg text-slate-300 leading-relaxed font-normal">
                  {quiz.summary}
                </p>
              </div>

              {quiz.keyPoints && quiz.keyPoints.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5 relative z-10">
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                      <Zap size={14} /> {t('quiz.player.results.keyPoints')}
                    </h4>
                    <ul className="space-y-3">
                      {quiz.keyPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-primary/30 transition-colors">
                          <Check className="text-primary mt-1 shrink-0" size={14} />
                          <span className="text-xs text-slate-300 font-medium group-hover:text-white transition-colors">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {quiz.definitions && quiz.definitions.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-secondary font-black uppercase tracking-widest text-xs">
                        <Lightbulb size={14} /> {t('quiz.player.results.lexicon')}
                      </h4>
                      <div className="space-y-3">
                        {quiz.definitions.map((def, i) => (
                          <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-secondary/30 transition-colors">
                            <p className="font-bold text-white text-xs mb-1 group-hover:text-secondary-light transition-colors">{def.term}</p>
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase tracking-wide">{def.definition}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 pt-4 no-print">
          <button
            onClick={() => {
              setCurrentIdx(0);
              setScore(0);
              setShowResults(false);
              setIsAnswered(false);
              setSelectedOption(null);
              setShowOracle(true);
              setBetAmount(0);
            }}
            className="flex-1 py-5 md:py-6 bg-gradient-to-r from-primary to-secondary text-white rounded-xl md:rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] md:text-[11px] shadow-glow flex items-center justify-center gap-2 md:gap-3 hover:scale-[1.03] transition-all"
          >
            <Repeat size={16} className="md:w-[18px] md:h-[18px]" /> {t('quiz.player.results.retryBtn')}
          </button>

          {wrongQuestions.length > 0 && (
             <button
              onClick={() => {
                 if (resultsData?.flashcardsSaved) return;
                 addFromErrors(wrongQuestions, quiz.title || 'Quiz sans titre', quiz.subject || 'Général');
                 addActivity('flashcard', 'Nouvelles Flashcards ! 🗂️', `${wrongQuestions.length} cartes de révision ont été générées de tes erreurs.`);
                 setResultsData(prev => prev ? { ...prev, flashcardsSaved: true } : null);
                 Haptics.notification({ type: NotificationType.Success }).catch(() => {});
              }}
              disabled={resultsData?.flashcardsSaved}
              className={`flex-1 py-5 md:py-6 rounded-xl md:rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] md:text-[11px] shadow-glow flex items-center justify-center gap-2 md:gap-3 transition-all ${resultsData?.flashcardsSaved ? 'bg-success/20 text-success border border-success/30' : 'bg-purple-600 text-white hover:scale-[1.03]'}`}
            >
              <Brain size={16} className="md:w-[18px] md:h-[18px]" /> 
              {resultsData?.flashcardsSaved ? 'Erreurs Sauvegardées !' : `Sauver Erreurs en Flashcards (${wrongQuestions.length})`}
            </button>
          )}

          {!isSaved && (
            <button
              onClick={() => {
                saveQuiz(quiz);
                setIsSaved(true);
                addActivity('quiz', 'Quiz Enregistré', `Le quiz "${quiz.title}" a été ajouté à ta bibliothèque.`);
              }}
              className="flex-1 py-5 md:py-6 bg-orange-600 text-white rounded-xl md:rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] md:text-[11px] shadow-glow flex items-center justify-center gap-2 md:gap-3 hover:scale-[1.03] transition-all"
            >
              <Zap size={16} className="md:w-[18px] md:h-[18px]" /> Sauvegarder
            </button>
          )}

          <button
            onClick={handleExportPDF}
            className="flex-1 py-6 bg-accent/10 hover:bg-accent/20 text-accent rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] border border-accent/20 transition-all flex items-center justify-center gap-3"
          >
            <Download size={18} /> {t('common.exportPDF')}
          </button>


          <button
            onClick={onClose}
            className="flex-1 py-6 bg-white/5 hover:bg-white text-slate-400 hover:text-slate-900 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] border border-white/10 hover:border-white transition-all flex items-center justify-center gap-3"
          >
            <Home size={18} /> {t('quiz.player.results.homeBtn')}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-[80vh] md:min-h-[85vh] flex items-center justify-center px-3 py-4 md:py-12">
      <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3.5rem] border border-white/10 shadow-premium overflow-hidden flex flex-col relative">
        {/* Progress Header */}
        <div className="p-4 md:p-8 md:pb-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-slate-400">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">{quiz.title}</p>
              <h4 className="text-white font-display font-bold text-sm md:text-lg">Question {currentIdx + 1}/{quiz.questions.length}</h4>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Potion Buttons */}
            {consumables['potion_shield'] > 0 && (
              <button
                onClick={useShieldPotion}
                disabled={isAnswered || shieldActive}
                className={`p-1 rounded-xl border flex items-center gap-1.5 transition-all overflow-hidden ${shieldActive ? 'bg-primary/20 border-primary/40 text-primary animate-pulse' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
                title={t('quiz.player.potions.shield')}
              >
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white/5">
                  <img src="/assets/fiole magique/WhatsApp Image 2026-02-10 at 02.26.02.jpeg" alt="Shield" className="w-full h-full object-contain" />
                </div>
                <span className="text-[9px] md:text-[10px] font-black pr-1">{consumables['potion_shield']}</span>
              </button>
            )}
            {consumables['potion_skip'] > 0 && (
              <button
                onClick={useSkipPotion}
                disabled={isAnswered}
                className="p-1 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-1.5 transition-all overflow-hidden"
                title={t('quiz.player.potions.skip')}
              >
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white/5">
                  <img src="/assets/fiole magique/WhatsApp Image 2026-02-10 at 02.26.03.jpeg" alt="Skip" className="w-full h-full object-contain" />
                </div>
                <span className="text-[9px] md:text-[10px] font-black pr-1">{consumables['potion_skip']}</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 md:p-3 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl md:rounded-2xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 mb-4 md:px-8 md:mb-8">
          <div className="h-1.5 md:h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIdx + 1) / quiz.questions.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Question Area */}
        <div className="px-4 pb-4 md:px-8 md:pb-10 flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3 md:space-y-8 flex-1 flex flex-col"
            >
              <h2 className="text-sm md:text-xl font-bold text-white text-center leading-snug px-2 py-2 md:py-4 min-h-[3.5rem] md:min-h-[4rem] flex items-center justify-center">
                {currentQuestion.text}
              </h2>

              <div className="grid grid-cols-1 gap-2.5 md:gap-4">
                {currentQuestion.options.map((option, i) => {
                  const isCorrect = i === currentQuestion.correctAnswer;
                  const isSelected = selectedOption === i;

                  let stateStyle = "bg-white/5 border-white/5 text-slate-200 hover:bg-white/10 hover:border-white/10";
                  if (isAnswered) {
                    if (isCorrect) stateStyle = "bg-success/20 border-success/40 text-success shadow-[0_0_20px_rgba(34,197,94,0.1)]";
                    else if (isSelected) stateStyle = "bg-danger/20 border-danger/40 text-danger";
                    else stateStyle = "bg-white/5 border-white/5 text-slate-500 opacity-50";
                  }

                  return (
                    <button
                      key={i}
                      disabled={isAnswered}
                      onClick={() => handleOptionClick(i)}
                      className={`
                        w-full p-3.5 md:p-6 rounded-xl md:rounded-2xl border text-left font-bold transition-all duration-300 flex items-center justify-between gap-3 md:gap-4 group
                        ${stateStyle}
                        ${!isAnswered && "hover:scale-[1.01] active:scale-98"}
                      `}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <span className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[10px] md:text-xs font-black uppercase transition-colors ${isSelected ? 'bg-white/20' : 'bg-white/5 text-slate-500'}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-xs md:text-sm tracking-tight leading-snug">{option}</span>
                      </div>
                      <AnimatePresence>
                        {isAnswered && isCorrect && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle2 size={18} className="text-success md:w-[24px] md:h-[24px]" /></motion.div>}
                        {isAnswered && isSelected && !isCorrect && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><XCircle size={18} className="text-danger md:w-[24px] md:h-[24px]" /></motion.div>}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </div>

              {/* Feedback & Explanation (Prompt 5) */}
              <AnimatePresence>
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 md:p-6 rounded-2xl md:rounded-[2rem] border transition-all ${selectedOption === currentQuestion.correctAnswer ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}
                  >
                    <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center border ${selectedOption === currentQuestion.correctAnswer ? 'bg-success/20 border-success/30 text-success' : 'bg-danger/20 border-danger/30 text-danger animate-pulse'}`}>
                        {selectedOption === currentQuestion.correctAnswer ? <Trophy size={16} /> : <AlertCircle size={16} />}
                      </div>
                      <div className="flex-1">
                        <h5 className={`font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px] ${selectedOption === currentQuestion.correctAnswer ? 'text-success' : 'text-danger'}`}>
                          {encouragement}
                        </h5>
                        {selectedOption !== currentQuestion.correctAnswer && (
                           <p className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Explication Pédagogique</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/5 max-h-[8rem] overflow-y-auto custom-scrollbar">
                      <p className="text-[11px] md:text-sm text-slate-300 leading-relaxed font-medium">
                        {currentQuestion.explanation || "L'IA n'a pas fourni d'explication pour cette question, mais la réponse correcte est mise en évidence."}
                      </p>
                    </div>

                    <button
                      onClick={nextQuestion}
                      className="w-full mt-4 py-3 md:py-4 bg-white text-slate-900 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      {currentIdx === quiz.questions.length - 1 ? t('quiz.player.activity') : t('quiz.player.nextQuestion')} <ChevronRight size={10} className="md:w-[14px] md:h-[14px]" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Score Footer */}
        <div className="p-4 md:p-6 bg-slate-950/50 border-t border-white/5 flex items-center justify-between relative z-0">
          <div className="flex gap-1 overflow-x-auto max-w-[60%] py-1">
            {quiz.questions.map((_, i) => (
              <div key={i} className={`h-1.5 w-4 md:w-6 rounded-full transition-colors flex-shrink-0 ${i < currentIdx ? 'bg-success' : i === currentIdx ? 'bg-primary animate-pulse' : 'bg-white/5'}`}></div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Précision :</span>
            <span className="text-xs md:text-sm font-black text-white">{score}/{quiz.questions.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPlayer;

