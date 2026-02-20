import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    Clock,
    Target,
    Trophy,
    BookOpen,
    TrendingUp,
    Calendar,
    ChevronRight,
    Brain
} from 'lucide-react';
import { useStore } from '../hooks/useStore';

const Analytics: React.FC = () => {
    const { user, settings } = useStore();
    const isFrench = settings.language === 'fr';

    const t = {
        title: isFrench ? 'Mes Analyses' : 'My Analytics',
        subtitle: isFrench ? 'Suis tes progrès et dépasse tes limites.' : 'Track your progress and push your limits.',
        studyTime: isFrench ? "Temps d'étude" : 'Study Time',
        weeklyProgress: isFrench ? 'Progression Hebdomadaire' : 'Weekly Progress',
        subjectBreakdown: isFrench ? 'Répartition par Matière' : 'Subject Breakdown',
        quizPerformance: isFrench ? 'Performance Quiz' : 'Quiz Performance',
        goals: isFrench ? 'Objectifs' : 'Goals',
        predictions: isFrench ? 'Prédictions Examens' : 'Exam Predictions',
        totalMinutes: isFrench ? 'min total' : 'total min',
        thisWeek: isFrench ? 'Cette semaine' : 'This week',
        avgScore: isFrench ? 'Score Moyen' : 'Average Score',
        noData: isFrench ? 'Pas encore de données. Commence à étudier !' : 'No data yet. Start studying!',
    };

    const analytics = user?.analytics || {
        studyTimeBySubject: {},
        studyTimeByDay: [],
        quizPerformance: [],
        weeklyGoals: { target: 120, achieved: 0 },
        examPredictions: []
    };

    // Calculate total study time
    const totalStudyMinutes = Object.values(analytics.studyTimeBySubject).reduce((a: number, b: number) => a + b, 0);

    // Prepare weekly data (last 7 days)
    const weeklyData = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const entry = analytics.studyTimeByDay.find(d => d.date === dateStr);
            days.push({
                label: date.toLocaleDateString(isFrench ? 'fr-FR' : 'en-US', { weekday: 'short' }),
                minutes: entry ? entry.minutes : 0
            });
        }
        return days;
    }, [analytics.studyTimeByDay, isFrench]);

    const maxMinutes = Math.max(...weeklyData.map(d => d.minutes), 60);

    return (
        <div className="min-h-screen bg-transparent pt-20 pb-24 md:pt-24 md:pb-12 px-4 md:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="mb-8 relative">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-4"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-glow">
                                <TrendingUp size={24} />
                            </div>
                            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">{t.title}</h1>
                        </div>
                        <p className="text-slate-500 font-bold text-xs md:text-sm uppercase tracking-widest">{t.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-xl">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{t.totalMinutes}</span>
                            <span className="text-xl md:text-2xl font-black text-primary">{totalStudyMinutes}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{t.thisWeek}</span>
                            <span className="text-xl md:text-2xl font-black text-secondary">{analytics.weeklyGoals.achieved}</span>
                        </div>
                    </div>
                </motion.div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Weekly Chart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-2 glass p-6 md:p-8 rounded-[2rem] border border-white/5 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Calendar size={120} />
                    </div>

                    <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3 relative z-10">
                        <BarChart3 className="text-primary" /> {t.weeklyProgress}
                    </h3>

                    <div className="flex items-end justify-between h-48 md:h-64 gap-2 md:gap-4 relative z-10">
                        {weeklyData.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                <div className="w-full relative flex flex-col justify-end h-full">
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0}%` }}
                                        transition={{ delay: i * 0.1, duration: 1, ease: "easeOut" }}
                                        className="w-full rounded-full bg-gradient-to-t from-primary/40 to-primary shadow-glow group-hover:from-primary group-hover:to-primary-glow transition-all relative"
                                    >
                                        {day.minutes > 0 && (
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded-lg text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                {day.minutes}m
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                                <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-tighter">{day.label}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Goals Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass p-6 md:p-8 rounded-[2rem] border border-white/5 flex flex-col justify-between"
                >
                    <div>
                        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                            <Target className="text-secondary" /> {t.goals}
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.thisWeek}</span>
                                    <span className="text-sm font-black text-white">{analytics.weeklyGoals.achieved} / {analytics.weeklyGoals.target}m</span>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${analytics.weeklyGoals.target > 0 ? Math.min((analytics.weeklyGoals.achieved / analytics.weeklyGoals.target) * 100, 100) : 0}%` }}
                                        className="h-full rounded-full bg-secondary shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                    />
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-loose">
                                    {isFrench
                                        ? "Tu es à " + (analytics.weeklyGoals.target > 0 ? Math.round((analytics.weeklyGoals.achieved / analytics.weeklyGoals.target) * 100) : 0) + "% de ton objectif. Garde le rythme !"
                                        : "You're at " + (analytics.weeklyGoals.target > 0 ? Math.round((analytics.weeklyGoals.achieved / analytics.weeklyGoals.target) * 100) : 0) + "% of your goal. Keep it up!"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button className="w-full mt-6 py-4 rounded-2xl bg-black/20 hover:bg-black/40 text-[10px] font-black uppercase tracking-widest text-white border border-white/5 flex items-center justify-center gap-2 group transition-all">
                        {isFrench ? 'Ajuster mes objectifs' : 'Adjust my goals'}
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </motion.div>

                {/* Subject Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass p-6 md:p-8 rounded-[2rem] border border-white/5"
                >
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                        <BookOpen className="text-accent" /> {t.subjectBreakdown}
                    </h3>

                    <div className="space-y-4">
                        {Object.entries(analytics.studyTimeBySubject).length > 0 ? (
                            Object.entries(analytics.studyTimeBySubject)
                                .sort((a, b) => (b[1] as any) - (a[1] as any))
                                .map(([subject, time], i) => (
                                    <div key={subject} className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black text-white">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[11px] font-black text-white uppercase tracking-tighter">{subject}</span>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{(time as number)} min</span>
                                            </div>
                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(totalStudyMinutes as any) > 0 ? ((time as any) / (totalStudyMinutes as any)) * 100 : 0}%` }}
                                                    transition={{ delay: 0.5 + i * 0.1 }}
                                                    className={`h-full rounded-full ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-secondary' : 'bg-accent'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                        ) : (
                            <p className="text-center py-12 text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.noData}</p>
                        )}
                    </div>
                </motion.div>

                {/* Quiz Performance */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass p-6 md:p-8 rounded-[2rem] border border-white/5"
                >
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                        <Trophy className="text-success" /> {t.quizPerformance}
                    </h3>

                    <div className="space-y-4">
                        {analytics.quizPerformance.length > 0 ? (
                            analytics.quizPerformance.map((perf, i) => (
                                <div key={perf.subject} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-tight">{perf.subject}</h4>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{perf.totalAttempts} Examens</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-success tracking-tighter">
                                            {Math.round(perf.correctRate * 100)}%
                                        </div>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{t.avgScore}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-12 text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.noData}</p>
                        )}
                    </div>
                </motion.div>

                {/* Exam Predictions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass p-6 md:p-8 rounded-[2rem] border border-white/5 overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Brain size={120} />
                    </div>

                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3 relative z-10">
                        <Brain className="text-primary" /> {t.predictions}
                    </h3>

                    <div className="space-y-4 relative z-10">
                        <div className="bg-primary/20 p-4 rounded-2xl border border-primary/20 backdrop-blur-md">
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-2">IA Insights</p>
                            <p className="text-[11px] text-slate-200 font-bold leading-relaxed italic">
                                {isFrench
                                    ? "L'IA analyse tes performances... Plus tu feras de quiz, plus mes prédictions seront précises !"
                                    : "AI is analyzing your performance... The more quizzes you take, the more accurate my predictions will be!"}
                            </p>
                        </div>

                        {analytics.examPredictions.length > 0 ? (
                            analytics.examPredictions.map((pred, i) => (
                                <div key={pred.subject} className="flex items-center justify-between p-2">
                                    <span className="text-[10px] font-black text-white uppercase">{pred.subject}</span>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-xs font-black text-white">{pred.predictedScore}/20</div>
                                            <div className="text-[8px] text-slate-500 font-bold italic">{pred.confidence}% confidence</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="pt-4 space-y-2 opacity-50">
                                <div className="h-10 bg-white/5 rounded-xl border border-white/5 animate-pulse" />
                                <div className="h-10 bg-white/5 rounded-xl border border-white/5 animate-pulse" />
                            </div>
                        )}
                    </div>
                </motion.div>

            </div>
        </div>
    );
};

export default Analytics;
