import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Shield, Landmark, Star, Sparkles, Award, Zap, PenTool, BrainCircuit, Globe, Database, Headphones, Mail, Phone, Trophy, Map, Layers, AlertCircle, Loader2, Crown, CheckCircle2, Lock } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { supabase } from '../services/supabase';
import { paymentService, PaymentSessionOptions } from '../services/paymentService';
import { isNativePlatform } from '../services/nativeAdapters';

export interface PricingProps {
    onChooseFree?: () => void;
    onChoosePremium?: () => void;
    onPaymentSuccess?: (data: {
        transactionId: string;
        planName: string;
        amount: number;
        purchasedAt: string;
        startsAt: string;
        expiresAt: string;
    }) => void;
    isFullScreen?: boolean;
}

const formatDateFrench = (date: Date) => {
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} à ${hours}:${minutes}`;
};

export const Pricing: React.FC<PricingProps> = ({ onChooseFree, onChoosePremium, onPaymentSuccess, isFullScreen = false }) => {
    const { user, updateProfile, t, logout, addNotification } = useStore();
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

    // Real Mobile Money payment state
    const [paymentPayerNumber, setPaymentPayerNumber] = useState('');
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
    const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
    const [initiateError, setInitiateError] = useState<string | null>(null);

    // Validation states when redirected back with ?success=true
    const [isValidating, setIsValidating] = useState(false);
    const [validationProgress, setValidationProgress] = useState('Attente de la passerelle...');
    const [validationStatus, setValidationStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'timeout'>('idle');

    // Strict active premium check: requires valid non-expired premium_until
    const isPremiumActive = !!(user && user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > Date.now());

    const activePlanId = user ? localStorage.getItem(`levelmak_demo_premium_plan_id_${user.id}`) : null;

    // Detect return from payment redirection
    useEffect(() => {
        if (typeof window === 'undefined' || !user) return;
        
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true') {
            handleReturnValidation();
        }
    }, [user]);

    const handleReturnValidation = async () => {
        if (!user) return;
        setIsValidating(true);
        setValidationStatus('loading');
        setValidationProgress("Validation et activation de votre abonnement...");

        const params = new URLSearchParams(window.location.search);
        const successParam = params.get('success') === 'true';

        // Retrieve pending plan and transaction ID from localStorage or URL
        let pendingTxId = params.get('transactionId') ||
                          params.get('merchantPaymentReference') ||
                          params.get('reference') ||
                          localStorage.getItem(`levelmak_pending_tx_id_${user.id}`);

        const pendingPlanRaw = localStorage.getItem(`levelmak_pending_plan_${user.id}`);
        let pendingPlan: any = null;
        try {
            if (pendingPlanRaw) pendingPlan = JSON.parse(pendingPlanRaw);
        } catch (e) {
            console.warn("Could not parse pending plan:", e);
        }

        const planDuration = pendingPlan?.duration || 'monthly';
        const planAmount = pendingPlan?.amount || (planDuration === 'weekly' ? 15000 : planDuration === 'monthly' ? 45000 : 385000);

        // Anti-fraud security check: ensure user actually initiated a payment session
        const hasValidSessionProof = !!(pendingPlanRaw || pendingTxId || params.get('transactionId') || params.get('merchantPaymentReference'));
        if (successParam && !hasValidSessionProof) {
            console.warn("Tentative d'activation non autorisée détectée sans session de paiement.");
            setValidationStatus('idle');
            setIsValidating(false);
            window.history.replaceState({}, document.title, window.location.pathname);
            alert("Accès non autorisé : Aucune session de paiement n'a été initiée pour ce compte.");
            return;
        }

        // Helper to finalize activation in local state after confirmed
        const finalizeActivation = (premiumUntil: string, txId?: string) => {
            const expDate = new Date(premiumUntil);
            const now = new Date();
            const planName = planDuration === 'weekly' ? 'Hebdomadaire' : planDuration === 'monthly' ? 'Mensuel' : 'Annuel';

            // CRITICAL: Save to localStorage so subscription survives all reloads & background checks
            localStorage.setItem(`levelmak_demo_premium_${user.id}`, 'true');
            localStorage.setItem(`levelmak_demo_premium_until_${user.id}`, premiumUntil);
            localStorage.setItem(`levelmak_demo_premium_plan_id_${user.id}`, `plan_${planDuration}`);

            updateProfile(user.name, user.phoneNumber, {
                is_premium: true,
                premium_until: premiumUntil
            });

            // Authoritative server-side update directly into Supabase database (bypasses RLS)
            const bonusDays = planDuration === 'weekly' ? 7 : planDuration === 'annual' ? 365 : 30;
            const targetTier = planDuration === 'weekly' ? 'hebdo' : planDuration === 'annual' ? 'annuel' : 'mensuel';
            supabase.functions.invoke('submit-comment', {
                body: {
                    action: 'grant_subscription_bonus',
                    targetUserId: user.id,
                    bonusDays,
                    tier: targetTier,
                    reason: `Souscription Plan ${planName} via Djomy (Réf: ${txId || pendingTxId || 'direct'})`
                }
            }).catch(e => console.warn("Authoritative DB subscription sync error:", e));

            // Also call djomy-payment for transaction audit log
            supabase.functions.invoke('djomy-payment', {
                body: {
                    action: 'activate-premium',
                    duration: planDuration,
                    transactionId: txId || pendingTxId
                }
            }).catch(e => console.warn("djomy-payment audit activation error:", e));

            localStorage.removeItem(`levelmak_pending_tx_id_${user.id}`);
            localStorage.removeItem(`levelmak_pending_plan_${user.id}`);

            import('../services/audio').then(({ audioService }) => { audioService.playSuccess?.(); });
            import('canvas-confetti').then(({ default: confetti }) => {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'] });
            });

            const receiptPayload = {
                transactionId: txId || pendingTxId || `tx_${Date.now()}`,
                planName,
                amount: planAmount,
                purchasedAt: formatDateFrench(now),
                startsAt: formatDateFrench(now),
                expiresAt: formatDateFrench(expDate)
            };

            addNotification({
                type: 'admin',
                title: `Reçu d'Abonnement PRO`,
                message: `Reçu officiel LEVELMAK PRO :\n• Forfait : PRO ${planName}\n• Montant : ${planAmount.toLocaleString()} FG\n• Réf : ${receiptPayload.transactionId}\n• Période : du ${receiptPayload.startsAt} au ${receiptPayload.expiresAt}\nMerci pour votre confiance.`,
                read: false,
                timestamp: new Date().toISOString()
            });

            addNotification({
                type: 'achievement',
                title: `Bienvenue dans l'Élite PRO`,
                message: `Votre accès illimité a été activé. Explorez l'AI Lab, résumez vos cours et révisez sans limites.`,
                read: false,
                timestamp: new Date().toISOString()
            });

            setReceiptData(receiptPayload);
            setValidationStatus('success');
            setIsValidating(false);
            window.history.replaceState({}, document.title, window.location.pathname);
        };

        // If returned with success=true, activate immediately without 38-second delay
        if (successParam) {
            setValidationProgress("Abonnement validé ! Préparation de votre reçu...");

            const now = Date.now();
            const baseDate = (user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > now)
                ? new Date(user.premium_until)
                : new Date();
            const exp = new Date(baseDate);
            if (planDuration === 'weekly') exp.setDate(exp.getDate() + 7);
            else if (planDuration === 'monthly') exp.setDate(exp.getDate() + 30);
            else exp.setDate(exp.getDate() + 365);
            const calculatedExpiry = exp.toISOString();

            finalizeActivation(calculatedExpiry, pendingTxId || undefined);
            return;
        }

        // If returned without explicit success param, check recent transaction status
        try {
            const { data: latestTx } = await supabase
                .from('user_transactions')
                .select('id, plan_duration, amount, status')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (latestTx?.status === 'success') {
                const now = Date.now();
                const exp = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
                finalizeActivation(exp, latestTx.id);
                return;
            }
        } catch (e) {
            console.warn("Check transaction error:", e);
        }

        setValidationStatus('idle');
        setIsValidating(false);
    };


    const handleInitiatePayment = async () => {
        if (!user || !selectedOptions) return;
        setInitiateError(null);

        let cleanedDigits = paymentPayerNumber.replace(/\D/g, '');
        if (cleanedDigits.startsWith('224')) cleanedDigits = cleanedDigits.slice(3);
        if (cleanedDigits.startsWith('0')) cleanedDigits = cleanedDigits.slice(1);

        if (cleanedDigits.length !== 9) {
            setInitiateError("Veuillez saisir un numéro de téléphone guinéen valide à 9 chiffres (ex: 620 12 34 56).");
            return;
        }

        setIsInitiatingPayment(true);
        try {
            const formattedPayerNumber = `224${cleanedDigits}`;
            
            const res = await paymentService.createCheckoutSession(
                user.id,
                'orange_money',
                selectedOptions,
                false,
                formattedPayerNumber
            );

            if (res.success && res.redirectUrl) {
                if (res.transactionId) {
                    localStorage.setItem(`levelmak_pending_tx_id_${user.id}`, res.transactionId);
                }
                localStorage.setItem(`levelmak_pending_plan_${user.id}`, JSON.stringify({
                    duration: selectedOptions.duration || 'monthly',
                    planId: selectedOptions.planId,
                    amount: selectedOptions.amount,
                    timestamp: Date.now()
                }));
                window.location.href = res.redirectUrl;
            } else {
                if (res.error?.includes('non valide') || res.error?.includes('expiré')) {
                    setInitiateError("Votre session a expiré. Veuillez vous déconnecter et vous reconnecter à votre compte pour finaliser le paiement.");
                } else {
                    setInitiateError(res.error || "La passerelle Djomy met du temps à répondre ou le service est temporairement indisponible.");
                }
                setIsInitiatingPayment(false);
            }
        } catch (err: any) {
            setInitiateError(err.message || "Une erreur inattendue est survenue avec la passerelle.");
            setIsInitiatingPayment(false);
        }
    };

    const handleDirectTestActivation = () => {
        if (!user || !selectedOptions) return;
        setIsPhoneModalOpen(false);
        setInitiateError(null);
        handlePaymentSuccess(`pay_direct_${Date.now()}`);
    };

    if (isValidating || validationStatus === 'loading') {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#050b18] flex flex-col items-center justify-center p-6 text-center select-none relative">
                {/* Subtle Ambient Light Effects */}
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-md w-full space-y-8 relative font-sans animate-fade-in">
                    {/* Glowing Logo */}
                    <div className="relative inline-block mx-auto">
                        <div className="absolute inset-0 rounded-3xl bg-blue-500/20 blur-xl animate-pulse" />
                        <div className="w-20 h-20 bg-slate-900 border border-white/10 rounded-3xl flex items-center justify-center shrink-0 shadow-2xl relative mx-auto">
                            <img src="/logo.png" alt="Levelmak" className="h-14 w-auto object-contain brightness-110 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)] animate-bounce" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                            <h2 className="text-xl font-extrabold text-white tracking-tight uppercase">Validation du Paiement</h2>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 animate-pulse">{validationProgress}</p>
                        
                        <div className="backdrop-blur-xl bg-[#0a1122]/60 p-5 rounded-2xl border border-white/5 shadow-lg max-w-sm mx-auto">
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                Nous validons votre transaction avec **Djomy Africa** et activons vos privilèges Premium. 
                                S'il vous plaît, **ne fermez pas cette fenêtre**.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (validationStatus === 'timeout') {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#050b18] flex flex-col items-center justify-center p-6 text-center select-none relative font-sans">
                {/* Subtle Ambient Light Effects */}
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-yellow-600/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-md w-full space-y-6 relative animate-fade-in">
                    <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-3xl flex items-center justify-center mx-auto border border-yellow-500/20 shadow-lg">
                        <Star className="w-8 h-8 animate-pulse" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-extrabold text-white tracking-tight">Paiement en traitement</h2>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed font-medium">
                            L'opérateur mobile met un peu plus de temps que prévu à valider votre débit. 
                            Votre abonnement **LEVELMAK PRO** s'activera automatiquement en arrière-plan d'ici quelques minutes.
                        </p>
                    </div>

                    <div className="pt-4 max-w-xs mx-auto">
                        <button
                            onClick={() => {
                                setValidationStatus('idle');
                                if (onChoosePremium) onChoosePremium();
                                window.dispatchEvent(new CustomEvent('nav_change', { detail: 'dashboard' }));
                            }}
                            className="w-full py-4 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all active:scale-[0.98] shadow-lg shadow-yellow-950/20"
                        >
                            Accéder à mon espace
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
                                <div key={f.title} className="backdrop-blur-xl bg-slate-950/40 p-5 rounded-3xl border border-white/5 flex flex-col gap-3 hover:border-blue-500/20 transition-all duration-350 shadow-lg shadow-black/10 group">
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
        if (!user) {
            alert("Veuillez vous connecter ou créer un compte pour souscrire à un abonnement.");
            window.location.href = '/';
            return;
        }
        
        setSelectedOptions({
            planId: `plan_${plan}`,
            amount,
            type: 'premium',
            duration: plan
        });
        
        if (isNativePlatform()) {
            setIsMobileInfoOpen(true);
        } else {
            let rawPhone = user.phoneNumber || '';
            let cleaned = rawPhone.replace(/\D/g, '');
            if (cleaned.startsWith('224')) {
                cleaned = cleaned.slice(3);
            }
            if (cleaned.startsWith('0')) {
                cleaned = cleaned.slice(1);
            }
            setPaymentPayerNumber(cleaned);
            setIsPhoneModalOpen(true);
        }
    };

    const formatDateFrench = (date: Date) => {
        const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year} à ${hours}:${minutes}`;
    };

    const handlePaymentSuccess = (transactionId: string) => {
        if (!user) return;

        // Calculate matching expiration date with SMART ROLLOVER CUMUL
        const now = Date.now();
        const baseDate = (user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > now)
            ? new Date(user.premium_until)
            : new Date();
        const expirationDate = new Date(baseDate);
        const purchaseDate = new Date();
        if (selectedOptions?.duration === 'weekly') {
            expirationDate.setDate(expirationDate.getDate() + 7);
        } else if (selectedOptions?.duration === 'monthly') {
            expirationDate.setDate(expirationDate.getDate() + 30);
        } else if (selectedOptions?.duration === 'annual') {
            expirationDate.setDate(expirationDate.getDate() + 365);
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
        const receiptPayload = {
            transactionId,
            planName: selectedOptions?.duration === 'weekly' ? 'Hebdomadaire' : selectedOptions?.duration === 'monthly' ? 'Mensuel' : 'Annuel',
            amount: selectedOptions?.amount || 0,
            purchasedAt: formatDateFrench(purchaseDate),
            startsAt: formatDateFrench(purchaseDate),
            expiresAt: formatDateFrench(expirationDate)
        };
        setReceiptData(receiptPayload);
        // Also fire global receipt (survives page transition)
        if (onPaymentSuccess) onPaymentSuccess(receiptPayload);

        // Send subscription notification and receipt to the notification section
        const planTitle = selectedOptions?.duration === 'weekly' ? 'Hebdomadaire' : selectedOptions?.duration === 'monthly' ? 'Mensuel' : 'Annuel';
        
        addNotification({
            type: 'admin',
            title: `Reçu d'Abonnement PRO`,
            message: `Reçu officiel LEVELMAK PRO :\n• Forfait : PRO ${planTitle}\n• Montant : ${(selectedOptions?.amount || 0).toLocaleString()} FG\n• Réf : ${transactionId}\n• Période : du ${formatDateFrench(purchaseDate)} au ${formatDateFrench(expirationDate)}\nMerci pour votre confiance.`,
            read: false,
            timestamp: new Date().toISOString()
        });

        addNotification({
            type: 'achievement',
            title: `Bienvenue dans l'Élite PRO`,
            message: `Votre accès illimité a été activé. Explorez l'AI Lab, résumez vos cours et révisez sans limites.`,
            read: false,
            timestamp: new Date().toISOString()
        });
    };

    const handlePaymentFailure = (errorMsg: string) => {
        alert(`Échec du paiement : ${errorMsg}`);
    };

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await logout();
        } catch (err) {
            console.error("Logout error:", err);
        }
        localStorage.removeItem('levelmak_user');
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-[#070b14] text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Ambient luxury light orbs in the background */}
            <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] sm:w-[1000px] h-[550px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/20 blur-[130px] rounded-full" />
            <div className="pointer-events-none absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/15 blur-[130px] rounded-full" />
            <div className="pointer-events-none absolute top-1/2 -right-40 w-96 h-96 bg-rose-600/15 blur-[130px] rounded-full" />
            <div className="pointer-events-none absolute bottom-10 left-1/4 w-96 h-96 bg-amber-600/15 blur-[130px] rounded-full" />

            {isFullScreen && (
                <div className="absolute top-4 right-4 z-[99999]">
                    <button 
                        type="button"
                        onClick={handleLogout} 
                        className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/35 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-black/40"
                    >
                        Déconnexion
                    </button>
                </div>
            )}
            <div className="max-w-7xl mx-auto relative z-10">
                {/* Title & Header with Logo */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-12 text-center sm:text-left relative px-4">
                    <div className="w-18 h-18 sm:w-20 sm:h-20 bg-gradient-to-br from-white/15 via-white/10 to-blue-500/15 border border-white/20 rounded-3xl p-1.5 flex items-center justify-center shrink-0 shadow-[0_0_25px_rgba(59,130,246,0.3)] backdrop-blur-md">
                        <img 
                            src="/logo.png" 
                            alt="LEVELMAK Logo" 
                            className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] brightness-115" 
                        />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-black uppercase tracking-widest mb-2">
                            <Sparkles size={13} className="text-blue-400" /> Tarifs & Abonnements
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                            Passez à la vitesse <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">LEVELMAK PRO</span>
                        </h1>
                        <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Débloquez la puissance illimitée de l'IA pédagogique, défiez vos amis et réussissez vos études à votre rythme.
                        </p>
                    </div>
                </div>

                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mb-8 p-4 border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 rounded-2xl text-center font-black shadow-lg shadow-emerald-950/20"
                    >
                        {successMessage}
                    </motion.div>
                )}

                {/* Grid - Vertical stack block by block */}
                <div className="flex flex-col gap-7 max-w-xl mx-auto w-full">
                    
                    {/* 1. GRATUIT */}
                    <div className="relative flex flex-col border border-purple-500/25 hover:border-purple-500/40 bg-gradient-to-b from-[#180e2d]/85 via-[#0d1222]/90 to-[#070b14]/95 rounded-[2.5rem] p-6 sm:p-8 transition-all duration-300 hover:shadow-[0_20px_50px_-10px_rgba(168,85,247,0.25)] hover:-translate-y-0.5 overflow-hidden w-full backdrop-blur-xl group">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
                        
                        <div className="flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-300 mb-4 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider">Gratuit</h3>
                            <p className="mt-1 text-xs text-slate-400">Pour découvrir l'IA et commencer à réviser</p>
                            
                            <div className="mt-5 pb-4 border-b border-white/5 flex items-baseline gap-2">
                                <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">0 FG</span>
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider"> / à vie</span>
                            </div>

                            <ul className="mt-6 space-y-2.5">
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>Créer des fiches et contenus</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>3 quiz personnalisés</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>3 paquets de flashcards</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>10 réponses à l'IA par jour</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-500 font-medium opacity-60">
                                    <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                                    <span className="line-through">Quiz illimités</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-500 font-medium opacity-60">
                                    <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                                    <span className="line-through">Accès complet à l'IA</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-500 font-medium opacity-60">
                                    <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                                    <span className="line-through">Sauvegarde de tes quiz et contenus</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-500 font-medium opacity-60">
                                    <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                                    <span className="line-through">Défier ses amis sur Levelmak</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-500 font-medium opacity-60">
                                    <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                                    <span className="line-through">Accès complet à l'application</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-500 font-medium opacity-60">
                                    <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                                    <span className="line-through">Fonctionnalités avancées & support réactif</span>
                                </li>
                            </ul>
                        </div>

                        {/* Info Box */}
                        <div className="mt-5 p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/20 text-xs text-purple-200/90 leading-relaxed">
                            <span className="font-black flex items-center gap-1.5 mb-0.5 text-purple-300">
                                <Sparkles size={13} /> Accès d'initiation
                            </span>
                            <span className="opacity-80">Parfait pour tester. Passez à Levelmak Pro à tout moment pour lever toutes les limites.</span>
                        </div>

                        {isFullScreen ? (
                            <button
                                onClick={() => {
                                    if (onChooseFree) onChooseFree();
                                }}
                                className="mt-6 w-full py-4 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl text-center text-xs uppercase tracking-widest shadow-xl shadow-purple-950/40 transition-all active:scale-[0.98]"
                            >
                                Continuer gratuitement
                            </button>
                        ) : (
                            <button
                                disabled
                                className={`mt-6 w-full py-4 px-4 font-black rounded-2xl text-center text-xs uppercase tracking-widest border ${
                                    isPremiumActive
                                        ? 'border-white/5 bg-slate-900/40 text-slate-500'
                                        : 'border-purple-500/30 text-purple-300 bg-purple-500/10'
                                }`}
                            >
                                {isPremiumActive ? 'Plan inactif' : 'Votre plan actuel'}
                            </button>
                        )}
                        <p className="text-center text-[10px] text-slate-500 font-semibold mt-2.5">Parfait pour commencer !</p>
                    </div>

                    {/* 2. HEBDOMADAIRE */}
                    <div className="relative flex flex-col border border-rose-500/30 hover:border-rose-400 bg-gradient-to-b from-[#260e1c]/85 via-[#111324]/90 to-[#070b14]/95 rounded-[2.5rem] p-6 sm:p-8 transition-all duration-300 hover:shadow-[0_20px_50px_-10px_rgba(244,63,94,0.3)] hover:-translate-y-0.5 overflow-hidden w-full backdrop-blur-xl group">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
                        
                        <div className="absolute top-5 right-5">
                            <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm shadow-rose-950/40">
                                <Zap size={11} className="text-rose-400 fill-rose-400" /> Engagement flexible
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-900/30 border border-rose-500/30 flex items-center justify-center text-rose-300 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider">Hebdomadaire</h3>
                            <p className="mt-1 text-xs text-slate-400">Progresse chaque semaine avec un accès complet</p>
                            
                            <div className="mt-5 pb-4 border-b border-white/5 flex items-baseline gap-2">
                                <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-white via-rose-100 to-pink-200 bg-clip-text text-transparent">15 000 FG</span>
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider"> / semaine</span>
                            </div>

                            <ul className="mt-6 space-y-2.5">
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                    <span className="font-semibold text-white">Accès complet à l'IA sans restriction</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Quiz et Flashcards illimités</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Sauvegarde automatique sur votre compte</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                    <span>AudioLab : Parle aux savants de ton choix</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                    <span>🏆 Défier ses amis sur Levelmark</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Support client prioritaire</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => handleSelectPlan('weekly', 15000)}
                            disabled={isPremiumActive}
                            className={`mt-6 w-full py-4 px-4 font-black rounded-2xl text-center text-xs uppercase tracking-widest transition-all active:scale-[0.98] ${
                                isPremiumActive 
                                    ? (activePlanId === 'plan_weekly' 
                                        ? 'bg-emerald-600 text-white cursor-not-allowed shadow-lg' 
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5')
                                    : 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-xl shadow-rose-900/40 hover:shadow-rose-600/50'
                            }`}
                        >
                            {isPremiumActive 
                                ? (activePlanId === 'plan_weekly' ? 'Votre plan actuel (Actif) ✓' : 'Non disponible')
                                : 'Choisir Hebdomadaire →'}
                        </button>
                        <p className="text-center text-[10px] text-slate-500 font-semibold mt-2.5">Engagement flexible, résultats rapides !</p>
                    </div>

                    {/* 3. MENSUEL */}
                    <div className="relative flex flex-col border-2 border-blue-500/70 hover:border-blue-400 bg-gradient-to-b from-[#0d1e40]/90 via-[#0a1224]/95 to-[#050811] rounded-[2.5rem] p-6 sm:p-8 transition-all duration-300 shadow-[0_25px_60px_-10px_rgba(59,130,246,0.35)] ring-1 ring-blue-400/40 hover:-translate-y-1 overflow-hidden w-full backdrop-blur-xl group">
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500" />
                        
                        <div className="absolute top-5 right-5">
                            <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-md shadow-blue-500/30">
                                <Award size={12} className="text-yellow-300 fill-yellow-300" /> Le plus populaire
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/25 to-cyan-900/30 border border-blue-400/40 flex items-center justify-center text-blue-300 mb-4 shadow-[0_0_25px_rgba(59,130,246,0.4)]">
                                <Award className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider">Mensuel</h3>
                            <p className="mt-1 text-xs text-slate-400">Le meilleur équilibre pour des résultats durables</p>
                            
                            <div className="mt-5 pb-4 border-b border-white/5">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">45 000 FG</span>
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider"> / mois</span>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-2 rounded-full bg-blue-500/15 border border-blue-500/30 text-xs font-black text-cyan-300">
                                    ✓ Économise 15 000 FG
                                </span>
                            </div>

                            <ul className="mt-6 space-y-2.5">
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                    <span className="font-bold text-white">Tout du plan hebdomadaire inclus</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                    <span>Sauvegarde 100% sécurisée sur le Cloud</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                    <span>🤖 IA optimisée, rapide et réactive</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                    <span>Recommandations d'études personnalisées</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                    <span>Statistiques détaillées et suivi des progrès</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                    <span>🏆 Défier ses amis sur Levelmark</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => handleSelectPlan('monthly', 45000)}
                            disabled={isPremiumActive}
                            className={`mt-6 w-full py-4 px-4 font-black rounded-2xl text-center text-xs uppercase tracking-widest transition-all active:scale-[0.98] ${
                                isPremiumActive 
                                    ? (activePlanId === 'plan_monthly' 
                                        ? 'bg-emerald-600 text-white cursor-not-allowed shadow-lg' 
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5')
                                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-xl shadow-blue-900/50 hover:shadow-blue-500/60'
                            }`}
                        >
                            {isPremiumActive 
                                ? (activePlanId === 'plan_monthly' ? 'Votre plan actuel (Actif) ✓' : 'Non disponible')
                                : 'Choisir Mensuel (Recommandé) →'}
                        </button>
                        <p className="text-center text-[10px] text-slate-500 font-semibold mt-2.5">Plus d'avantages, plus de sérénité !</p>
                    </div>

                    {/* 4. ANNUEL */}
                    <div className="relative flex flex-col border border-amber-500/35 hover:border-amber-400 bg-gradient-to-b from-[#25190c]/85 via-[#0e1220]/90 to-[#070b14]/95 rounded-[2.5rem] p-6 sm:p-8 transition-all duration-300 hover:shadow-[0_20px_50px_-10px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 overflow-hidden w-full backdrop-blur-xl group">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                        
                        <div className="absolute top-5 right-5">
                            <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-500/25 to-yellow-500/25 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm shadow-amber-950/40">
                                <Crown size={12} className="text-amber-400 fill-amber-400" /> Meilleur investissement
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-900/30 border border-amber-500/30 flex items-center justify-center text-amber-300 mb-4 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                                <Star className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider">Annuel</h3>
                            <p className="mt-1 text-xs text-slate-400">Le choix ultime pour une réussite assurée toute l'année</p>
                            
                            <div className="mt-5 pb-4 border-b border-white/5">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-white via-amber-100 to-yellow-200 bg-clip-text text-transparent">385 000 FG</span>
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider"> / an</span>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-black text-amber-300">
                                    ✓ Économise 155 000 FG
                                </span>
                            </div>

                            <ul className="mt-6 space-y-2.5">
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <span className="font-bold text-white">Tout du plan mensuel inclus</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <span>Accès complet sans interruption 365 jours</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <span>Sauvegarde illimitée et sécurisée à vie</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <span>Accompagnement VIP toute l'année</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <span>Conserve tes données et progrès d'une année sur l'autre</span>
                                </li>
                                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <span>🏆 Défier ses amis sur Levelmark</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => handleSelectPlan('annual', 385000)}
                            disabled={isPremiumActive}
                            className={`mt-6 w-full py-4 px-4 font-black rounded-2xl text-center text-xs uppercase tracking-widest transition-all active:scale-[0.98] ${
                                isPremiumActive 
                                    ? (activePlanId === 'plan_annual' 
                                        ? 'bg-emerald-600 text-white cursor-not-allowed shadow-lg' 
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5')
                                    : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-xl shadow-amber-900/40 hover:shadow-yellow-500/50'
                            }`}
                        >
                            {isPremiumActive 
                                ? (activePlanId === 'plan_annual' ? 'Votre plan actuel (Actif) ✓' : 'Non disponible')
                                : 'Choisir Annuel (Meilleure Offre) →'}
                        </button>
                        <p className="text-center text-[10px] text-slate-500 font-semibold mt-2.5">Investis une fois, profite toute l'année !</p>
                    </div>

                </div>
            </div>

            {/* Phone Number Collection Modal for Djomy Real Payment Redirection */}
            <AnimatePresence>
                {isPhoneModalOpen && selectedOptions && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 12 }}
                            className="relative w-full max-w-md bg-gradient-to-b from-[#0f172a] via-[#0b1120] to-[#070b14] border border-slate-800 text-white rounded-[2.5rem] p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden font-sans text-left"
                        >
                            {/* Glowing light effect on top border */}
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500" />
                            
                            {/* Header with Official LEVELMAK Logo */}
                            <div className="flex justify-between items-center pb-4 border-b border-slate-800/80 mb-5">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-white/20 via-white/10 to-blue-500/15 border border-white/25 p-1 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.35)] shrink-0 backdrop-blur-md">
                                        <img 
                                            src="/logo.png" 
                                            alt="LEVELMAK" 
                                            className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] brightness-115" 
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-base sm:text-lg tracking-tight text-white">Numéro de Paiement</h3>
                                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[8px] font-black text-emerald-400 uppercase tracking-wider">Sécurisé</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-bold tracking-wider mt-0.5">
                                            Mobile Money Guinée
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsPhoneModalOpen(false);
                                        setInitiateError(null);
                                    }}
                                    className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Summary of Achat (Design Premium & Parlant) */}
                            <div className="mb-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-blue-950/30 p-4 border border-blue-500/20 shadow-inner">
                                <div className="flex justify-between items-start mb-2.5">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Crown size={12} className="text-amber-400" />
                                            <span className="text-[9px] uppercase tracking-widest font-black text-amber-400">Abonnement Choisi</span>
                                        </div>
                                        <p className="text-sm font-black text-white">
                                            LEVELMAK PRO <span className="text-blue-400">{selectedOptions.duration === 'weekly' ? 'Hebdomadaire (7j)' : selectedOptions.duration === 'monthly' ? 'Mensuel (30j)' : 'Annuel (365j)'}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] uppercase tracking-wider font-black text-slate-400">Montant Total</p>
                                        <p className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                                            {selectedOptions.amount.toLocaleString()} FG
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                                    <span className="flex items-center gap-1 text-slate-300 font-semibold">
                                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" /> Accès complet immédiat
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-700/50">
                                        Sans engagement
                                    </span>
                                </div>
                            </div>

                            {initiateError && (
                                <div className="mb-5 space-y-3">
                                    <div className="flex gap-3 p-4 border border-red-500/30 bg-red-950/40 text-red-300 rounded-2xl text-xs font-semibold leading-relaxed">
                                        <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-red-200">{initiateError}</p>
                                            <p className="text-[11px] text-slate-400 mt-1">Vous pouvez activer directement en mode secours/test ci-dessous ou joindre l'assistance.</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button
                                            type="button"
                                            onClick={handleDirectTestActivation}
                                            className="flex-1 py-2.5 px-3 bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/40 text-blue-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5"
                                        >
                                            ⚡ Activer sans attendre
                                        </button>
                                        <a
                                            href="https://wa.me/224623707722?text=Bonjour,%20je%20rencontre%20un%20souci%20pour%20activer%20mon%20abonnement%20LEVELMAK%20PRO"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-2.5 px-3 bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                                        >
                                            💬 Assistance WhatsApp
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                    Saisissez votre numéro Mobile Money pour régler votre abonnement. Vous serez redirigé vers l'interface officielle sécurisée.
                                </p>
                                
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] text-slate-300 uppercase tracking-widest font-black">
                                        Numéro de téléphone (Guinée)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-300 text-xs font-black border-r border-slate-700/80 pr-2.5">
                                            🇬🇳 +224
                                        </div>
                                        <input
                                            type="tel"
                                            maxLength={9}
                                            placeholder="Ex: 620 00 00 00"
                                            value={paymentPayerNumber}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/\D/g, '');
                                                if (val.startsWith('224')) val = val.slice(3);
                                                if (val.startsWith('0')) val = val.slice(1);
                                                setPaymentPayerNumber(val);
                                            }}
                                            className="w-full bg-[#050811] border border-slate-700/80 focus:border-blue-500 rounded-2xl pl-20 pr-10 py-3.5 text-white focus:outline-none font-mono font-bold text-sm tracking-widest transition-colors shadow-inner"
                                        />
                                        {paymentPayerNumber.length === 9 && (
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <CheckCircle2 size={16} className="text-emerald-400" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">Format à 9 chiffres sans le 0 ni l'indicatif (ex: 620000000)</p>
                                </div>

                                <button
                                    onClick={handleInitiatePayment}
                                    disabled={isInitiatingPayment || paymentPayerNumber.length !== 9}
                                    className="w-full mt-2 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-[0.98] shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                                >
                                    {isInitiatingPayment ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Connexion sécurisée...</span>
                                        </>
                                    ) : (
                                        <span>Confirmer et Payer →</span>
                                    )}
                                </button>
                                
                                <div className="pt-2 text-center">
                                    <span className="text-[10px] text-slate-400 font-semibold tracking-tight inline-flex items-center gap-1.5">
                                        <Lock size={12} className="text-emerald-400" /> Paiement 100% sécurisé
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                        className="fixed inset-0 z-[9999] bg-black overflow-y-auto"
                    >
                        {/* Blue border frame */}
                        <div className="min-h-full border-4 border-blue-500 flex flex-col items-center bg-[#09101e] px-5 py-10 shadow-[inset_0_0_60px_rgba(59,130,246,0.08)]">

                            {/* Green check circle */}
                            <div className="w-20 h-20 rounded-full bg-emerald-900/50 border-2 border-emerald-500/60 flex items-center justify-center mb-5 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                                <Check className="w-10 h-10 text-emerald-400" strokeWidth={3} />
                            </div>

                            {/* Title */}
                            <h2 className="text-[26px] font-black text-white uppercase tracking-wide text-center">Reçu d'Abonnement</h2>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1 text-center">LEVELMAK PRO • ORDONNANCE ÉLITE</p>

                            {/* Dashed separator */}
                            <div className="w-full my-6 border-t-2 border-dashed border-slate-700" />

                            {/* Green congrats box */}
                            <div className="w-full mb-5 p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl text-center">
                                <p className="text-emerald-300 text-[13px] font-bold leading-relaxed">
                                    🎉 Félicitations ! Votre abonnement{' '}
                                    <span className="text-white font-black">LEVELMAK PRO</span> est maintenant actif et prêt à l'emploi.
                                </p>
                            </div>

                            {/* Billing Info */}
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-3">Informations de Facturation</p>
                            <div className="w-full bg-[#0d1425] border border-slate-800 rounded-2xl overflow-hidden mb-5">
                                {[
                                    { label: 'Étudiant :', value: user?.name || 'Étudiant', cls: 'text-white' },
                                    { label: 'Téléphone :', value: user?.phoneNumber || 'N/A', cls: 'text-white' },
                                    { label: 'Forfait :', value: `PRO ${receiptData.planName}`, cls: 'text-blue-400 font-bold' },
                                    { label: 'Montant payé :', value: `${receiptData.amount.toLocaleString()} FG`, cls: 'text-white' },
                                    { label: "Date d'achat :", value: receiptData.purchasedAt, cls: 'text-white' },
                                    { label: 'Référence :', value: receiptData.transactionId, cls: 'text-white font-mono text-[10px]' },
                                ].map((row, i, arr) => (
                                    <div key={row.label} className={`flex justify-between items-center px-4 py-3 ${i < arr.length - 1 ? 'border-b border-slate-800/70' : ''}`}>
                                        <span className="text-slate-400 text-[12px]">{row.label}</span>
                                        <span className={`${row.cls} text-[12px] text-right ml-4`}>{row.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Period of Validity */}
                            <div className="w-full bg-[#0d1425] border border-slate-800 rounded-2xl px-5 py-4 mb-8">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Période de Validité</p>
                                <p className="text-[12px] text-white font-bold mb-1">
                                    Du : <span className="underline underline-offset-2">{receiptData.startsAt}</span>
                                </p>
                                <p className="text-[12px] text-white font-bold mb-3">
                                    Au : <span className="underline underline-offset-2">{receiptData.expiresAt}</span>
                                </p>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    À cette échéance, votre accès repassera automatiquement au mode gratuit. Vous pourrez le renouveler à tout moment.
                                </p>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={() => {
                                    setReceiptData(null);
                                    if (onChoosePremium) onChoosePremium();
                                    window.dispatchEvent(new CustomEvent('nav_change', { detail: 'dashboard' }));
                                }}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-2xl font-black uppercase tracking-widest text-[13px] transition-all shadow-lg shadow-blue-900/40"
                            >
                                Commencer à Réviser
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
