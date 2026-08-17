import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Lock, Ban, LogOut, Phone, Mail, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../hooks/store/useAuthStore';

interface BlockedAccountModalProps {
    status: 'blocked' | 'suspended' | string;
    onLogout?: () => void;
}

export const BlockedAccountModal: React.FC<BlockedAccountModalProps> = ({ status, onLogout }) => {
    const { logout } = useAuthStore();
    const isBlocked = status === 'blocked';

    const handleLogout = async () => {
        if (onLogout) {
            onLogout();
        } else {
            await logout();
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-[#050b18] flex items-center justify-center p-4 sm:p-6 overflow-y-auto select-none">
            {/* Background glowing ambient effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[100px] opacity-30 ${isBlocked ? 'bg-red-600' : 'bg-orange-500'}`} />
                <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-600/20 rounded-full blur-[90px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md bg-slate-900/90 border border-white/15 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.8)] text-center space-y-6 z-10"
            >
                {/* Icon Banner */}
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-3xl animate-pulse blur-md ${isBlocked ? 'bg-red-500/30' : 'bg-orange-500/30'}`} />
                    <div className={`relative w-20 h-20 rounded-3xl border-2 flex items-center justify-center shadow-2xl ${
                        isBlocked 
                            ? 'bg-red-950/60 border-red-500/60 text-red-400 shadow-red-500/20' 
                            : 'bg-orange-950/60 border-orange-500/60 text-orange-400 shadow-orange-500/20'
                    }`}>
                        {isBlocked ? <Lock size={42} strokeWidth={2.5} /> : <Ban size={42} strokeWidth={2.5} />}
                    </div>
                </div>

                {/* Title and Message */}
                <div className="space-y-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        isBlocked 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    }`}>
                        {isBlocked ? 'Accès Verrouillé Definitivement' : 'Compte Momentanément Suspendu'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                        {isBlocked ? 'Compte Bloqué' : 'Compte Suspendu'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed pt-2">
                        {isBlocked
                            ? "Votre compte a été bloqué par l'administration pour non-respect des conditions d'utilisation de LEVELMAK PRO. L'accès à la plateforme vous est désormais restreint."
                            : "Votre compte est actuellement suspendu. Si vous pensez qu'il s'agit d'une erreur ou pour lever cette suspension, veuillez contacter le support administratif."
                        }
                    </p>
                </div>

                {/* Support Box */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <HelpCircle size={14} className="text-blue-400" />
                        Besoin d'assistance ?
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                        Contactez notre équipe de modération via email ou téléphone pour toute réclamation.
                    </p>
                    <div className="pt-1 flex flex-col gap-1 text-xs text-white font-mono font-bold">
                        <div className="flex items-center gap-2">
                            <Mail size={12} className="text-blue-400" />
                            <span>support@levelmak.com</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone size={12} className="text-emerald-400" />
                            <span>+224 611 00 00 00 / TMAB Group</span>
                        </div>
                    </div>
                </div>

                {/* Exit / Logout Action */}
                <button
                    onClick={handleLogout}
                    className="w-full py-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95"
                >
                    <LogOut size={16} />
                    Se Déconnecter de l'Application
                </button>
            </motion.div>
        </div>
    );
};

export default BlockedAccountModal;
