import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Shield, Landmark, Star, Sparkles, Award, Zap, PenTool, BrainCircuit, Globe, Database, Headphones, Mail, Phone, Trophy, Map, Layers } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { PaymentSimulatorModal } from '../components/PaymentSimulatorModal';
import { PaymentSessionOptions } from '../services/paymentService';
import { isNativePlatform } from '../services/nativeAdapters';

export interface PricingProps {
    onChooseFree?: () => void;
    onChoosePremium?: () => void;
    isFullScreen?: boolean;
}

export const Pricing: React.FC<PricingProps> = ({ onChooseFree, onChoosePremium, isFullScreen = false }) => {
    const { user, updateProfile, t, logout } = useStore();
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<PaymentSessionOptions | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [receiptData, setReceiptData] = useState<{
        transactionId: string;
        planName: string;
        amount: number;
        purchasedAt: string;
        startsAt: string;
        expiresAt: string;
    } | null>(null);

    // Strict active premium check: requires valid non-expired premium_until
    const isPremiumActive = !!(user && user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > Date.now());

    const activePlanId = user ? localStorage.getItem(`levelmak_demo_premium_plan_id_${user.id}`) : null;

    if (isNativePlatform()) {
        const premiumFeatures = [
            {
                title: "Laboratoire d'IA (AI Lab)",
                desc: "Ne discutez pas seulement avec un robot standard : parlez de vive voix avec les plus grands esprits de l'histoire (Socrate, Albert Einstein, Marie Curie) ou des tuteurs intelligents spécialisés par matière. Posez vos questions de vive voix sans aucune limite !",
                icon: BrainCircuit,
                color: "text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5",
                badge: "Tuteur & Savants"
            },
            {
                title: "Résumés & Quiz Automatiques",
                desc: "Transformez instantanément n'importe quel cours (photo de tableau ou fichier texte) en une fiche de révision claire et épurée. L'IA génère automatiquement des quiz interactifs associés pour cibler immédiatement vos points faibles.",
                icon: Sparkles,
                color: "text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-rose-500/5",
                badge: "Synthèse Express"
            },
            {
                title: "Flashcards Intelligentes",
                desc: "Réactivez vos connaissances sans effort grâce à la répétition espacée. Notre algorithme calcule le moment idéal où vous risquez d'oublier une notion pour vous la présenter et l'ancrer définitivement dans votre mémoire.",
                icon: Layers,
                color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/5",
                badge: "Mémoire Ancrée"
            },
            {
                title: "Atelier d'Écriture Créative",
                desc: "Votre coach littéraire personnel pour exceller dans vos rédactions, commentaires et dissertations. Il enrichit votre vocabulaire, peaufine la structure de vos paragraphes et perfectionne votre style d'écriture.",
                icon: PenTool,
                color: "text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-purple-500/5",
                badge: "Plume Littéraire"
            },
            {
                title: "Défis & Tournois en Direct",
                desc: "Rejoignez des arènes virtuelles interactives et affrontez vos camarades de classe ou d'autres élèves en direct. Gagnez des duels de culture générale, gagnez des pièces et hissez votre nom en haut du classement.",
                icon: Trophy,
                color: "text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-amber-500/5",
                badge: "Quiz de Combat"
            },
            {
                title: "Atlas & Carte Cérébrale",
                desc: "Parcourez notre carte mondiale interactive pour situer les fleuves, les montagnes et les monuments historiques clés de vos cours. Suivez notre carte cérébrale pour comprendre d'un coup d'œil comment les sciences s'associent à l'histoire.",
                icon: Map,
                color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5",
                badge: "Cartographie & Liens"
            }
        ];

        return (
            <div className="min-h-screen bg-[#060a13] text-white py-8 px-4 md:px-8 pb-32 no-scrollbar overflow-y-auto relative selection:bg-blue-500/30">
                {/* Subtle Ambient Light Effects */}
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-2xl mx-auto space-y-10 relative">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mx-auto mb-2">
                            <Sparkles className="w-3 h-3" /> Forfait Illimité
                        </div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                            Passez à <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">LEVELMAK PRO</span>
                        </h1>
                        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                            Déverrouillez l'intégralité de la plateforme d'apprentissage la plus innovante et apprenez sans limites à votre propre rythme.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Ce qui est inclus dans votre accès PRO :</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {premiumFeatures.map((f, i) => (
                                <div key={i} className="backdrop-blur-xl bg-slate-950/40 p-5 rounded-3xl border border-white/5 flex flex-col gap-3 hover:border-blue-500/20 transition-all duration-350 shadow-lg shadow-black/10 group">
                                    <div className="flex justify-between items-center">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${f.color}`}>
                                            <f.icon className="w-5 h-5" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-white/5">
                                            {f.badge}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <h4 className="font-extrabold text-white text-sm tracking-tight group-hover:text-blue-400 transition-colors">{f.title}</h4>
                                        <p className="text-[11px] text-slate-400 leading-normal font-medium">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Activation Steps */}
                    <div className="backdrop-blur-xl bg-[#0a1122]/60 p-6 rounded-[2rem] border border-blue-500/20 shadow-2xl shadow-blue-950/20 space-y-6">
                        <h3 className="text-sm font-black text-white flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            Comment activer mon compte Premium ?
                        </h3>
                        
                        <p className="text-xs text-slate-350 leading-relaxed">
                            Afin de respecter les directives de distribution des boutiques d'applications mobiles, le règlement s'effectue simplement et de manière sécurisée sur notre portail Web :
                        </p>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex gap-4 items-start bg-slate-950/30 p-4 rounded-2xl border border-slate-900/50">
                                <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                                <div className="text-xs">
                                    <p className="font-bold text-slate-200">Connectez-vous sur notre site Web</p>
                                    <p className="text-slate-400 mt-0.5">Ouvrez le navigateur de votre choix et allez à l'adresse :</p>
                                    <p className="font-mono text-blue-400 mt-1.5 select-all font-semibold bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 inline-block">levelmak.com</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start bg-slate-950/30 p-4 rounded-2xl border border-slate-900/50">
                                <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                                <div className="text-xs">
                                    <p className="font-bold text-slate-200">Utilisez vos identifiants existants</p>
                                    <p className="text-slate-400 mt-0.5">Saisissez le même numéro ou e-mail de connexion qu'ici :</p>
                                    <p className="text-white font-bold bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 inline-block mt-1.5 font-mono">{user?.phoneNumber || user?.email || 'Votre identifiant actuel'}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start bg-slate-950/30 p-4 rounded-2xl border border-slate-900/50">
                                <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                                <div className="text-xs">
                                    <p className="font-bold text-slate-200">Choisissez votre forfait et payez</p>
                                    <p className="text-slate-400 mt-0.5">Activez votre offre via Wave, Orange Money, MTN Mobile Money, Moov Money ou Carte bancaire.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs leading-normal flex gap-3 items-start">
                            <Check className="w-5 h-5 shrink-0 mt-0.5" />
                            <span>Votre compte sera instantanément activé et mis à jour sur ce téléphone dès la confirmation du paiement en ligne !</span>
                        </div>

                        <button
                            onClick={() => {
                                navigator.clipboard.writeText('https://levelmak.com');
                                alert('Lien recopié dans le presse-papier !');
                            }}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all active:scale-[0.98] shadow-lg shadow-blue-500/10"
                        >
                            Copier l'adresse de notre site
                        </button>
                    </div>

                    {/* Support Block */}
                    <div className="backdrop-blur-xl bg-slate-950/40 p-6 rounded-[2rem] border border-white/5 text-center space-y-4 shadow-lg shadow-black/10">
                        <div className="w-10 h-10 bg-slate-900/80 text-slate-350 rounded-2xl flex items-center justify-center mx-auto border border-white/5">
                            <Headphones className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-white text-sm">Besoin d'aide pour vous abonner ?</h4>
                            <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto">
                                Des difficultés à procéder au paiement ? Notre équipe d'assistance guinéenne est disponible pour vous accompagner pas à pas.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
                            <a 
                                href="tel:+224611296829" 
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded-xl text-xs font-bold border border-white/5 w-full sm:w-auto transition-colors"
                            >
                                <Phone size={14} className="text-blue-400" />
                                +224 611 29 68 29
                            </a>
                            <a 
                                href="mailto:Tmab6544@gmail.com" 
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded-xl text-xs font-bold border border-white/5 w-full sm:w-auto transition-colors"
                            >
                                <Mail size={14} className="text-blue-400" />
                                Tmab6544@gmail.com
                            </a>
                        </div>
                    </div>

                    {/* Exit Button when fullscreen */}
                    {isFullScreen && (
                        <div className="pt-2 text-center">
                            <button
                                onClick={() => {
                                    if (onChooseFree) onChooseFree();
                                }}
                                className="px-8 py-3.5 bg-slate-900/40 hover:bg-slate-900 border border-slate-900 text-slate-400 hover:text-white rounded-2xl text-xs font-bold transition-all active:scale-[0.98] shadow-md shadow-black/10"
                            >
                                Continuer avec la version gratuite →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const handleSelectPlan = (plan: 'weekly' | 'monthly' | 'annual', amount: number) => {
        if (!user) return;
        
        setSelectedOptions({
            planId: `plan_${plan}`,
            amount,
            type: 'premium',
            duration: plan
        });
        
        if (isNativePlatform()) {
            setIsMobileInfoOpen(true);
        } else {
            setIsSimulatorOpen(true);
        }
    };

    const handlePaymentSuccess = (transactionId: string) => {
        if (!user) return;

        // Calculate matching simulated expiration date locally for instant state update
        const expirationDate = new Date();
        const purchaseDate = new Date();
        if (selectedOptions?.duration === 'weekly') {
            expirationDate.setMinutes(expirationDate.getMinutes() + 30);
        } else if (selectedOptions?.duration === 'monthly') {
            expirationDate.setHours(expirationDate.getHours() + 1);
        } else if (selectedOptions?.duration === 'annual') {
            expirationDate.setMinutes(expirationDate.getMinutes() + 90);
        }

        // Save demo subscription keys locally to persist across DB background checks
        localStorage.setItem(`levelmak_demo_premium_${user.id}`, 'true');
        localStorage.setItem(`levelmak_demo_premium_until_${user.id}`, expirationDate.toISOString());
        if (selectedOptions?.planId) {
            localStorage.setItem(`levelmak_demo_premium_plan_id_${user.id}`, selectedOptions.planId);
        }

        // Apply instant local update
        if (user) {
            updateProfile(user.name, user.phoneNumber, {
                is_premium: true,
                premium_until: expirationDate.toISOString()
            });
        }

        // Trigger the custom receipt modal
        setReceiptData({
            transactionId,
            planName: selectedOptions?.duration === 'weekly' ? 'Hebdomadaire' : selectedOptions?.duration === 'monthly' ? 'Mensuel' : 'Annuel',
            amount: selectedOptions?.amount || 0,
            purchasedAt: purchaseDate.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }),
            startsAt: purchaseDate.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }),
            expiresAt: expirationDate.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
        });
    };

    const handlePaymentFailure = (errorMsg: string) => {
        alert(`Échec du paiement : ${errorMsg}`);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8 relative">
            {isFullScreen && (
                <div className="absolute top-4 right-4 z-50">
                    <button 
                        onClick={logout} 
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                    >
                        Déconnexion
                    </button>
                </div>
            )}
            <div className="max-w-7xl mx-auto">
                {/* Title & Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
                        Abonnez-vous à <span className="text-blue-500">LEVELMAK PRO</span>
                    </h1>
                    <p className="mt-4 text-xl text-slate-400 max-w-2xl mx-auto">
                        Débloquez la puissance illimitée de l'IA pédagogique, défiez vos amis et réussissez vos études à votre rythme.
                    </p>
                </div>

                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mb-8 p-4 border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 rounded-xl text-center font-bold"
                    >
                        {successMessage}
                    </motion.div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch">
                    
                    {/* 1. GRATUIT */}
                    <div className="flex flex-col border border-slate-800 bg-slate-900/40 rounded-2xl p-6 transition-all hover:border-slate-700 relative overflow-hidden">
                        <div className="flex-1">
                            <div className="w-10 h-10 rounded-lg bg-purple-900/20 flex items-center justify-center text-purple-400 mb-4 border border-purple-500/20">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Gratuit</h3>
                            <p className="mt-2 text-sm text-slate-400">Pour découvrir l'IA et commencer à apprendre</p>
                            
                            <p className="mt-6">
                                <span className="text-4xl font-extrabold text-white">0 FG</span>
                                <span className="text-sm text-slate-400 font-semibold"> / à vie</span>
                            </p>

                            <ul className="mt-8 space-y-3">
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>Créer des fiches et contenus</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>3 quiz personnalisés</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>3 paquets de flashcards</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>10 réponses à l'IA par jour</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-500 line-through">
                                    <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Quiz illimités</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-500 line-through">
                                    <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Accès complet à l'IA</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-500 line-through">
                                    <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Sauvegarde de tes quiz et contenus</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-500 line-through">
                                    <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Défier ses amis sur Levelmark</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-500 line-through">
                                    <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Accès complet à l'application</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-500 line-through">
                                    <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Fonctionnalités avancées</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-500 line-through">
                                    <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Support client réactif</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-500 line-through">
                                    <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Sauvegarde de session (discussions éphémères)</span>
                                </li>
                            </ul>
                        </div>

                        {/* Info Box */}
                        <div className="mt-6 p-3 rounded-xl bg-purple-950/20 border border-purple-500/10 text-xs text-purple-300">
                            <span className="font-bold flex items-center gap-1 mb-1">🛈 Accès limité</span>
                            <span className="opacity-80">Tu ne profites pas de toutes les fonctionnalités et avantages disponibles dans les autres plans.</span>
                        </div>

                        {isFullScreen ? (
                            <button
                                onClick={() => {
                                    if (onChooseFree) onChooseFree();
                                }}
                                className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-center text-sm shadow-lg shadow-purple-950/20 transition-all active:scale-[0.98]"
                            >
                                Continuer avec le plan gratuit
                            </button>
                        ) : (
                            <button
                                disabled
                                className={`mt-6 w-full py-3 px-4 font-bold rounded-xl text-center text-sm border ${
                                    isPremiumActive
                                        ? 'border-white/5 bg-slate-900/40 text-slate-500'
                                        : 'border-purple-500/30 text-purple-400 bg-purple-500/5'
                                }`}
                            >
                                {isPremiumActive ? 'Plan inactif' : 'Votre plan actuel'}
                            </button>
                        )}
                        <p className="text-center text-xs text-slate-500 mt-2">Parfait pour commencer !</p>
                    </div>

                    {/* 2. HEBDOMADAIRE */}
                    <div className="flex flex-col border border-slate-800 bg-slate-900/40 rounded-2xl p-6 transition-all hover:border-slate-700 relative overflow-hidden">
                        <div className="absolute top-4 right-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                ⚡ Engagement flexible
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="w-10 h-10 rounded-lg bg-rose-900/20 flex items-center justify-center text-rose-400 mb-4 border border-rose-500/20">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Hebdomadaire</h3>
                            <p className="mt-2 text-sm text-slate-400">Progresse chaque semaine avec un accès complet</p>
                            
                            <p className="mt-6">
                                <span className="text-4xl font-extrabold text-white">10 000 FG</span>
                                <span className="text-sm text-slate-400 font-semibold"> / semaine</span>
                            </p>

                            <ul className="mt-8 space-y-3">
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Accès complet à l'IA</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Accès complet à l'application</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Quiz illimités</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Flashcards illimitées</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Sauvegarde automatique des quiz</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Parle aux savants de ton choix (AudioLab)</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Support client réactif</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Idéal pour apprentissage flexible</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>🏆 Défier ses amis sur Levelmark</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>⚡ IA rapide et stable</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => handleSelectPlan('weekly', 10000)}
                            disabled={isPremiumActive}
                            className={`mt-6 w-full py-3 px-4 font-bold rounded-xl text-center text-sm transition-all active:scale-[0.98] ${
                                isPremiumActive 
                                    ? (activePlanId === 'plan_weekly' 
                                        ? 'bg-emerald-600 text-white cursor-not-allowed' 
                                        : 'bg-slate-850 text-slate-500 cursor-not-allowed border border-white/5')
                                    : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-950/20'
                            }`}
                        >
                            {isPremiumActive 
                                ? (activePlanId === 'plan_weekly' ? 'Votre plan actuel (Actif) ✓' : 'Non disponible')
                                : 'Choisir Hebdomadaire'}
                        </button>
                        <p className="text-center text-xs text-slate-500 mt-2">Engagement flexible, résultats rapides !</p>
                    </div>

                    {/* 3. MENSUEL */}
                    <div className="flex flex-col border border-blue-500/50 bg-slate-900/40 rounded-2xl p-6 transition-all hover:border-blue-400 relative overflow-hidden shadow-2xl shadow-blue-950/20 ring-1 ring-blue-500/20">
                        <div className="absolute top-4 right-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                                ★ Le plus choisi
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="w-10 h-10 rounded-lg bg-blue-900/20 flex items-center justify-center text-blue-400 mb-4 border border-blue-500/20">
                                <Award className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Mensuel</h3>
                            <p className="mt-2 text-sm text-slate-400">Le meilleur équilibre pour des résultats durables</p>
                            
                            <p className="mt-6">
                                <span className="text-4xl font-extrabold text-white">25 000 FG</span>
                                <span className="text-sm text-slate-400 font-semibold"> / mois</span>
                            </p>
                            <p className="text-xs text-blue-400 font-bold mt-1">✓ Économise 15 000 FG</p>

                            <ul className="mt-8 space-y-3">
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span className="font-semibold text-white">Tout du plan hebdomadaire</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Sauvegarde 100% sécurisée sur le Cloud</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>🤖 IA rapide et efficace</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Compte et données sécurisés à vie</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Recommandations personnalisées</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Statistiques de progression</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Accès prioritaire aux nouveautés</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Support prioritaire</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>🏆 Défier ses amis sur Levelmark</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => handleSelectPlan('monthly', 25000)}
                            disabled={isPremiumActive}
                            className={`mt-6 w-full py-3 px-4 font-bold rounded-xl text-center text-sm transition-all active:scale-[0.98] ${
                                isPremiumActive 
                                    ? (activePlanId === 'plan_monthly' 
                                        ? 'bg-emerald-600 text-white cursor-not-allowed' 
                                        : 'bg-slate-850 text-slate-500 cursor-not-allowed border border-white/5')
                                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-950/20'
                            }`}
                        >
                            {isPremiumActive 
                                ? (activePlanId === 'plan_monthly' ? 'Votre plan actuel (Actif) ✓' : 'Non disponible')
                                : 'Choisir Mensuel'}
                        </button>
                        <p className="text-center text-xs text-slate-500 mt-2">Plus d'avantages, plus de sérénité !</p>
                    </div>

                    {/* 4. ANNUEL */}
                    <div className="flex flex-col border border-slate-800 bg-slate-900/40 rounded-2xl p-6 transition-all hover:border-slate-700 relative overflow-hidden">
                        <div className="absolute top-4 right-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                Le meilleur investissement
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="w-10 h-10 rounded-lg bg-yellow-900/20 flex items-center justify-center text-yellow-400 mb-4 border border-yellow-500/20">
                                <Star className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Annuel</h3>
                            <p className="mt-2 text-sm text-slate-400">Le choix ultime pour une réussite assurée</p>
                            
                            <p className="mt-6">
                                <span className="text-4xl font-extrabold text-white">250 000 FG</span>
                                <span className="text-sm text-slate-400 font-semibold"> / an</span>
                            </p>
                            <p className="text-xs text-yellow-400 font-bold mt-1">✓ Économise 50 000 FG</p>

                            <ul className="mt-8 space-y-3">
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span className="font-semibold text-white">Tout du plan mensuel</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Sauvegarde illimitée et sécurisée</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>🤖 IA plus rapide et structurée</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Accès complet toute l'année</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Conserve tes données l'année prochaine</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Modification des contenus à tout moment</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Aucun devoir imposé, rythme libre</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Accompagnement premium toute l'année</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>🏆 Défier ses amis sur Levelmark</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => handleSelectPlan('annual', 250000)}
                            disabled={isPremiumActive}
                            className={`mt-6 w-full py-3 px-4 font-bold rounded-xl text-center text-sm transition-all active:scale-[0.98] ${
                                isPremiumActive 
                                    ? (activePlanId === 'plan_annual' 
                                        ? 'bg-emerald-600 text-white cursor-not-allowed' 
                                        : 'bg-slate-850 text-slate-500 cursor-not-allowed border border-white/5')
                                    : 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white shadow-lg shadow-yellow-950/20'
                            }`}
                        >
                            {isPremiumActive 
                                ? (activePlanId === 'plan_annual' ? 'Votre plan actuel (Actif) ✓' : 'Non disponible')
                                : 'Choisir Annuel'}
                        </button>
                        <p className="text-center text-xs text-slate-500 mt-2">Investis une fois, profite toute l'année !</p>
                    </div>

                </div>
            </div>

            {/* Payment Simulator Modal */}
            <PaymentSimulatorModal
                isOpen={isSimulatorOpen}
                onClose={() => setIsSimulatorOpen(false)}
                userId={user?.id || 'guest'}
                options={selectedOptions}
                onSuccess={handlePaymentSuccess}
                onFailure={handlePaymentFailure}
            />

            {/* Mobile Payment Instructions Modal */}
            <AnimatePresence>
                {isMobileInfoOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md bg-slate-900 border border-slate-800 text-white rounded-[2rem] p-6 shadow-2xl overflow-hidden font-sans text-left"
                        >
                            {/* Decorative Top Glow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full blur-[2px]" />

                            <div className="text-center pb-4 border-b border-slate-800">
                                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-500/20">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <h3 className="font-extrabold text-xl tracking-tight text-white">Activation Premium</h3>
                                <p className="text-xs text-slate-400 mt-1">Comment débloquer Levelmak Pro sur mobile</p>
                            </div>

                            <div className="py-5 space-y-4">
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Conformément aux directives de distribution mobile, les paiements ne peuvent pas être traités directement depuis cette application. 
                                    Veuillez suivre ces étapes simples pour activer votre forfait :
                                </p>

                                <div className="space-y-3">
                                    <div className="flex gap-3 items-start bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                                        <div className="text-xs">
                                            <p className="font-bold text-slate-200">Allez sur notre site Web</p>
                                            <p className="text-slate-400 mt-0.5">Ouvrez votre navigateur et allez sur :</p>
                                            <p className="font-mono text-blue-400 mt-1 select-all font-semibold bg-slate-950/80 px-2 py-1 rounded border border-slate-800 inline-block">levelmak.com</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 items-start bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                                        <div className="text-xs">
                                            <p className="font-bold text-slate-200">Connectez-vous</p>
                                            <p className="text-slate-400 mt-0.5">Utilisez le même numéro de téléphone ou e-mail qu'ici : <span className="text-white font-semibold">{user?.phoneNumber || user?.email || ''}</span></p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 items-start bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                                        <div className="text-xs">
                                            <p className="font-bold text-slate-200">Payez par Mobile Money</p>
                                            <p className="text-slate-400 mt-0.5">Payez en toute sécurité via Wave, Orange Money, MTN ou Moov.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-emerald-950/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[11px] leading-normal flex gap-2 items-start">
                                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>Une fois payé, vos accès premium s'activeront automatiquement et instantanément sur ce téléphone !</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText('https://levelmak.com');
                                        alert('Lien copié dans le presse-papier !');
                                    }}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-white rounded-xl font-bold text-xs transition-transform active:scale-95 border border-slate-700"
                                >
                                    Copier le lien
                                </button>
                                <button
                                    onClick={() => setIsMobileInfoOpen(false)}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-transform active:scale-95"
                                >
                                    Compris
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Receipt Modal */}
            <AnimatePresence>
                {receiptData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md bg-white text-slate-900 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden font-sans border-4 border-blue-500 text-left"
                        >
                            {/* Receipt Header styling */}
                            <div className="text-center pb-6 border-b-2 border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                                    <Check className="w-8 h-8" strokeWidth={3} />
                                </div>
                                <h3 className="font-display font-black text-2xl tracking-tight uppercase text-blue-600">Reçu d'Abonnement</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-450 mt-1">LEVELMAK PRO • ORDONNANCE ÉLITE</p>
                            </div>

                            {/* Receipt Body */}
                            <div className="py-6 space-y-4 text-xs font-bold font-sans">
                                <div className="text-center p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 text-xs font-bold leading-normal">
                                    🎉 Félicitations ! Votre abonnement **LEVELMAK PRO** est maintenant actif et prêt à l'emploi.
                                </div>

                                <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest text-center">Informations de Facturation</p>
                                <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Étudiant :</span>
                                        <span className="text-slate-950">{user?.name || 'Étudiant Elite'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Téléphone :</span>
                                        <span className="text-slate-950">{user?.phoneNumber || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Forfait :</span>
                                        <span className="text-blue-600">PRO {receiptData.planName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Montant payé :</span>
                                        <span className="text-slate-950">{receiptData.amount.toLocaleString()} FG</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Date d'achat :</span>
                                        <span className="text-slate-950">{receiptData.purchasedAt}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 pt-2.5 mt-1">
                                        <span className="text-slate-500">Référence :</span>
                                        <span className="text-slate-950 font-mono text-[10px]">{receiptData.transactionId}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-blue-900 leading-relaxed">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-700">Période de Validité</p>
                                    <p className="text-[11px] font-black leading-snug">
                                        Du : <span className="underline">{receiptData.startsAt}</span> <br />
                                        Au : <span className="underline">{receiptData.expiresAt}</span>
                                    </p>
                                    <p className="text-[9px] font-medium opacity-85 mt-1">
                                        À cette échéance, votre accès repassera automatiquement au mode gratuit. Vous pourrez le renouveler à tout moment.
                                    </p>
                                </div>
                            </div>

                            {/* Print / Action Button */}
                            <button
                                onClick={() => {
                                    setReceiptData(null);
                                    if (onChoosePremium) {
                                        onChoosePremium();
                                    }
                                }}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-750 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-transform active:scale-95 shadow-lg shadow-blue-500/20"
                            >
                                Commencer à Réviser
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
