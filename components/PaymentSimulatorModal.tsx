import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Phone, ShieldCheck, AlertCircle, Loader2, Landmark } from 'lucide-react';
import confetti from 'canvas-confetti';
import { paymentService, PaymentMethod, PaymentSessionOptions } from '../services/paymentService';
import { audioService } from '../services/audio';

interface PaymentSimulatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    options: PaymentSessionOptions | null;
    onSuccess: (transactionId: string) => void;
    onFailure: (errorMsg: string) => void;
}

export const PaymentSimulatorModal: React.FC<PaymentSimulatorModalProps> = ({
    isOpen,
    onClose,
    userId,
    options,
    onSuccess,
    onFailure
}) => {
    const [method, setMethod] = useState<PaymentMethod | null>(null);
    const [step, setStep] = useState<'select' | 'form' | 'processing'>('select');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [cardDetails, setCardDetails] = useState({ number: '', name: '', expiry: '', cvv: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState('Sécurisation de la connexion...');

    useEffect(() => {
        if (isOpen) {
            setMethod(null);
            setStep('select');
            setPhoneNumber('');
            setCardDetails({ number: '', name: '', expiry: '', cvv: '' });
            setLoading(false);
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen || !options) return null;

    const handleMethodSelect = (selected: PaymentMethod) => {
        setMethod(selected);
        setStep('form');
    };

    const renderLogo = (m: PaymentMethod) => {
        let imageUrl = '';
        switch (m) {
            case 'orange_money':
                imageUrl = 'https://play-lh.googleusercontent.com/4h_K6zL0c-g1y4oB2n574K36rO-5b0yP6v9235hV5j8o7n82387n873n8=w240-h240';
                break;
            case 'wave':
                imageUrl = 'https://play-lh.googleusercontent.com/w9U427d1M_2vC6_Q804lJ0iA102oPZ_Yg9i18Hpe3k-5c2D5V9L44534tN-2=w240-h240';
                break;
            case 'mtn_money':
                imageUrl = 'https://play-lh.googleusercontent.com/97yC5D-fQW74w368r9n802yP6v9i18Hpe3k-5c2D5V9L44534tN-2=w240-h240';
                break;
            case 'moov_money':
                imageUrl = 'https://play-lh.googleusercontent.com/gOq74tM2vC6_Q804lJ0iA102oPZ_Yg9i18Hpe3k-5c2D5V9L44534tN-2=w240-h240';
                break;
            case 'card':
                imageUrl = 'https://cdn-icons-png.flaticon.com/512/349/349228.png';
                break;
        }

        return (
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center border border-slate-700/50 shrink-0 relative">
                <img 
                    src={imageUrl} 
                    alt={m} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                            // Clear other contents to prevent duplications
                            const existingSvg = parent.querySelector('.fallback-svg');
                            if (existingSvg) return;

                            const svgContainer = document.createElement('div');
                            svgContainer.className = "fallback-svg w-full h-full flex items-center justify-center";
                            if (m === 'wave') {
                                svgContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" class="w-8 h-8"><rect width="24" height="24" rx="6" fill="#1A9CFC"/><path d="M5 13C8 10 12 17 16 13C18 11 19 12 20 13" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`;
                            } else if (m === 'orange_money') {
                                svgContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" class="w-8 h-8"><rect width="24" height="24" rx="6" fill="#FF6600"/><rect x="6" y="6" width="6" height="6" fill="white"/></svg>`;
                            } else if (m === 'mtn_money') {
                                svgContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" class="w-8 h-8"><rect width="24" height="24" rx="6" fill="#FFCC00"/><ellipse cx="12" cy="12" rx="7" ry="4.5" fill="none" stroke="#002D62" stroke-width="1.5"/><text x="12" y="14" font-size="5" fill="#002D62" text-anchor="middle" font-weight="bold">MTN</text></svg>`;
                            } else if (m === 'moov_money') {
                                svgContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" class="w-8 h-8"><rect width="24" height="24" rx="6" fill="#009A44"/><path d="M6 16V8L12 13L18 8V16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                            } else {
                                svgContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" class="w-8 h-8"><rect width="24" height="24" rx="6" fill="#1E293B"/><circle cx="9" cy="12" r="4" fill="#EB001B" opacity="0.9"/><circle cx="15" cy="12" r="4" fill="#F79E1B" opacity="0.9"/></svg>`;
                            }
                            parent.appendChild(svgContainer);
                        }
                    }}
                />
            </div>
        );
    };

    const runSimulation = async (simulateSuccess: boolean) => {
        setError(null);

        // Form Validation Checks
        if (method !== 'card') {
            const cleanedPhone = phoneNumber.replace(/\D/g, '');
            // Accept standard Guinea phone number lengths (9 digits local, 12 digits with 224 country code)
            if (cleanedPhone.length < 9) {
                setError("Veuillez saisir un numéro de téléphone mobile guinéen valide à 9 chiffres (ex: 611 29 68 29).");
                return;
            }
        } else {
            if (!cardDetails.name.trim()) {
                setError("Veuillez saisir le nom figurant sur la carte.");
                return;
            }
            const cleanedCard = cardDetails.number.replace(/\D/g, '');
            if (cleanedCard.length !== 16) {
                setError("Veuillez saisir un numéro de carte valide à 16 chiffres.");
                return;
            }
            if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiry)) {
                setError("La date d'expiration doit être au format MM/AA (ex: 12/28).");
                return;
            }
            const cleanedCvv = cardDetails.cvv.replace(/\D/g, '');
            if (cleanedCvv.length !== 3) {
                setError("Le code CVV doit contenir exactement 3 chiffres.");
                return;
            }
        }

        setStep('processing');
        setLoading(true);

        // Simulated steps during processing (total 5 seconds)
        const steps = [
            'Sécurisation du tunnel de paiement...',
            method === 'card' 
                ? 'Vérification 3D Secure sécurisée...' 
                : 'Initialisation de la passerelle Mobile Money...',
            'Vérification du solde du compte et autorisation...',
            method === 'card' 
                ? 'Approbation du réseau bancaire (Visa/Mastercard)...' 
                : `Attente d'approbation par l'opérateur (${getMethodLabel(method!)})...`,
            'Génération de la clé de transaction cryptée...',
            'Finalisation et synchronisation du profil...'
        ];

        let stepIdx = 0;
        setStatusMessage(steps[0]);
        const interval = setInterval(() => {
            if (stepIdx < steps.length - 1) {
                stepIdx++;
                setStatusMessage(steps[stepIdx]);
            }
        }, 800);

        try {
            const res = await paymentService.createCheckoutSession(userId, method!, options, simulateSuccess);
            clearInterval(interval);

            if (res.success) {
                // Play success sound
                audioService.playSuccess?.();
                
                // Fire beautiful confetti
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
                });

                onSuccess(res.transactionId!);
                onClose();
            } else {
                setError(res.error || 'Erreur inattendue.');
                setStep('form');
            }
        } catch (e: any) {
            clearInterval(interval);
            setError(e.message || 'La transaction a échoué.');
            setStep('form');
        } finally {
            setLoading(false);
        }
    };

    const getMethodStyles = (m: PaymentMethod) => {
        switch (m) {
            case 'orange_money': return 'border-orange-500/20 hover:border-orange-500 bg-orange-950/5 text-orange-400 hover:bg-orange-950/10 shadow-sm';
            case 'wave': return 'border-blue-500/20 hover:border-blue-500 bg-blue-950/5 text-blue-400 hover:bg-blue-950/10 shadow-sm';
            case 'mtn_money': return 'border-yellow-500/20 hover:border-yellow-500 bg-yellow-950/5 text-yellow-500 hover:bg-yellow-950/10 shadow-sm';
            case 'moov_money': return 'border-emerald-500/20 hover:border-emerald-500 bg-emerald-950/5 text-emerald-400 hover:bg-emerald-950/10 shadow-sm';
            case 'card': return 'border-slate-800 hover:border-slate-600 bg-slate-900/30 text-slate-300 hover:bg-slate-900/50 shadow-sm';
        }
    };

    const getMethodLabel = (m: PaymentMethod) => {
        switch (m) {
            case 'orange_money': return 'Orange Money';
            case 'wave': return 'Wave';
            case 'mtn_money': return 'MTN MoMo';
            case 'moov_money': return 'Moov Money';
            case 'card': return 'Carte Bancaire';
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-md overflow-hidden border border-slate-800 bg-slate-900 text-white rounded-[2rem] shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 p-6">
                        <div className="flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-blue-400" />
                            <h3 className="font-display font-black text-lg tracking-tight uppercase">Passerelle de Simulation</h3>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Summary of Achat */}
                        <div className="mb-6 rounded-2xl bg-slate-950 p-4 border border-slate-800 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-black text-slate-500">Total à payer</p>
                                <p className="text-2xl font-display font-black text-blue-400">{options.amount.toLocaleString()} FG</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase tracking-wider font-black text-slate-500">Produit</p>
                                <p className="text-sm font-black text-white capitalize">
                                    {options.type === 'premium' ? `Plan ${options.duration}` : `${options.quantity} LevelCoins`}
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 flex gap-3 p-4 border border-red-500/20 bg-red-950/20 text-red-400 rounded-2xl text-xs font-bold leading-relaxed">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        {step === 'select' && (
                            <div>
                                <p className="text-xs uppercase tracking-widest text-slate-400 mb-4 font-black">Choisissez votre moyen de paiement :</p>
                                <div className="grid grid-cols-1 gap-3">
                                    {(['wave', 'orange_money', 'mtn_money', 'moov_money', 'card'] as PaymentMethod[]).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => handleMethodSelect(m)}
                                            className={`flex items-center justify-between w-full p-4 border rounded-2xl font-black transition-all ${getMethodStyles(m)}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                {renderLogo(m)}
                                                <span className="text-sm tracking-tight">{getMethodLabel(m)}</span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors">Simuler</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 'form' && method && (
                            <div>
                                <button
                                    onClick={() => setStep('select')}
                                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold mb-4 block"
                                >
                                    ← Choisir un autre moyen
                                </button>
                                <p className="text-sm text-slate-300 mb-4 font-medium">
                                    Saisie des informations de simulation pour **{getMethodLabel(method)}** :
                                </p>

                                {method !== 'card' ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Numéro de téléphone mobile</label>
                                            <input
                                                type="tel"
                                                placeholder="Ex: +224 611 29 68 29"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-semibold"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Nom sur la carte</label>
                                            <input
                                                type="text"
                                                placeholder="Jean Dupont"
                                                value={cardDetails.name}
                                                onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Numéro de carte bancaire</label>
                                            <input
                                                type="text"
                                                placeholder="4000 1234 5678 9010"
                                                value={cardDetails.number}
                                                onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-semibold"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Expiration</label>
                                                <input
                                                    type="text"
                                                    placeholder="MM/AA"
                                                    value={cardDetails.expiry}
                                                    onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-semibold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">CVV</label>
                                                <input
                                                    type="text"
                                                    placeholder="123"
                                                    value={cardDetails.cvv}
                                                    onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-semibold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="mt-6 grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => runSimulation(true)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                                    >
                                        Simuler un Succès de Paiement
                                    </button>
                                    <button
                                        onClick={() => runSimulation(false)}
                                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-red-900/20"
                                    >
                                        Simuler un Échec
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'processing' && (
                            <div className="py-10 flex flex-col items-center justify-center text-center">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                <p className="font-semibold text-lg text-white mb-2">{statusMessage}</p>
                                <p className="text-xs text-slate-400">Ne fermez pas l'application pendant la transaction.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer security badge */}
                    <div className="border-t border-slate-800 bg-slate-950/40 p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Paiement démo crypté et simulé en local</span>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
