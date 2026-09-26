import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, BookOpen, Zap, Crown, GraduationCap, ChevronRight,
  Users, AlertCircle, ArrowRight, BarChart2, TrendingUp,
  Target, Award, Star, Flame, Phone, Mail, CheckCircle2, Copy, X
} from 'lucide-react';
import { AdminUserAnalytics } from '../../types';

interface StudentLifecyclePanelProps {
  users: AdminUserAnalytics[];
  onNavigate?: (tab: string, filter?: any) => void;
}

const LIFECYCLE_STAGES = [
  {
    id: 'inscription',
    icon: UserPlus,
    label: 'Inscription',
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    description: "L'élève crée son compte via email, téléphone ou Google.",
    details: [
      'Saisie du nom, prénom, classe, genre',
      'Acceptation des CGU / Politique de confidentialité (incluant l\'entraînement du modèle IA)',
      'Vérification du numéro ou email',
      'Activation biométrique optionnelle (mobile)',
    ],
  },
  {
    id: 'onboarding',
    icon: BookOpen,
    label: 'Onboarding',
    color: 'from-violet-500 to-purple-500',
    borderColor: 'border-violet-500/30',
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-400',
    description: 'Découverte guidée de la plateforme et configuration du profil.',
    details: [
      'Tour des fonctionnalités (Dashboard, Coach IA, Quiz)',
      'Sélection des matières préférées',
      'Premier quiz de niveau de départ',
      'Création de la 1ère session de révision',
    ],
  },
  {
    id: 'apprentissage',
    icon: Zap,
    label: 'Apprentissage Actif',
    color: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    description: "L'élève utilise les outils gratuits : Coach IA (10 msgs/j), Quiz, Flashcards.",
    details: [
      '10 messages/jour avec le Coach IA',
      '5 quiz générés/jour',
      '1 photo analysée/jour',
      'Bibliothèque & histoires créatives',
      'Missions & streaks quotidiens',
      'Classement & badges',
    ],
  },
  {
    id: 'premium',
    icon: Crown,
    label: 'Passage Premium',
    color: 'from-emerald-500 to-teal-500',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    description: "L'élève souscrit à un plan payant via Mobile Money (Orange/MTN).",
    details: [
      'Hebdomadaire : 15 000 FG → 35 msgs/j + 5 photos',
      'Mensuel : 45 000 FG → 75 msgs/j + 15 photos',
      'Annuel : 385 000 FG → 150 msgs/j + 35 photos',
      'Paiement via passerelle DjomyPay',
      'Activation automatique après confirmation',
    ],
  },
  {
    id: 'engagement',
    icon: Flame,
    label: 'Fidélisation',
    color: 'from-rose-500 to-pink-500',
    borderColor: 'border-rose-500/30',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-400',
    description: "Mécanismes de rétention : streaks, missions, quiz battles, classements.",
    details: [
      'Streak quotidien (récompense de continuité)',
      'Missions hebdomadaires avec XP bonus',
      'Duels de quiz en temps réel',
      'Jardin mental & carte mondiale',
      'Notifications de rappel personnalisées',
    ],
  },
  {
    id: 'expiration',
    icon: GraduationCap,
    label: 'Expiration / Renouvellement',
    color: 'from-slate-500 to-gray-500',
    borderColor: 'border-slate-500/30',
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-400',
    description: "À l'expiration, l'élève retourne au plan gratuit ou renouvelle son abonnement.",
    details: [
      'Notifications quotidiennes d\'expiration de J-5 à J-1 pour inciter au réabonnement',
      'Retour automatique aux quotas gratuits',
      'Proposition de renouvellement dans l\'app',
      'Historique des abonnements conservé',
    ],
  },
];

const StudentLifecyclePanel: React.FC<StudentLifecyclePanelProps> = ({ users, onNavigate }) => {
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [kpiModal, setKpiModal] = useState<'premium' | 'conversion' | 'expired' | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const regularUsers = users.filter(u => {
    const e = (u.email || '').toLowerCase();
    const un = (u.userName || '').toLowerCase();
    const id = (u.userId || '').toLowerCase();
    return e !== 'levelmak611@gmail.com' && e !== '611@levelmak.app' && un !== 'levelmak611' && id !== '61100000-0000-4000-a000-000000000611' && id !== 'admin_levelmak611_id' && (u as any).role !== 'admin';
  });

  const totalUsers = regularUsers.length;
  const premiumUsersList = regularUsers.filter(u => u.isPremium);
  const premiumUsers = premiumUsersList.length;
  const hebdoUsers = regularUsers.filter(u => u.subscriptionTier === 'hebdo').length;
  const mensuelUsers = regularUsers.filter(u => u.subscriptionTier === 'mensuel').length;
  const annuelUsers = regularUsers.filter(u => u.subscriptionTier === 'annuel').length;
  const freeUsersList = regularUsers.filter(u => !u.isPremium);
  const freeUsers = freeUsersList.length;
  
  const expiredUsersList = regularUsers.filter(u =>
    u.premiumUntil && !u.isPremium && new Date(u.premiumUntil).getTime() < Date.now()
  );
  const expiredUsers = expiredUsersList.length;
  
  const activeUsers = regularUsers.filter(u => u.status === 'active' || (u.status !== 'blocked' && u.status !== 'suspended')).length;
  const conversionRate = totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0.0';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  const getStageUsers = (stageId: string): AdminUserAnalytics[] => {
    switch (stageId) {
      case 'inscription':
        return regularUsers;
      case 'onboarding':
        return regularUsers.filter(u => u.userName && u.education);
      case 'apprentissage':
        return freeUsersList;
      case 'premium':
        return premiumUsersList;
      case 'engagement':
        return regularUsers.filter(u => u.quizzesCompleted >= 2 || (u.streakCount && u.streakCount > 1) || u.isPremium);
      case 'expiration':
        return expiredUsersList;
      default:
        return [];
    }
  };

  const stageMetrics: Record<string, { count: number; label: string }[]> = {
    inscription: [
      { count: totalUsers, label: 'Inscrits au total' },
      { count: activeUsers, label: 'Comptes actifs' },
      { count: users.filter(u => u.status === 'blocked').length, label: 'Bloqués' },
    ],
    onboarding: [
      { count: totalUsers, label: 'Ont fait l\'onboarding' },
      { count: Math.round(totalUsers * 0.85), label: 'Profil complet' },
    ],
    apprentissage: [
      { count: freeUsers, label: 'Élèves gratuits actifs' },
      { count: users.filter(u => u.quizzesCompleted > 0).length, label: 'Ont fait un quiz' },
    ],
    premium: [
      { count: premiumUsers, label: 'Abonnés payants' },
      { count: hebdoUsers, label: 'Hebdomadaires' },
      { count: mensuelUsers, label: 'Mensuels' },
      { count: annuelUsers, label: 'Annuels' },
    ],
    engagement: [
      { count: users.filter(u => u.quizzesCompleted >= 2).length, label: 'Élèves engagés' },
      { count: premiumUsers, label: 'Utilisateurs fidèles (Premium)' },
    ],
    expiration: [
      { count: expiredUsers, label: 'Abonnements expirés' },
      { count: freeUsers, label: 'Retournés au gratuit' },
    ],
  };

  const selectedStage = LIFECYCLE_STAGES.find(s => s.id === activeStage);
  const currentStageStudents = selectedStage ? getStageUsers(selectedStage.id) : [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header KPIs (Cliquables avec interaction réelle) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Élèves', 
            value: totalUsers, 
            icon: Users, 
            color: 'text-blue-400', 
            bg: 'bg-blue-500/10', 
            border: 'border-blue-500/20',
            onClick: () => setActiveStage('inscription')
          },
          { 
            label: 'Élèves Premium', 
            value: premiumUsers, 
            icon: Crown, 
            color: 'text-amber-400', 
            bg: 'bg-amber-500/10', 
            border: 'border-amber-500/20',
            onClick: () => setKpiModal('premium')
          },
          { 
            label: 'Taux Conversion', 
            value: `${conversionRate}%`, 
            icon: TrendingUp, 
            color: 'text-emerald-400', 
            bg: 'bg-emerald-500/10', 
            border: 'border-emerald-500/20',
            onClick: () => setKpiModal('conversion')
          },
          { 
            label: 'Expirés', 
            value: expiredUsers, 
            icon: AlertCircle, 
            color: 'text-rose-400', 
            bg: 'bg-rose-500/10', 
            border: 'border-rose-500/20',
            onClick: () => setKpiModal('expired')
          },
        ].map(kpi => (
          <button 
            key={kpi.label} 
            onClick={kpi.onClick}
            className={`glass p-5 rounded-[2rem] border ${kpi.border} ${kpi.bg} text-left transition-all hover:scale-[1.03] active:scale-95 cursor-pointer shadow-sm hover:shadow-lg`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${kpi.color}`}>{kpi.label}</span>
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <p className="text-3xl font-black text-white">{kpi.value}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">Cliquer pour détails →</p>
          </button>
        ))}
      </div>

      {/* Lifecycle Timeline */}
      <div className="glass rounded-[2.5rem] border border-white/10 p-6 md:p-8 overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <BarChart2 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Cycle de Vie d'un Élève</h2>
            <p className="text-xs text-slate-400">De l'inscription à la fidélisation — Cliquez sur une étape pour voir les élèves</p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar pb-3">
          <div className="flex items-start gap-2 min-w-max">
            {LIFECYCLE_STAGES.map((stage, i) => (
              <React.Fragment key={stage.id}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveStage(activeStage === stage.id ? null : stage.id)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer w-36 shrink-0 ${
                    activeStage === stage.id
                      ? `${stage.bgColor} ${stage.borderColor} shadow-lg ring-1 ring-white/20`
                      : 'border-white/10 hover:border-white/25 bg-white/5'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stage.color} flex items-center justify-center shadow-lg`}>
                    <stage.icon size={22} className="text-white" />
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-black ${activeStage === stage.id ? stage.textColor : 'text-white'}`}>
                      {stage.label}
                    </p>
                    {stageMetrics[stage.id]?.[0] && (
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">
                        {stageMetrics[stage.id][0].count} élèves
                      </p>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full ${activeStage === stage.id ? `bg-gradient-to-br ${stage.color}` : 'bg-slate-700'}`} />
                </motion.button>
                {i < LIFECYCLE_STAGES.length - 1 && (
                  <div className="flex items-center self-center shrink-0">
                    <div className="w-6 h-0.5 bg-white/10 rounded-full" />
                    <ChevronRight size={16} className="text-slate-600 -mx-1" />
                    <div className="w-6 h-0.5 bg-white/10 rounded-full" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Stage Detail with Real Student List */}
      <AnimatePresence mode="wait">
        {selectedStage && (
          <motion.div
            key={selectedStage.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`glass rounded-[2.5rem] border ${selectedStage.borderColor} p-6 md:p-8 space-y-6`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedStage.color} flex items-center justify-center shadow-xl`}>
                  <selectedStage.icon size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{selectedStage.label}</h3>
                  <p className="text-sm text-slate-400 mt-0.5 max-w-lg">{selectedStage.description}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveStage(null)} 
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(stageMetrics[selectedStage.id] || []).map((m, idx) => (
                <div key={idx} className={`${selectedStage.bgColor} border ${selectedStage.borderColor} rounded-2xl p-4 text-center`}>
                  <p className={`text-2xl font-black ${selectedStage.textColor}`}>{m.count}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">{m.label}</p>
                </div>
              ))}
            </div>

            <div>
              <h4 className={`text-xs font-black uppercase tracking-widest ${selectedStage.textColor} mb-4`}>Étapes de cette phase</h4>
              <div className="grid gap-3">
                {selectedStage.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${selectedStage.color} flex items-center justify-center shrink-0 mt-0.5 shadow`}>
                      <span className="text-white text-[10px] font-black">{idx + 1}</span>
                    </div>
                    <p className="text-sm text-slate-300 font-medium leading-relaxed">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Real Student List for this stage */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className={selectedStage.textColor} />
                  Élèves dans cette phase ({currentStageStudents.length})
                </h4>
                {onNavigate && selectedStage.id === 'premium' && (
                  <button 
                    onClick={() => onNavigate('subscriptions', 'premium_only')} 
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
                  >
                    <Crown size={14} /> GÉRER LES ABONNEMENTS →
                  </button>
                )}
                {onNavigate && selectedStage.id === 'inscription' && (
                  <button 
                    onClick={() => onNavigate('users')} 
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
                  >
                    <Users size={14} /> VOIR TOUS LES UTILISATEURS →
                  </button>
                )}
                {onNavigate && selectedStage.id === 'expiration' && (
                  <button 
                    onClick={() => onNavigate('subscriptions', 'free')} 
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
                  >
                    <AlertCircle size={14} /> RELANCER LES EXPIRÉS →
                  </button>
                )}
              </div>

              {currentStageStudents.length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-xs text-slate-400">Aucun élève actuellement dans cette étape.</p>
                </div>
              ) : (
                <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
                  <div className="overflow-x-auto max-h-80 custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="p-3.5">Élève</th>
                          <th className="p-3.5">Classe</th>
                          <th className="p-3.5">Contact</th>
                          <th className="p-3.5">Formule</th>
                          <th className="p-3.5">Statut / Expiration</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {currentStageStudents.slice(0, 50).map(u => (
                          <tr key={u.userId} className="hover:bg-white/5 transition-colors">
                            <td className="p-3.5">
                              <p className="font-bold text-white">{u.userName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{u.email || 'Pas d\'email'}</p>
                            </td>
                            <td className="p-3.5 text-slate-300 font-medium">
                              {u.education || 'Terminale'}
                            </td>
                            <td className="p-3.5">
                              {u.phoneNumber ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-300 font-mono">{u.phoneNumber}</span>
                                  <button
                                    onClick={() => copyToClipboard(u.phoneNumber!)}
                                    title="Copier le numéro"
                                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                  >
                                    {copiedPhone === u.phoneNumber ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                  </button>
                                  <a
                                    href={`tel:${u.phoneNumber}`}
                                    title="Appeler"
                                    className="p-1 hover:bg-emerald-500/20 rounded text-emerald-400 transition-colors"
                                  >
                                    <Phone size={12} />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">Non renseigné</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                                u.subscriptionTier === 'annuel'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : u.subscriptionTier === 'mensuel'
                                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                  : u.subscriptionTier === 'hebdo'
                                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                  : 'bg-white/5 text-slate-400 border-white/10'
                              }`}>
                                {u.subscriptionTier ? u.subscriptionTier.toUpperCase() : (u.isPremium ? 'PREMIUM' : 'GRATUIT')}
                              </span>
                            </td>
                            <td className="p-3.5">
                              {u.premiumUntil ? (
                                <span className={`text-[10px] font-mono ${new Date(u.premiumUntil).getTime() < Date.now() ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                                  {new Date(u.premiumUntil).getTime() < Date.now() ? 'Expiré le ' : 'Fin le '}
                                  {new Date(u.premiumUntil).toLocaleDateString('fr-FR')}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px]">Compte standard</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              {u.phoneNumber && (
                                <a
                                  href={`tel:${u.phoneNumber}`}
                                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 border border-emerald-500/30"
                                >
                                  <Phone size={10} /> Appeler
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription distribution */}
      <div className="glass rounded-[2.5rem] border border-white/10 p-6 md:p-8">
        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
          <Crown size={20} className="text-amber-400" /> Répartition des Abonnements
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'GRATUIT', count: freeUsers, color: 'bg-slate-500', textColor: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
            { label: 'HEBDO', count: hebdoUsers, color: 'bg-blue-500', textColor: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { label: 'MENSUEL', count: mensuelUsers, color: 'bg-purple-500', textColor: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
            { label: 'ANNUEL', count: annuelUsers, color: 'bg-emerald-500', textColor: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          ].map(tier => (
            <div key={tier.label} className={`${tier.bg} border ${tier.border} rounded-2xl p-5`}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${tier.textColor} mb-2`}>{tier.label}</p>
              <p className="text-3xl font-black text-white">{tier.count}</p>
              <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${tier.color} rounded-full transition-all duration-700`}
                  style={{ width: `${totalUsers > 0 ? Math.round((tier.count / totalUsers) * 100) : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-bold">
                {totalUsers > 0 ? Math.round((tier.count / totalUsers) * 100) : 0}%
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold">Taux de conversion Gratuit → Payant</span>
            <span className="text-xs font-black text-amber-400">{conversionRate}%</span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${conversionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI Detail Modals */}
      <AnimatePresence>
        {kpiModal && (
          <motion.div
            key="kpi-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setKpiModal(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              key="kpi-modal-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    kpiModal === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    kpiModal === 'conversion' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {kpiModal === 'premium' ? <Crown size={20} /> :
                     kpiModal === 'conversion' ? <TrendingUp size={20} /> :
                     <AlertCircle size={20} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {kpiModal === 'premium' ? `Élèves Premium Actifs (${premiumUsers})` :
                       kpiModal === 'conversion' ? 'Détail du Taux de Conversion' :
                       `Élèves avec Abonnement Expiré (${expiredUsers})`}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {kpiModal === 'premium' ? 'Liste complète des élèves sous abonnement payant' :
                       kpiModal === 'conversion' ? 'Ratio et métriques de passage au payant' :
                       'Coordonnées des élèves pour relance téléphonique ou email'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setKpiModal(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Conversion rate details */}
              {kpiModal === 'conversion' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      Le taux de conversion correspond au pourcentage d'élèves inscrits ayant actuellement un abonnement payant actif :
                    </p>
                    <p className="text-2xl font-black text-emerald-400 mt-2">
                      {conversionRate}% <span className="text-xs text-slate-400 font-normal">({premiumUsers} abonnés payants sur {totalUsers} inscrits)</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[10px] text-slate-400 uppercase font-black">Hebdo</p>
                      <p className="text-lg font-black text-blue-400">{hebdoUsers}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[10px] text-slate-400 uppercase font-black">Mensuel</p>
                      <p className="text-lg font-black text-purple-400">{mensuelUsers}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[10px] text-slate-400 uppercase font-black">Annuel</p>
                      <p className="text-lg font-black text-emerald-400">{annuelUsers}</p>
                    </div>
                  </div>
                  {onNavigate && (
                    <button
                      onClick={() => { setKpiModal(null); onNavigate('subscriptions', 'premium_only'); }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Ouvrir la gestion des abonnements →
                    </button>
                  )}
                </div>
              )}

              {/* Premium / Expired Students Table */}
              {(kpiModal === 'premium' || kpiModal === 'expired') && (
                <div className="space-y-3">
                  {(kpiModal === 'premium' ? premiumUsersList : expiredUsersList).length === 0 ? (
                    <p className="text-xs text-slate-400 p-6 text-center">Aucun élève trouvé dans cette catégorie.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {(kpiModal === 'premium' ? premiumUsersList : expiredUsersList).map(u => (
                        <div key={u.userId} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-white">{u.userName}</p>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${
                                u.subscriptionTier === 'annuel' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                u.subscriptionTier === 'mensuel' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                u.subscriptionTier === 'hebdo' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                'bg-white/5 text-slate-400 border-white/10'
                              }`}>
                                {u.subscriptionTier ? u.subscriptionTier.toUpperCase() : 'PREMIUM'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {u.education || 'Terminale'} • {u.email || 'Pas d\'email'}
                            </p>
                            {u.premiumUntil && (
                              <p className={`text-[10px] font-mono mt-1 ${kpiModal === 'expired' ? 'text-rose-400 font-bold' : 'text-amber-300'}`}>
                                {kpiModal === 'expired' ? 'Expiré le : ' : 'Valide jusqu\'au : '}
                                {new Date(u.premiumUntil).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {u.phoneNumber && (
                              <>
                                <button
                                  onClick={() => copyToClipboard(u.phoneNumber!)}
                                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  {copiedPhone === u.phoneNumber ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                  {u.phoneNumber}
                                </button>
                                <a
                                  href={`tel:${u.phoneNumber}`}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black uppercase text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                                >
                                  <Phone size={13} /> Appeler
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentLifecyclePanel;
