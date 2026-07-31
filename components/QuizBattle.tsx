import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, CheckCircle, XCircle, Trophy, Coins, Sparkles, Loader2 } from 'lucide-react';
import { BattleState, QuizQuestion } from '../types';
import { supabase } from '../services/supabase';
import { HapticFeedback } from '../services/nativeAdapters';
import { useStore } from '../hooks/useStore';
import { aiService } from '../services/aiService';
import { audioService } from '../services/audio';

interface QuizBattleProps {
  initialState: BattleState;
  isHost: boolean;
  onClose: () => void;
}

export const QuizBattle: React.FC<QuizBattleProps> = ({ initialState, isHost, onClose }) => {
  const { user, resolveBattle, addLevelCoins, addNotification, t } = useStore();
  const [battle, setBattle] = useState<BattleState>({
    currentQuestionIndex: 0,
    ...initialState,
    host: {
      ...initialState.host,
      score: Number(initialState.host?.score) || 0
    },
    guest: {
      ...initialState.guest,
      score: Number(initialState.guest?.score) || 0
    }
  });
  const [channel, setChannel] = useState<any>(null);
  const [localSelected, setLocalSelected] = useState<number | null>(null);
  const [opponentSelected, setOpponentSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [battleResolved, setBattleResolved] = useState(false);

  // New states for real-time multiplayer enhancements
  const [abandonedByOpponent, setAbandonedByOpponent] = useState(false);
  const [abandonRewardsClaimed, setAbandonRewardsClaimed] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Refs to avoid stale closures in Supabase callbacks
  const currentIdxRef = useRef(battle.currentQuestionIndex);
  currentIdxRef.current = battle.currentQuestionIndex;

  const userIdRef = useRef(user?.id);

  useEffect(() => {
    audioService.startBackgroundPiano();
    return () => {
      audioService.stopBackgroundPiano();
    };
  }, []);
  userIdRef.current = user?.id;

  const battleRef = useRef(battle);
  battleRef.current = battle;

  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  const showResultRef = useRef(showResult);
  showResultRef.current = showResult;

  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  const opponentJoinedRef = useRef(false);

  // Deduct coins at start if custom battle with bets
  useEffect(() => {
    if (battle.status === 'active' && battle.type === 'custom_quiz' && battle.betAmount) {
      addLevelCoins(-battle.betAmount);
    }
  }, [battle.betAmount, battle.type]);

  // Fetch AI questions & Subscribe to Realtime Channel
  useEffect(() => {
    const isOpponentBot = battle.guest?.id === 'levelbot' || battle.host?.id === 'levelbot';

    if (isOpponentBot) {
      // Solo Game against LevelBot
      const loadSolo = async () => {
        try {
          const qs = await aiService.getBattleQuiz('fr');
          setQuestions(qs);
        } catch (e) {
          console.error('Failed to fetch solo quiz questions:', e);
        } finally {
          setLoadingQuestions(false);
        }
      };
      loadSolo();
      return;
    }

    const battleChannel = supabase.channel(`battle-${battle.id}`, {
      config: { broadcast: { self: false } }
    });

    battleChannel
      .on('presence', { event: 'sync' }, () => {
        const state = battleChannel.presenceState();
        const pList = Object.values(state).flat() as any[];
        const opponentId = isHost ? battleRef.current.guest.id : battleRef.current.host.id;
        const isOpponentPresent = pList.some((p: any) => p.userId === opponentId);
        
        if (isOpponentPresent) {
          opponentJoinedRef.current = true;
        }

        // Only trigger if game has started, opponent joined at some point, and is now gone
        if (battleRef.current.status === 'active' && opponentJoinedRef.current && !isOpponentPresent) {
          setTimeout(() => {
            const currentPresence = battleChannel.presenceState();
            const currentList = Object.values(currentPresence).flat() as any[];
            const stillGone = !currentList.some((p: any) => p.userId === opponentId);
            if (stillGone && battleRef.current.status === 'active') {
              handleOpponentAbandon();
            }
          }, 15000); // 15 seconds grace period
        }
      })
      .on('broadcast', { event: 'battle_sync' }, ({ payload }) => {
        setBattle(payload.state);
      })
      .on('broadcast', { event: 'questions_ready' }, ({ payload }) => {
        setQuestions(payload.questions);
        setLoadingQuestions(false);
      })
      .on('broadcast', { event: 'answer_submitted' }, ({ payload }) => {
        if (payload.questionIndex === currentIdxRef.current) {
          processAnswer(payload.senderId === battleRef.current.host.id, payload.answerIdx, payload.timeLeft);
        }
      })
      .on('broadcast', { event: 'battle_abandoned' }, ({ payload }) => {
        if (payload.senderId !== userIdRef.current && (!payload.battleId || payload.battleId === battleRef.current.id)) {
          handleOpponentAbandon();
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await battleChannel.track({ userId: user?.id, onlineAt: new Date().toISOString() });
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
                const qs = await aiService.getBattleQuiz('fr');
                setQuestions(qs);
                setLoadingQuestions(false);
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
        }
      });

    setChannel(battleChannel);
    return () => { supabase.removeChannel(battleChannel); };
  }, [battle.id, isHost]);

  // Reset states on new question
  useEffect(() => {
    if (battle.status !== 'active' || loadingQuestions || questions.length === 0) return;
    setLocalSelected(null);
    setOpponentSelected(null);
    setShowResult(false);
  }, [battle.currentQuestionIndex, loadingQuestions, questions.length]);

  // Timer per question (stops when showResult is true)
  useEffect(() => {
    if (battle.status !== 'active' || loadingQuestions || questions.length === 0 || showResult) return;
    setTimeLeft(30);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleTimeUp(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [battle.currentQuestionIndex, battle.status, loadingQuestions, questions.length, showResult]);

  const handleTimeUp = useCallback(() => {
    if (localSelected === null) submitAnswer(-1);
  }, [localSelected]);

  // LevelBot AI simulation effect
  useEffect(() => {
    const isOpponentBot = battle.guest?.id === 'levelbot' || battle.host?.id === 'levelbot';
    if (!isOpponentBot || battle.status !== 'active' || loadingQuestions || questions.length === 0 || showResult) return;

    const botDifficulty = String(battle.guest?.difficulty || battle.difficulty || 'easy').toLowerCase();
    
    // AI Bot timing requested by user:
    // AI answers after 10 seconds elapsed (when timer reaches 20s left out of 30s)
    const botTimeLeft = 20;
    const secondsToWait = 10;
    let correctChance = 0.50;

    if (botDifficulty.includes('hard') || botDifficulty.includes('expert')) {
      correctChance = 0.95; // Very costaud!
    } else if (botDifficulty.includes('moyen') || botDifficulty.includes('medium') || botDifficulty.includes('intermédiaire')) {
      correctChance = 0.75;
    } else {
      correctChance = 0.50;
    }

    const questionObj = questions[battle.currentQuestionIndex!];
    if (!questionObj) return;
    const correctIdx = questionObj.correctAnswer;
    let botAnswerIdx = correctIdx;
    if (Math.random() > correctChance) {
      const incorrectOptions = questionObj.options
        .map((_, idx) => idx)
        .filter(idx => idx !== correctIdx);
      if (incorrectOptions.length > 0) {
        botAnswerIdx = incorrectOptions[Math.floor(Math.random() * incorrectOptions.length)];
      }
    }

    const timer = setTimeout(() => {
      if (battleRef.current.currentQuestionIndex === battle.currentQuestionIndex && !showResultRef.current) {
        processAnswer(false, botAnswerIdx, botTimeLeft);
      }
    }, secondsToWait * 1000);

    return () => clearTimeout(timer);
  }, [battle.currentQuestionIndex, battle.status, loadingQuestions, questions.length, showResult]);

  // Submit local answer and broadcast
  const submitAnswer = useCallback((answerIdx: number) => {
    if (showResultRef.current || battleRef.current.status !== 'active' || questionsRef.current.length === 0) return;
    
    audioService.playClick();
    
    const isOpponentBot = battleRef.current.guest?.id === 'levelbot' || battleRef.current.host?.id === 'levelbot';
    if (!isOpponentBot) {
      channel?.send({
        type: 'broadcast',
        event: 'answer_submitted',
        payload: {
          senderId: userIdRef.current,
          answerIdx,
          timeLeft: timeLeftRef.current,
          questionIndex: currentIdxRef.current
        }
      });
    }

    processAnswer(userIdRef.current === battleRef.current.host.id, answerIdx, timeLeftRef.current);
  }, [channel]);

  // Process any player's answer (local or remote)
  const processAnswer = useCallback((answeredIsHost: boolean, answerIdx: number, secondsLeft: number) => {
    if (showResultRef.current) return;
    
    setShowResult(true);
    
    const isSelfHost = userIdRef.current === battleRef.current.host.id;
    const isCorrect = answerIdx === questionsRef.current[currentIdxRef.current!]?.correctAnswer;
    const pointsGained = isCorrect ? (10 + secondsLeft) : 0;
    
    if (isSelfHost === answeredIsHost) {
      setLocalSelected(answerIdx);
      if (isCorrect) {
          HapticFeedback.correctAnswer();
          audioService.playSuccess('quiz');
      } else {
          HapticFeedback.wrongAnswer();
          audioService.playError('quiz');
      }
    } else {
      setOpponentSelected(answerIdx);
      HapticFeedback.selection?.() || HapticFeedback.navigation();
    }

    const newState = { ...battleRef.current };
    if (answeredIsHost) {
      newState.hostAnswers = [...(newState.hostAnswers || []), answerIdx];
      newState.host.score += pointsGained;
      if (newState.guestAnswers?.length === currentIdxRef.current) {
        newState.guestAnswers = [...(newState.guestAnswers || []), -1];
      }
    } else {
      newState.guestAnswers = [...(newState.guestAnswers || []), answerIdx];
      newState.guest.score += pointsGained;
      if (newState.hostAnswers?.length === currentIdxRef.current) {
        newState.hostAnswers = [...(newState.hostAnswers || []), -1];
      }
    }

    setBattle(newState);

    // Host manages authoritative sync and schedules transition
    if (isHost) {
      const isOpponentBot = newState.guest?.id === 'levelbot' || newState.host?.id === 'levelbot';
      if (!isOpponentBot) {
        channel?.send({ type: 'broadcast', event: 'battle_sync', payload: { state: newState } });
      }
      setTimeout(() => advanceRound(newState), 2500);
    }
  }, [isHost, channel]);

  // Transition to next round
  const advanceRound = useCallback((s: BattleState) => {
    if (!isHost) return;
    const isOpponentBot = s.guest?.id === 'levelbot' || s.host?.id === 'levelbot';
    if (s.currentQuestionIndex! >= questionsRef.current.length - 1) {
      const isDraw = s.host.score === s.guest.score;
      const winner = s.host.score >= s.guest.score ? s.host.id : s.guest.id;
      const finalState = { ...s, status: 'finished' as const, winnerId: isDraw ? null : winner };
      setBattle(finalState);
      if (!isOpponentBot) {
        channel?.send({ type: 'broadcast', event: 'battle_sync', payload: { state: finalState } });
      }
    } else {
      const next = { ...s, currentQuestionIndex: s.currentQuestionIndex! + 1 };
      setBattle(next);
      if (!isOpponentBot) {
        channel?.send({ type: 'broadcast', event: 'battle_sync', payload: { state: next } });
      }
    }
  }, [isHost, channel]);

  // Forfeit/Abandonment logic
  const handleOpponentAbandon = useCallback(() => {
    setAbandonedByOpponent(true);
    setShowResult(true); // stops timer countdown
    HapticFeedback.levelUp();
  }, []);

  // Forfeit rewards processor
  useEffect(() => {
    if (abandonedByOpponent && !abandonRewardsClaimed && user) {
      setAbandonRewardsClaimed(true);
      const isCustom = battle.type === 'custom_quiz' && battle.betAmount;
      if (isCustom) {
        addLevelCoins(battle.betAmount * 2);
        addNotification('success', '🏆 Victoire par Forfait !', `L'adversaire a quitté. Vous remportez ${battle.betAmount * 2} LevelCoins !`);
      } else {
        resolveBattle(user.id, false);
        addNotification('success', '🏆 Victoire par Forfait !', `L'adversaire a abandonné. Victoire enregistrée !`);
      }
    }
  }, [abandonedByOpponent, abandonRewardsClaimed, user, battle.type, battle.betAmount, addLevelCoins, addNotification, resolveBattle]);

  // Quit triggers
  const handleQuitClick = () => {
    if (battle.status === 'active' && !abandonedByOpponent) {
      setShowQuitConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmQuit = () => {
    channel?.send({
      type: 'broadcast',
      event: 'battle_abandoned',
      payload: { senderId: user?.id, battleId: battle.id }
    });
    setTimeout(() => {
      onClose();
    }, 500);
  };

  // Normal battle completion reward
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
        if (isWinner) resolveBattle(user.id, false);
      } else {
        resolveBattle(battle.winnerId || '', isDraw);
        if (isWinner) HapticFeedback.levelUp();
      }
    }
  }, [battle.status, battle.winnerId, battleResolved, user, resolveBattle, battle.type, battle.betAmount, addLevelCoins]);

  // Loading view
  if (loadingQuestions) {
    return (
      <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center gap-6">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Sparkles size={64} className="text-primary" />
        </motion.div>
        <Loader2 className="text-slate-500 animate-spin" size={32} />
        <p className="text-white font-black uppercase tracking-widest text-lg">{t('quiz.battle.preparing')}</p>
        <p className="text-slate-400 text-sm font-medium">{t('quiz.battle.questionsGen')}</p>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-full">
          <Coins size={16} className="text-amber-500" />
          <span className="text-amber-400 font-black text-sm">{t('quiz.battle.betLabel', { amount: 10 })}</span>
        </div>
      </div>
    );
  }

  // Abandon Victory view
  if (abandonedByOpponent) {
    const isCustom = battle.type === 'custom_quiz' && battle.betAmount;
    return (
      <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
          <Trophy size={100} className="mb-6 text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] animate-bounce" />
        </motion.div>
        <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-widest">
          🏆 Victoire par Forfait !
        </h2>
        <p className="text-slate-400 max-w-sm mb-6 text-sm">
          L'adversaire a quitté le quiz. Vous remportez automatiquement le duel et toutes les récompenses !
        </p>

        <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-6 py-3 rounded-full font-black text-lg mb-10 shadow-premium">
          <Coins size={22} />
          {isCustom ? `+${battle.betAmount * 2} LevelCoins` : `+10 LevelCoins • +50 XP`}
        </div>

        <button onClick={onClose} className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-2xl">
          Retourner à la carte
        </button>
      </div>
    );
  }

  // Quit Confirmation view
  if (showQuitConfirm) {
    const isCustom = battle.type === 'custom_quiz' && battle.betAmount;
    return (
      <div className="fixed inset-0 z-[1001] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl">
          <h3 className="text-2xl font-black text-white uppercase mb-4">Abandonner le duel ?</h3>
          <p className="text-slate-400 text-sm mb-8">
            {isCustom 
              ? `Attention ! Si vous quittez maintenant, vous perdrez votre mise de ${battle.betAmount} LevelCoins et l'adversaire remportera la partie.` 
              : "Si vous quittez maintenant, le duel sera annulé et vous perdrez vos points accumulés."}
          </p>
          
          <div className="flex flex-col gap-3">
            <button onClick={confirmQuit} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
              Oui, abandonner 🏳️
            </button>
            <button onClick={() => setShowQuitConfirm(false)} className="w-full py-4 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase text-sm hover:bg-slate-700 transition-colors">
              Non, continuer ⚔️
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Finished view
  if (battle.status === 'finished') {
    const isWinner = battle.winnerId === user?.id;
    const isDraw = !battle.winnerId;
    const hasBet = battle.type === 'custom_quiz' && battle.betAmount;

    let rewardText = '';
    if (hasBet) {
      rewardText = isWinner ? `+${battle.betAmount * 2} LevelCoins` : isDraw ? `${t('common.refund')} ${battle.betAmount} LevelCoins` : `-${battle.betAmount} LevelCoins`;
    } else {
      rewardText = isWinner ? `+10 LevelCoins • +50 XP` : isDraw ? `${t('quiz.battle.draw')} — +20 XP` : `-10 LevelCoins • +20 XP`;
    }

    return (
      <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 pb-24">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
          <Trophy size={100} className={`mb-6 ${isWinner ? 'text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]' : isDraw ? 'text-slate-400' : 'text-slate-600'}`} />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-black text-white mb-2 uppercase tracking-widest text-center">
          {isDraw ? t('quiz.battle.draw') : isWinner ? t('quiz.battle.victory') : t('quiz.battle.defeat')}
        </motion.h2>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className={`flex items-center gap-2 px-5 py-2 rounded-full border mb-6 font-black text-base ${
            isWinner ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
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
          {t('quiz.battle.backToMap')}
        </button>
      </div>
    );
  }

  const activeQuestions = questions.length > 0 ? questions : [
    { id: 'fb_1', text: "Quelle est la vitesse approximative de la lumière dans le vide ?", options: ["300 000 km/s", "150 000 km/s", "1 000 000 km/s", "30 000 km/s"], correctAnswer: 0, explanation: "La lumière se déplace à environ 299 792 km/s dans le vide." },
    { id: 'fb_2', text: "Quel est l'élément chimique représenté par le symbole 'O' ?", options: ["Or", "Oxygène", "Osmium", "Ozone"], correctAnswer: 1, explanation: "L'Oxygène est l'élément chimique de numéro atomique 8." },
    { id: 'fb_3', text: "Combien de continents compte la Terre ?", options: ["5", "6", "7", "8"], correctAnswer: 2, explanation: "On compte 7 continents sur Terre." },
    { id: 'fb_4', text: "Qui a formulé la théorie de la relativité générale ?", options: ["Isaac Newton", "Albert Einstein", "Nikola Tesla", "Galilée"], correctAnswer: 1, explanation: "Albert Einstein a publié la relativité générale en 1915." },
    { id: 'fb_5', text: "Quel est le plus grand océan de la Terre ?", options: ["Océan Atlantique", "Océan Pacifique", "Océan Indien", "Océan Arctique"], correctAnswer: 1, explanation: "L'océan Pacifique couvre environ 165 millions de km²." }
  ];
  const safeIndex = Math.min(battle.currentQuestionIndex || 0, activeQuestions.length - 1);
  const question = activeQuestions[safeIndex];

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-between p-3 md:p-8 overflow-y-auto">
      <div className="absolute top-3 right-3 z-20">
        <button onClick={handleQuitClick} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white"><X size={20} /></button>
      </div>

      {battle.type === 'custom_quiz' && battle.betAmount && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full">
          <Coins size={12} className="text-amber-500" />
          <span className="text-amber-400 font-black text-[9px] uppercase tracking-widest">{t('quiz.battle.betLabel', { amount: battle.betAmount * 2 })}</span>
        </div>
      )}

      {/* Battle Header */}
      <div className="w-full max-w-2xl mt-10 md:mt-12 bg-slate-900 border border-white/10 px-3 py-3 md:p-4 rounded-2xl md:rounded-3xl flex justify-between items-center relative overflow-hidden shadow-2xl flex-shrink-0">
        <div className="flex flex-col items-center flex-1 relative z-10">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500 rounded-full mb-1.5 p-0.5 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <img src={battle.host.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${battle.host.name}`} alt="Host" className="w-full h-full rounded-full bg-slate-800" />
          </div>
          <p className="font-bold text-white uppercase text-[10px] tracking-wider truncate max-w-[80px]">{battle.host.name}</p>
          <div className="font-black text-xl md:text-2xl text-blue-400">{Number(battle.host?.score) || 0}</div>
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
          <div className="font-black text-xl md:text-2xl text-red-400">{Number(battle.guest?.score) || 0}</div>
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
              style={{ originX: 0 }}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: timeLeft / 30 }}
              transition={{ duration: 1, ease: 'linear' }}
              className={`h-full w-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-emerald-500'}`}
            />
          </div>
          <p className={`mt-1.5 font-black text-xl md:text-2xl ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>{timeLeft}s</p>
        </div>

        <h3 className="text-base md:text-xl font-black text-white mb-5 md:mb-8 leading-tight px-2">{question.text}</h3>

        <div className="space-y-2.5 md:space-y-3">
          {question.options.map((option, idx) => {
            let btnStyle = "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700";
            let badgeText = "";
            
            if (showResult) {
              if (idx === question.correctAnswer) {
                btnStyle = "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]";
              } else if (idx === localSelected) {
                btnStyle = "bg-red-500 text-white border-red-400";
              } else if (idx === opponentSelected) {
                btnStyle = "bg-red-950/40 border-red-900/60 text-red-400/80";
              } else {
                btnStyle = "bg-slate-900 border-slate-800 text-slate-600 opacity-40";
              }
              
              if (idx === localSelected) {
                badgeText = "Moi";
              }
              if (idx === opponentSelected) {
                badgeText = "Adversaire";
              }
              if (idx === localSelected && idx === opponentSelected) {
                badgeText = "Moi + Adversaire";
              }
            }
            
            return (
              <button key={`option-${idx}`} disabled={showResult} onClick={() => submitAnswer(idx)}
                className={`w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border-2 font-bold text-sm text-left transition-all flex items-center justify-between active:scale-[0.98] ${btnStyle}`}>
                <div className="flex items-center gap-3">
                  <span>{option}</span>
                  {badgeText && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/20 text-white font-black uppercase tracking-wider">
                      {badgeText}
                    </span>
                  )}
                </div>
                {showResult && idx === question.correctAnswer && <CheckCircle className="text-white shrink-0" size={18} />}
                {showResult && idx === localSelected && idx !== question.correctAnswer && <XCircle className="text-white shrink-0" size={18} />}
              </button>
            );
          })}
        </div>

        {showResult && question.explanation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-blue-500/10 text-blue-400 p-3 rounded-xl text-xs font-medium border border-blue-500/20">
            <p className="font-bold mb-1">{t('quiz.battle.explanation')}</p>
            {question.explanation}
          </motion.div>
        )}
      </div>
    </div>
  );
};
