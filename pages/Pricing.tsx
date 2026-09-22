import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Shield, Landmark, Star, Sparkles, Award, Zap, PenTool, BrainCircuit, Globe, Database, Headphones, Mail, Phone, Trophy, Map, Layers, AlertCircle, Loader2 } from 'lucide-react';
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
        userName?: string;
        userPhone?: string;
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

    // Detect return from payment redirection (real Djomy gateway or simulation)
    useEffect(() => {
        if (typeof window === 'undefined' || !user) return;
        
        const params = new URLSearchParams(window.location.search);
        const hasPaymentReturn = params.get('success') === 'true' ||
                                 params.get('payment_status') === 'SUCCESS' ||
                                 params.get('status') === 'SUCCESS' ||
                                 params.get('status') === 'success' ||
                                 params.get('simulate') === 'true' ||
                                 Boolean(params.get('transactionId')) ||
                                 Boolean(params.get('merchantPaymentReference')) ||
                                 Boolean(params.get('reference'));
        if (hasPaymentReturn && validationStatus === 'idle' && !isValidating) {
            handleReturnValidation();
        }
    }, [user, validationStatus, isValidating]);

    const handleReturnValidation = async () => {
        if (!user) return;
        setIsValidating(true);
        setValidationStatus('loading');
        setValidationProgress("Connexion sécurisée avec Djomy...");
        
        let attempts = 0;
        const maxAttempts = 15; // 37.5 seconds total
        
        const params = new URLSearchParams(window.location.search);
        let pendingTxId = params.get('transactionId') || 
                          params.get('merchantPaymentReference') || 
                          params.get('reference') || 
                          localStorage.getItem(`levelmak_pending_tx_id_${user.id}`);

        const isSuccessParam = params.get('payment_status') === 'SUCCESS' || 
                               params.get('status') === 'SUCCESS' || 
                               params.get('status') === 'success' || 
                               params.get('simulate') === 'true' ||
                               params.get('success') === 'true';

        const planParam = (params.get('plan') as 'weekly' | 'monthly' | 'annual') || selectedOptions?.duration || 'monthly';

        // If no transaction ID found yet, look up latest transaction for this user in Supabase
        if (!pendingTxId) {
            try {
                const { data: latestTx } = await supabase
                    .from('user_transactions')
                    .select('id')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (latestTx?.id) {
                    pendingTxId = latestTx.id;
                }
            } catch (err) {
                console.warn("Impossible de récupérer la dernière transaction:", err);
            }
        }
        
        const interval = setInterval(async () => {
            attempts++;
            
            if (attempts === 1) setValidationProgress("Connexion sécurisée avec Djomy...");
            if (attempts === 3) setValidationProgress("Vérification de l'état de votre transaction...");
            if (attempts === 6) setValidationProgress("Sécurisation de la liaison de compte...");
            if (attempts === 9) setValidationProgress("Activation finale de votre abonnement...");
            if (attempts === 12) setValidationProgress("Finalisation de l'espace Premium...");
            
            try {
                // If pendingTxId is a valid UUID, verify with backend Djomy Edge function
                const isUuid = !!pendingTxId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pendingTxId);
                if (isUuid) {
                    try {
                        await supabase.functions.invoke('djomy-payment', {
                            body: {
                                action: 'verify-status',
                                transactionId: pendingTxId
                            }
                        });
                    } catch (invokeErr) {
                        console.warn("Verify-status invoke note:", invokeErr);
                    }
                }

                // Check profile premium state
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_premium, premium_until')
                    .eq('id', user.id)
                    .single();

                // Check transaction state in user_transactions
                const { data: tx } = await supabase
                    .from('user_transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                let isProfileValid = !!(profile && profile.is_premium && profile.premium_until && new Date(profile.premium_until).getTime() > Date.now());

                // Synchronization: if tx is success OR redirect URL confirms success
                if (!isProfileValid && (tx?.status === 'success' || isSuccessParam)) {
                    const planDuration = tx?.plan_duration || planParam;
                    const exp = new Date();
                    if (planDuration === 'weekly') exp.setDate(exp.getDate() + 7);
                    else if (planDuration === 'monthly') exp.setDate(exp.getDate() + 30);
                    else if (planDuration === 'annual') exp.setDate(exp.getDate() + 365);
                    const calculatedExpiry = exp.toISOString();

                    await supabase
                        .from('profiles')
                        .update({
                            is_premium: true,
                            premium_until: calculatedExpiry
                        })
                        .eq('id', user.id);

                    // If user_transactions has no success tx, insert/update it
                    if (!tx || tx.status !== 'success') {
                        try {
                            await supabase.from('user_transactions').insert({
                                user_id: user.id,
                                amount: planDuration === 'weekly' ? 15000 : planDuration === 'monthly' ? 45000 : 385000,
                                currency: 'FG',
                                status: 'success',
                                payment_method: 'orange_money',
                                item_type: 'premium',
                                plan_duration: planDuration
                            });
                        } catch (txInsertErr) {
                            console.warn("Could not insert simulated transaction log:", txInsertErr);
                        }
                    }

                    if (profile) {
                        profile.is_premium = true;
                        profile.premium_until = calculatedExpiry;
                    }
                    isProfileValid = true;
                }
                
                if (isProfileValid) {
                    clearInterval(interval);
                    
                    const finalExpiry = profile?.premium_until || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
                    
                    updateProfile(user.name, user.phoneNumber, {
                        is_premium: true,
                        premium_until: finalExpiry
                    });
                    
                    localStorage.removeItem(`levelmak_pending_tx_id_${user.id}`);
                    localStorage.removeItem(`levelmak_demo_premium_${user.id}`);
                    localStorage.removeItem(`levelmak_demo_premium_until_${user.id}`);
                    localStorage.removeItem(`levelmak_demo_premium_plan_id_${user.id}`);
                    
                    import('../services/audio').then(({ audioService }) => {
                        audioService.playSuccess?.();
                    });
                    
                    import('canvas-confetti').then(({ default: confetti }) => {
                        confetti({
                            particleCount: 150,
                            spread: 80,
                            origin: { y: 0.6 },
                            colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
                        });
                    });
                    
                    const purchaseDate = new Date();
                    const expirationDate = new Date(finalExpiry);
                    const planDuration = tx?.plan_duration || planParam;
                    const planName = planDuration === 'weekly' ? 'Hebdomadaire' : planDuration === 'monthly' ? 'Mensuel' : 'Annuel';
                    const amount = tx?.amount || (planDuration === 'weekly' ? 15000 : planDuration === 'monthly' ? 45000 : 385000);
                    
                    const receiptPayload = {
                        transactionId: tx?.id || pendingTxId || `LMK-${Date.now().toString(36).toUpperCase()}`,
                        planName,
                        amount,
                        purchasedAt: formatDateFrench(purchaseDate),
                        startsAt: formatDateFrench(purchaseDate),
                        expiresAt: formatDateFrench(expirationDate),
                        userName: user.name,
                        userPhone: user.phoneNumber
                    };
                    
                    addNotification({
                        type: 'admin',
                        title: `Reçu d'Abonnement PRO`,
                        message: `Reçu officiel LEVELMAK PRO :\n• Forfait : PRO ${planName}\n• Montant : ${amount.toLocaleString()} FG\n• Réf : ${receiptPayload.transactionId}\n• Période : du ${receiptPayload.startsAt} au ${receiptPayload.expiresAt}\nMerci pour votre confiance.`,
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
                    if (onPaymentSuccess) onPaymentSuccess(receiptPayload);
                    setValidationStatus('success');
                    setIsValidating(false);
                    
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } catch (err) {
                console.error("Validation loop error:", err);
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                setValidationStatus('timeout');
                setIsValidating(false);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }, 2500);
    };

    const handleSimulatePayment = () => {
        if (!selectedOptions || !user) return;
        setIsPhoneModalOpen(false);
        const simTxId = `SIM-DJOMY-${Date.now().toString(36).toUpperCase()}`;
        localStorage.setItem(`levelmak_pending_tx_id_${user.id}`, simTxId);
        
        // Update URL query parameters to simulate return from Djomy gateway
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('success', 'true');
        newUrl.searchParams.set('payment_status', 'SUCCESS');
        newUrl.searchParams.set('status', 'SUCCESS');
        newUrl.searchParams.set('merchantPaymentReference', simTxId);
        newUrl.searchParams.set('transactionId', simTxId);
        newUrl.searchParams.set('plan', selectedOptions.duration || 'monthly');
        window.history.pushState({}, '', newUrl.toString());
        
        // Trigger validation flow immediately
        handleReturnValidation();
    };

    const handleInitiatePayment = async () => {
        if (!user || !selectedOptions) return;
        setInitiateError(null);

        if (paymentPayerNumber.length < 9) {
            setInitiateError("Veuillez saisir un numéro de téléphone valide à 9 chiffres.");
            return;
        }

        setIsInitiatingPayment(true);
        try {
            const formattedPayerNumber = `224${paymentPayerNumber}`;
            
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
                window.location.href = res.redirectUrl;
            } else {
                if (res.error?.includes('non valide') || res.error?.includes('expiré')) {
                    setInitiateError("Votre session a expiré. Veuillez vous déconnecter et vous reconnecter à votre compte pour finaliser le paiement.");
                } else {
                    setInitiateError(res.error || "Impossible d'initier le paiement. Réessayez.");
                }
                setIsInitiatingPayment(false);
            }
        } catch (err: any) {
            setInitiateError(err.message || "Une erreur inattendue est survenue.");
            setIsInitiatingPayment(false);
        }
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
            let rawPhone = user.phoneNumber || '';
            let cleaned = rawPhone.replace(/\D/g, '');
            if (cleaned.startsWith('224')) {
                cleaned = cleaned.slice(3);
            }
            setPaymentPayerNumber(cleaned);
            setIsPhoneModalOpen(true);
        }
    };


    const handlePaymentSuccess = (transactionId: string) => {
        if (!user) return;

        // Calculate matching expiration date locally for instant state update
        const expirationDate = new Date();
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
                {/* Title & Header with Logo */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-10 text-center sm:text-left relative px-4">
                    <div className="w-16 h-16 bg-slate-900/80 border border-white/10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-black/25">
                        <img 
                            src="/logo.png" 
                            alt="LEVELMAK Logo" 
                            className="h-12 w-auto object-contain brightness-110 drop-shadow-[0_0_12px_rgba(59,130,246,0.35)]" 
                        />
                    </div>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                            Abonnez-vous à <span className="text-blue-500">LEVELMAK PRO</span>
                        </h1>
                        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                            Débloquez la puissance illimitée de l'IA pédagogique, défiez vos amis et réussissez vos études à votre rythme.
                        </p>
                    </div>
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

                {/* Grid - Vertical stack block by block */}
                <div className="flex flex-col gap-6 max-w-xl mx-auto w-full">
                    
                    {/* 1. GRATUIT */}
                    <div className="flex flex-col border border-slate-800 bg-slate-900/40 rounded-3xl p-5 sm:p-7 transition-all hover:border-slate-700 relative overflow-hidden w-full shadow-lg shadow-black/10">
                        <div className="flex-1">
                            <div className="w-10 h-10 rounded-lg bg-purple-900/20 flex items-center justify-center text-purple-400 mb-4 border border-purple-500/20">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Gratuit</h3>
                            <p className="mt-2 text-xs text-slate-400">Pour découvrir l'IA et commencer à réviser</p>
                            
                            <p className="mt-5">
                                <span className="text-3xl sm:text-4xl font-extrabold text-white">0 FG</span>
                                <span className="text-xs text-slate-400 font-semibold"> / à vie</span>
                            </p>

                            <ul className="mt-4 sm:mt-6 space-y-2">
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-350 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>Créer des fiches et contenus</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>3 quiz personnalisés</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>3 paquets de flashcards</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>10 réponses à l'IA par jour</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-500 line-through">
                                    <X className="w-3.5 h-3.5 sm:w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Quiz illimités</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-500 line-through">
                                    <X className="w-3.5 h-3.5 sm:w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Accès complet à l'IA</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-500 line-through">
                                    <X className="w-3.5 h-3.5 sm:w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Sauvegarde de tes quiz et contenus</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-500 line-through">
                                    <X className="w-3.5 h-3.5 sm:w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Défier ses amis sur Levelmark</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-500 line-through">
                                    <X className="w-3.5 h-3.5 sm:w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Accès complet à l'application</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-500 line-through">
                                    <X className="w-3.5 h-3.5 sm:w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Fonctionnalités avancées</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-500 line-through">
                                    <X className="w-3.5 h-3.5 sm:w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Support client réactif</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-500 line-through">
                                    <X className="w-3.5 h-3.5 sm:w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                    <span>Sauvegarde de session (discussions éphémères)</span>
                                </li>
                            </ul>
                        </div>

                        {/* Info Box */}
                        <div className="mt-4 p-3 rounded-xl bg-purple-950/20 border border-purple-500/10 text-[11px] text-purple-300">
                            <span className="font-bold flex items-center gap-1 mb-0.5">🛈 Accès limité</span>
                            <span className="opacity-80">Tu ne profites pas de toutes les fonctionnalités et avantages disponibles dans les autres plans.</span>
                        </div>

                        {isFullScreen ? (
                            <button
                                onClick={() => {
                                    if (onChooseFree) onChooseFree();
                                }}
                                className="mt-5 w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-center text-sm shadow-lg shadow-purple-950/20 transition-all active:scale-[0.98]"
                            >
                                Continuer gratuitement
                            </button>
                        ) : (
                            <button
                                disabled
                                className={`mt-5 w-full py-3 px-4 font-bold rounded-xl text-center text-sm border ${
                                    isPremiumActive
                                        ? 'border-white/5 bg-slate-900/40 text-slate-500'
                                        : 'border-purple-500/30 text-purple-400 bg-purple-500/5'
                                }`}
                            >
                                {isPremiumActive ? 'Plan inactif' : 'Votre plan actuel'}
                            </button>
                        )}
                        <p className="text-center text-[10px] text-slate-500 mt-2">Parfait pour commencer !</p>
                    </div>

                    {/* 2. HEBDOMADAIRE */}
                    <div className="flex flex-col border border-slate-800 bg-slate-900/40 rounded-3xl p-5 sm:p-7 transition-all hover:border-slate-700 relative overflow-hidden w-full shadow-lg shadow-black/10">
                        <div className="absolute top-4 right-4">
                            <span className="text-[9px] font-bold uppercase tracking-widest bg-rose-500/15 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                ⚡ Engagement flexible
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="w-10 h-10 rounded-lg bg-rose-900/20 flex items-center justify-center text-rose-400 mb-4 border border-rose-500/20">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Hebdomadaire</h3>
                            <p className="mt-2 text-xs text-slate-400">Progresse chaque semaine avec un accès complet</p>
                            
                            <p className="mt-5">
                                <span className="text-3xl sm:text-4xl font-extrabold text-white">15 000 FG</span>
                                <span className="text-xs text-slate-400 font-semibold"> / semaine</span>
                            </p>

                            <ul className="mt-4 sm:mt-6 space-y-2">
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Accès complet à l'IA</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Accès complet à l'application</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Quiz illimités</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Flashcards illimitées</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Sauvegarde automatique des quiz</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Parle aux savants de ton choix (AudioLab)</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Support client réactif</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>Idéal pour apprentissage flexible</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>🏆 Défier ses amis sur Levelmark</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>⚡ IA rapide et stable</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => handleSelectPlan('weekly', 15000)}
                            disabled={isPremiumActive}
                            className={`mt-5 w-full py-3 px-4 font-bold rounded-xl text-center text-sm transition-all active:scale-[0.98] ${
                                isPremiumActive 
                                    ? (activePlanId === 'plan_weekly' 
                                        ? 'bg-emerald-600 text-white cursor-not-allowed' 
                                        : 'bg-slate-855 text-slate-500 cursor-not-allowed border border-white/5')
                                    : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-950/20'
                            }`}
                        >
                            {isPremiumActive 
                                ? (activePlanId === 'plan_weekly' ? 'Votre plan actuel (Actif) ✓' : 'Non disponible')
                                : 'Choisir Hebdomadaire'}
                        </button>
                        <p className="text-center text-[10px] text-slate-500 mt-2">Engagement flexible, résultats rapides !</p>
                    </div>

                    {/* 3. MENSUEL */}
                    <div className="flex flex-col border border-blue-500/50 bg-slate-900/40 rounded-3xl p-5 sm:p-7 transition-all hover:border-blue-400 relative overflow-hidden w-full shadow-lg shadow-blue-950/20 ring-1 ring-blue-500/20">
                        <div className="absolute top-4 right-4">
                            <span className="text-[9px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                                ★ Le plus choisi
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="w-10 h-10 rounded-lg bg-blue-900/20 flex items-center justify-center text-blue-400 mb-4 border border-blue-500/20">
                                <Award className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Mensuel</h3>
                            <p className="mt-2 text-xs text-slate-400">Le meilleur équilibre pour des résultats durables</p>
                            
                            <p className="mt-5">
                                <span className="text-3xl sm:text-4xl font-extrabold text-white">45 000 FG</span>
                                <span className="text-xs text-slate-400 font-semibold"> / mois</span>
                            </p>
                            <p className="text-[11px] text-blue-400 font-bold mt-1">✓ Économise 15 000 FG</p>

                            <ul className="mt-4 sm:mt-6 space-y-2">
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span className="font-semibold text-white">Tout du plan hebdomadaire</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Sauvegarde 100% sécurisée sur le Cloud</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>🤖 IA rapide et efficace</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Compte et données sécurisés à vie</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Recommandations personnalisées</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Statistiques de progression</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Accès prioritaire aux nouveautés</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>Support prioritaire</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <span>🏆 Défier ses amis sur Levelmark</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => handleSelectPlan('monthly', 45000)}
                            disabled={isPremiumActive}
                            className={`mt-5 w-full py-3 px-4 font-bold rounded-xl text-center text-sm transition-all active:scale-[0.98] ${
                                isPremiumActive 
                                    ? (activePlanId === 'plan_monthly' 
                                        ? 'bg-emerald-600 text-white cursor-not-allowed' 
                                        : 'bg-slate-855 text-slate-500 cursor-not-allowed border border-white/5')
                                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-950/20'
                            }`}
                        >
                            {isPremiumActive 
                                ? (activePlanId === 'plan_monthly' ? 'Votre plan actuel (Actif) ✓' : 'Non disponible')
                                : 'Choisir Mensuel'}
                        </button>
                        <p className="text-center text-[10px] text-slate-500 mt-2">Plus d'avantages, plus de sérénité !</p>
                    </div>

                    {/* 4. ANNUEL */}
                    <div className="flex flex-col border border-slate-800 bg-slate-900/40 rounded-3xl p-5 sm:p-7 transition-all hover:border-slate-700 relative overflow-hidden w-full shadow-lg shadow-black/10">
                        <div className="absolute top-4 right-4">
                            <span className="text-[9px] font-bold uppercase tracking-widest bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                Le meilleur investissement
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="w-10 h-10 rounded-lg bg-yellow-900/20 flex items-center justify-center text-yellow-400 mb-4 border border-yellow-500/20">
                                <Star className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Annuel</h3>
                            <p className="mt-2 text-xs text-slate-400">Le choix ultime pour une réussite assurée</p>
                            
                            <p className="mt-5">
                                <span className="text-3xl sm:text-4xl font-extrabold text-white">385 000 FG</span>
                                <span className="text-xs text-slate-400 font-semibold"> / an</span>
                            </p>
                            <p className="text-[11px] text-yellow-400 font-bold mt-1">✓ Économise 155 000 FG</p>

                            <ul className="mt-4 sm:mt-6 space-y-2">
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span className="font-semibold text-white">Tout du plan mensuel</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Sauvegarde illimitée et sécurisée</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>🤖 IA plus rapide et structurée</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Accès complet toute l'année</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Conserve tes données l'année prochaine</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Modification des contenus à tout moment</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Aucun devoir imposé, rythme libre</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>Accompagnement premium toute l'année</span>
                                </li>
                                <li className="flex items-start gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-slate-355 sm:text-slate-300">
                                    <Check className="w-3.5 h-3.5 sm:w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <span>🏆 Défier ses amis sur Levelmark</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => handleSelectPlan('annual', 385000)}
                            disabled={isPremiumActive}
                            className={`mt-5 w-full py-3 px-4 font-bold rounded-xl text-center text-sm transition-all active:scale-[0.98] ${
                                isPremiumActive 
                                    ? (activePlanId === 'plan_annual' 
                                        ? 'bg-emerald-600 text-white cursor-not-allowed' 
                                        : 'bg-slate-855 text-slate-500 cursor-not-allowed border border-white/5')
                                    : 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white shadow-lg shadow-yellow-950/20'
                            }`}
                        >
                            {isPremiumActive 
                                ? (activePlanId === 'plan_annual' ? 'Votre plan actuel (Actif) ✓' : 'Non disponible')
                                : 'Choisir Annuel'}
                        </button>
                        <p className="text-center text-[10px] text-slate-500 mt-2">Investis une fois, profite toute l'année !</p>
                    </div>

                </div>
            </div>

            {/* Phone Number Collection Modal for Djomy Real Payment Redirection */}
            <AnimatePresence>
                {isPhoneModalOpen && selectedOptions && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-md bg-[#0b1222] border border-slate-800 text-white rounded-[2rem] p-6 shadow-2xl overflow-hidden font-sans text-left"
                        >
                            {/* Glowing light effect on top border */}
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500" />
                            
                            {/* Header */}
                            <div className="flex justify-between items-center pb-4 border-b border-slate-800/60 mb-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 flex items-center justify-center">
                                        <Landmark className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-base tracking-tight text-white">Numéro de Paiement</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Mobile Money Guinée</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsPhoneModalOpen(false);
                                        setInitiateError(null);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Summary of Achat */}
                            <div className="mb-5 rounded-2xl bg-[#070b14] p-4 border border-slate-800/80 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] uppercase tracking-wider font-black text-slate-500">Abonnement</p>
                                    <p className="text-sm font-black text-white capitalize">
                                        LEVELMAK PRO {selectedOptions.duration === 'weekly' ? 'Hebdomadaire' : selectedOptions.duration === 'monthly' ? 'Mensuel' : 'Annuel'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] uppercase tracking-wider font-black text-slate-500">Montant</p>
                                    <p className="text-lg font-black text-blue-400">
                                        {selectedOptions.amount.toLocaleString()} FG
                                    </p>
                                </div>
                            </div>

                            {initiateError && (
                                <div className="mb-5 flex gap-3 p-4 border border-red-500/20 bg-red-950/20 text-red-400 rounded-2xl text-xs font-bold leading-relaxed">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p>{initiateError}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <p className="text-xs text-slate-350 leading-relaxed font-medium">
                                    Saisissez le numéro Mobile Money (Orange Money, MTN MoMo...) à débiter pour finaliser votre abonnement. Vous serez redirigé vers la passerelle sécurisée officielle.
                                </p>
                                
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Numéro de téléphone (Guinée)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold border-r border-slate-800 pr-2">
                                            +224
                                        </div>
                                        <input
                                            type="tel"
                                            maxLength={9}
                                            placeholder="Ex: 620 00 00 00"
                                            value={paymentPayerNumber}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setPaymentPayerNumber(val);
                                            }}
                                            className="w-full bg-[#070b14] border border-slate-805 rounded-2xl pl-16 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500 font-mono font-bold text-sm tracking-widest"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium">Format à 9 chiffres sans le code pays (ex: 620000000)</p>
                                </div>

                                <button
                                    onClick={handleInitiatePayment}
                                    disabled={isInitiatingPayment}
                                    className="w-full mt-2 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all active:scale-[0.98] shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                                >
                                    {isInitiatingPayment ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Redirection en cours...</span>
                                        </>
                                    ) : (
                                        <span>Confirmer et Payer →</span>
                                    )}
                                </button>
                                
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={handleSimulatePayment}
                                        className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-2xl font-bold uppercase tracking-widest text-[9px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                                        <span>⚡ Tester la simulation (Retour Djomy Réussi)</span>
                                    </button>
                                </div>
                                
                                <div className="pt-1 text-center">
                                    <span className="text-[10px] text-slate-500 font-semibold tracking-tight inline-flex items-center gap-1.5">
                                        🔒 Transaction cryptée SSL 256 bits via Djomy
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
