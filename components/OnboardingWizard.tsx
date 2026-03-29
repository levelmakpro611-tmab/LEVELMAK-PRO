import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    ArrowRight,
    Rocket,
    BookOpen,
    Brain,
    Trophy,
    CheckCircle2,
    X,
    Target
} from 'lucide-react';
import { useStore } from '../hooks/useStore';

const OnboardingWizard: React.FC = () => {
    const { user, completeOnboarding, settings } = useStore();
    const [step, setStep] = useState(1);
    const isFrench = settings.language === 'fr';

    // Conditional rendering is now handled by the parent (App.tsx) for AnimatePresence
    if (!user) return null;

    const t = {
        welcome: isFrench ? 'Bienvenue sur LEVELMAK !' : 'Welcome to LEVELMAK!',
        welcomeDesc: isFrench ? 'Ton compagnon IA pour une réussite scolaire sans limites.' : 'Your AI companion for limitless academic success.',
        step1Title: isFrench ? 'Prêt pour le décollage ?' : 'Ready for takeoff?',
        step1Desc: isFrench ? "On va configurer ton espace de travail en quelques secondes." : "We'll set up your workspace in just a few seconds.",
        step2Title: isFrench ? 'Quels sont tes objectifs ?' : 'What are your goals?',
        step2Desc: isFrench ? 'Sélectionne les matières sur lesquelles tu veux te concentrer.' : 'Select the subjects you want to focus on.',
        step3Title: isFrench ? 'Ton coach personnel' : 'Your personal coach',
        step3Desc: isFrench ? 'Génère des quiz, des plans d\'étude et analyse tes progrès grâce à l\'IA.' : 'Generate quizzes, study plans, and analyze your progress with AI.',
        step4Title: isFrench ? 'C\'est parti !' : 'Let\'s go!',
        step4Desc: isFrench ? 'Tu as tout ce qu\'il faut pour réussir. Ta série commence maintenant.' : 'You have everything you need to succeed. Your streak starts now.',
        next: isFrench ? 'Suivant' : 'Next',
        start: isFrench ? 'Commencer l\'aventure' : 'Start the adventure',
        skip: isFrench ? 'Passer' : 'Skip',
    };

    const handleComplete = () => {
        completeOnboarding();
    };

    const steps = [
        {
            icon: <Rocket className="text-blue-400" size={48} />,
            title: t.step1Title,
            description: t.step1Desc,
            color: 'from-blue-600/20 to-blue-600/5',
            glow: 'shadow-blue-500/20'
        },
        {
            icon: <Target className="text-purple-400" size={48} />,
            title: t.step2Title,
            description: t.step2Desc,
            color: 'from-purple-600/20 to-purple-600/5',
            glow: 'shadow-purple-500/20'
        },
        {
            icon: <Brain className="text-pink-400" size={48} />,
            title: t.step3Title,
            description: t.step3Desc,
            color: 'from-pink-600/20 to-pink-600/5',
            glow: 'shadow-pink-500/20'
        },
        {
            icon: <Trophy className="text-orange-400" size={48} />,
            title: t.step4Title,
            description: t.step4Desc,
            color: 'from-orange-600/20 to-orange-600/5',
            glow: 'shadow-orange-500/20'
        }
    ];

    const currentStepData = steps[step - 1];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-xl"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-xl glass rounded-[3rem] md:rounded-[4rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden relative"
            >
                {/* Close Button */}
                <button
                    onClick={handleComplete}
                    className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500"
                >
                    <X size={24} />
                </button>

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 flex gap-1 p-3">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${i + 1 <= step ? 'bg-blue-500 shadow-glow' : 'bg-white/5'}`}
                        />
                    ))}
                </div>

                <div className="p-8 md:p-12 pt-16 md:pt-20">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col items-center text-center space-y-8"
                        >
                            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] md:rounded-[3.5rem] bg-gradient-to-br ${currentStepData.color} flex items-center justify-center animate-float relative`}>
                                <div className={`absolute inset-0 bg-white/5 blur-2xl rounded-full`} />
                                {currentStepData.icon}
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">{currentStepData.title}</h2>
                                <p className="text-sm md:text-lg text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                                    {currentStepData.description}
                                </p>
                            </div>

                            <div className="w-full space-y-4 pt-4">
                                <button
                                    onClick={() => {
                                        if (step < steps.length) setStep(step + 1);
                                        else handleComplete();
                                    }}
                                    className="w-full py-5 md:py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-[0.2em] text-xs md:text-sm shadow-glow flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 group"
                                >
                                    {step === steps.length ? t.start : t.next}
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>

                                {step < steps.length && (
                                    <button
                                        onClick={handleComplete}
                                        className="text-[10px] md:text-xs font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors py-2"
                                    >
                                        {t.skip}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-secondary/10 rounded-full blur-[100px]" />
            </motion.div>
        </motion.div>
    );
};

export default OnboardingWizard;
