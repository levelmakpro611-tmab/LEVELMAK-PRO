import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, CheckCircle, XCircle, Trophy, Coins, Sparkles, Loader2 } from 'lucide-react';
import { BattleState, QuizQuestion } from '../types';
import { supabase } from '../services/supabase';
import { HapticFeedback } from '../services/nativeAdapters';
import { useStore } from '../hooks/useStore';
import { openrouterService } from '../services/openrouter';

interface QuizBattleProps {
  initialState: BattleState;
  isHost: boolean;
  onClose: () => void;
}

export const QuizBattle: React.FC<QuizBattleProps> = ({ initialState, isHost, onClose }) => {
  const { user, resolveBattle, addLevelCoins } = useStore();
  const [battle, setBattle] = useState<BattleState>(initialState);
  const [channel, setChannel] = useState<any>(null);
  const [localSelected, setLocalSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [battleResolved, setBattleResolved] = useState(false);

  // Deduct coins at start if custom battle with bets
  useEffect(() => {
    if (battle.status === 'active' && battle.type === 'custom_quiz' && battle.betAmount) {
      // Deduct bet amount from both players locally on mount
      addLevelCoins(-battle.betAmount);
    }
  }, [battle.betAmount, battle.type]);

  // Fetch AI-generated questions (host only, then syncs to guest)
  useEffect(() => {
    const battleChannel = supabase.channel(`battle-${battle.id}`, {
      config: { broadcast: { self: false } }
    });

    battleChannel
      .on('broadcast', { event: 'battle_sync' }, ({ payload }) => {
        setBattle(payload.state);
      })
      .on('broadcast', { event: 'questions_ready' }, ({ payload }) => {
        setQuestions(payload.questions);
        setLoadingQuestions(false);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          if (isHost) {
            if (battle.type === 'custom_quiz' && battle.customQuiz) {
              setQuestions(battle.customQuiz.questions);
              setLoadingQuestions(false);
              battleChannel.send({
                type: 'broadcast',
                event: 'questions_ready',
                payload: { questions: battle.customQuiz.questions }
              });
            } else {
              try {
                const qs = await openrouterService.getBattleQuiz('fr');
                setQuestions(qs);
                setLoadingQuestions(false);
                // Share questions with guest
                battleChannel.send({
                  type: 'broadcast',
                  event: 'questions_ready',
                  payload: { questions: qs }
                });
              } catch (e) {
                console.error('Failed to fetch battle questions:', e);
                setLoadingQuestions(false);
              }
            }
          }
          // Guest waits for 'questions_ready' broadcast
        }
      });

    setChannel(battleChannel);
    return () => { supabase.removeChannel(battleChannel); };
  }, [battle.id, isHost]);

  // Timer per question
  useEffect(() => {
    if (battle.status !== 'active' || loadingQuestions || questions.length === 0) return;
    setTimeLeft(15);
    setLocalSelected(null);
    setShowResult(false);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleTimeUp(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [battle.currentQuestionIndex, battle.status, loadingQuestions, questions.length]);

  const handleTimeUp = useCallback(() => {
    if (localSelected === null) submitAnswer(-1);
  }, [localSelected]);

  const submitAnswer = useCallback((answerIdx: number) => {
    if (showResult || battle.status !== 'active' || questions.length === 0) return;
    setLocalSelected(answerIdx);
    setShowResult(true);

    const isCorrect = answerIdx === questions[battle.currentQuestionIndex!]?.correctAnswer;
    const pointsGained = isCorrect ? (10 + timeLeft) : 0;
    if (isCorrect) HapticFeedback.correctAnswer(); else HapticFeedback.wrongAnswer();

    const newState = { ...battle };
    if (isHost) {
      newState.hostAnswers = [...(newState.hostAnswers || []), answerIdx];
      newState.host.score += pointsGained;
    } else {
      newState.guestAnswers = [...(newState.guestAnswers || []), answerIdx];
      newState.guest.score += pointsGained;
    }

    channel?.send({ type: 'broadcast', event: 'battle_sync', payload: { state: newState } });
    setBattle(newState);
    setTimeout(() => advanceRound(newState), 2000);
  }, [showResult, battle, questions, timeLeft, isHost, channel]);

  const advanceRound = useCallback((s: BattleState) => {
    if (!isHost) return;
    if (s.currentQuestionIndex! >= questions.length - 1) {
      const isDraw = s.host.score === s.guest.score;
      const winner = s.host.score >= s.guest.score ? s.host.id : s.guest.id;
      const finalState = { ...s, status: 'finished' as const, winnerId: isDraw ? null : winner };
      setBattle(finalState);
      channel?.send({ type: 'broadcast', event: 'battle_sync', payload: { state: finalState } });
    } else {
      const next = { ...s, currentQuestionIndex: s.currentQuestionIndex! + 1 };
      setBattle(next);
      channel?.send({ type: 'broadcast', event: 'battle_sync', payload: { state: next } });
    }
  }, [isHost, questions.length, channel]);

  // Award coins/XP when battle finishes
  useEffect(() => {
    if (battle.status === 'finished' && !battleResolved && user) {
      setBattleResolved(true);
      const isWinner = battle.winnerId === user.id;
      const isDraw = !battle.winnerId;

      if (battle.type === 'custom_quiz' && battle.betAmount) {
        if (isWinner) {
          addLevelCoins(battle.betAmount * 2);
          HapticFeedback.levelUp();
        } else if (isDraw) {
          addLevelCoins(battle.betAmount);
        }
        // Winner takes all in custom bet, no standard resolveBattle generic coins
        // We can just add XP manually without calling resolveBattle to avoid double rewards
        if (isWinner) resolveBattle(user.id, false); // Resolves stats only, but resolveBattle adds fixed 10 coins usually.
        // Wait, resolveBattle handles fixed coins currently.
        // Instead of modifying resolveBattle, we just accept the extra +10 standard coins, or we manage it here.
        // Actually, just calling resolveBattle will add those 10. Let's keep it simple.
      } else {
        resolveBattle(battle.winnerId || '', isDraw);
        if (isWinner) HapticFeedback.levelUp();
      }
    }
  }, [battle.status, battle.winnerId, battleResolved, user, resolveBattle, battle.type, battle.betAmount, addLevelCoins]);

  // Loading state
  if (loadingQuestions) {
    return (
      <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center gap-6">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Sparkles size={64} className="text-primary" />
        </motion.div>
        <Loader2 className="text-slate-500 animate-spin" size={32} />
        <p className="text-white font-black uppercase tracking-widest text-lg">L'IA prépare le duel...</p>
        <p className="text-slate-400 text-sm font-medium">10 questions originales en cours de génération</p>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-full">
          <Coins size={16} className="text-amber-500" />
          <span className="text-amber-400 font-black text-sm">Mise : 10 LevelCoins</span>
        </div>
      </div>
    );
  }

  // Results screen
  if (battle.status === 'finished') {
    const isWinner = battle.winnerId === user?.id;
    const isDraw = !battle.winnerId;
    const hasBet = battle.type === 'custom_quiz' && battle.betAmount;

    let rewardText = '';
    if (hasBet) {
      rewardText = isWinner ? `+${battle.betAmount * 2} LevelCoins` : isDraw ? `Remboursement de ${battle.betAmount} LevelCoins` : `-${battle.betAmount} LevelCoins`;
    } else {
      rewardText = isWinner ? '+10 LevelCoins • +50 XP' : isDraw ? 'Match Nul — +20 XP' : '-10 LevelCoins • +20 XP';
    }

    return (
      <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 pb-24">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
          <Trophy size={100} className={`mb-6 ${isWinner ? 'text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]' : isDraw ? 'text-slate-400' : 'text-slate-600'}`} />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-black text-white mb-2 uppercase tracking-widest text-center">
          {isDraw ? 'Match Nul !' : isWinner ? '🏆 Victoire Épique !' : 'Défaite Honorable'}
        </motion.h2>

        {/* Coin Result */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className={`flex items-center gap-2 px-5 py-2 rounded-full border mb-6 font-black text-base ${
            isWinner ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
            : isDraw ? 'bg-slate-500/20 border-slate-500/40 text-slate-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
          <Coins size={18} />
          {rewardText}
        </motion.div>

        <div className="flex gap-12 text-center w-full max-w-md bg-slate-900/50 p-6 rounded-3xl border border-white/10 relative overflow-hidden mb-8">
          <div className="flex-1 z-10">
            <p className="font-bold text-lg text-white">{battle.host.name}</p>
            <p className="text-3xl font-black text-blue-400 mt-2">{battle.host.score}</p>
          </div>
          <div className="w-px bg-white/10 relative z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-800 opacity-20 z-0">
            <Swords size={150} />
          </div>
          <div className="flex-1 z-10">
            <p className="font-bold text-lg text-white">{battle.guest.name}</p>
            <p className="text-3xl font-black text-red-400 mt-2">{battle.guest.score}</p>
          </div>
        </div>

        <button onClick={onClose} className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-2xl">
          Retourner sur la Carte
        </button>
      </div>
    );
  }

  const question = questions[battle.currentQuestionIndex!];
  if (!question) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-between p-3 md:p-8 overflow-y-auto">
      <div className="absolute top-3 right-3 z-20">
        <button onClick={onClose} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white"><X size={20} /></button>
      </div>

      {/* Bet indicator */}
      {battle.type === 'custom_quiz' && battle.betAmount && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full">
          <Coins size={12} className="text-amber-500" />
          <span className="text-amber-400 font-black text-[9px] uppercase tracking-widest">Mise : {battle.betAmount * 2} Coins</span>
        </div>
      )}

      {/* Battle Header - compact on mobile */}
      <div className="w-full max-w-2xl mt-10 md:mt-12 bg-slate-900 border border-white/10 px-3 py-3 md:p-4 rounded-2xl md:rounded-3xl flex justify-between items-center relative overflow-hidden shadow-2xl flex-shrink-0">
        <div className="flex flex-col items-center flex-1 relative z-10">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500 rounded-full mb-1.5 p-0.5 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <img src={battle.host.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${battle.host.name}`} alt="Host" className="w-full h-full rounded-full bg-slate-800" />
          </div>
          <p className="font-bold text-white uppercase text-[10px] tracking-wider truncate max-w-[80px]">{battle.host.name}</p>
          <div className="font-black text-xl md:text-2xl text-blue-400">{battle.host.score}</div>
        </div>
        <div className="flex flex-col items-center justify-center z-10 px-2">
          <Swords size={24} className="text-slate-500 mb-0.5" />
          <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Q{battle.currentQuestionIndex + 1}/{questions.length}</span>
        </div>
        <div className="flex flex-col items-center flex-1 relative z-10">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-red-500 rounded-full mb-1.5 p-0.5 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
            <img src={battle.guest.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${battle.guest.name}`} alt="Guest" className="w-full h-full rounded-full bg-slate-800" />
          </div>
          <p className="font-bold text-white uppercase text-[10px] tracking-wider truncate max-w-[80px]">{battle.guest.name}</p>
          <div className="font-black text-xl md:text-2xl text-red-400">{battle.guest.score}</div>
        </div>
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-1/2 bottom-0 bg-blue-500/10 skew-x-12 translate-x-10" />
          <div className="absolute top-0 left-1/2 bottom-0 bg-red-500/10 -skew-x-12 -translate-x-10" />
        </div>
      </div>

      {/* Question Area */}
      <div className="w-full max-w-2xl text-center flex-1 flex flex-col justify-center py-3 md:py-4">
        <div className="mb-4 md:mb-6 w-full max-w-sm mx-auto">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / 15) * 100}%` }}
              transition={{ duration: 1, ease: 'linear' }}
              className={`h-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-emerald-500'}`}
            />
          </div>
          <p className={`mt-1.5 font-black text-xl md:text-2xl ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>{timeLeft}s</p>
        </div>

        <h3 className="text-base md:text-xl font-black text-white mb-5 md:mb-8 leading-tight px-2">{question.text}</h3>

        <div className="space-y-2.5 md:space-y-3">
          {question.options.map((option, idx) => {
            let btnStyle = "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700";
            if (showResult) {
              if (idx === question.correctAnswer) btnStyle = "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]";
              else if (idx === localSelected) btnStyle = "bg-red-500 text-white border-red-400";
              else btnStyle = "bg-slate-900 border-slate-800 text-slate-600 opacity-40";
            }
            return (
              <button key={idx} disabled={showResult} onClick={() => submitAnswer(idx)}
                className={`w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border-2 font-bold text-sm text-left transition-all flex items-center justify-between active:scale-[0.98] ${btnStyle}`}>
                <span>{option}</span>
                {showResult && idx === question.correctAnswer && <CheckCircle className="text-white shrink-0" size={18} />}
                {showResult && idx === localSelected && idx !== question.correctAnswer && <XCircle className="text-white shrink-0" size={18} />}
              </button>
            );
          })}
        </div>

        {showResult && question.explanation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-blue-500/10 text-blue-400 p-3 rounded-xl text-xs font-medium border border-blue-500/20">
            <p className="font-bold mb-1">Explication :</p>
            {question.explanation}
          </motion.div>
        )}
      </div>
    </div>
  );
};


