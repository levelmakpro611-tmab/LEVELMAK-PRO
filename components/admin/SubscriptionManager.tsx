import React, { useState } from 'react';
import { 
  Crown, 
  Search, 
  Filter, 
  Calendar, 
  Zap, 
  Gift, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  User as UserIcon, 
  Sparkles, 
  TrendingUp, 
  X, 
  RefreshCw,
  Phone,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminUserAnalytics } from '../../types';
import { grantSubscriptionBonus, grantQuotaBoost, updateUserStatusAdmin } from '../../services/adminService';

interface SubscriptionManagerProps {
  users: AdminUserAnalytics[];
  onRefresh: () => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ users, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'all' | 'free' | 'hebdo' | 'mensuel' | 'annuel'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserAnalytics | null>(null);
  
  // Action Modal State
  const [bonusDays, setBonusDays] = useState<number>(7);
  const [targetTier, setTargetTier] = useState<'hebdo' | 'mensuel' | 'annuel'>('mensuel');
  const [boostMessages, setBoostMessages] = useState<number>(20);
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Computed Stats
  const totalUsersCount = users.length;
  const activeSubscribedCount = users.filter(u => u.isPremium || u.subscriptionTier !== 'free').length;
  const hebdoCount = users.filter(u => u.subscriptionTier === 'hebdo').length;
  const mensuelCount = users.filter(u => u.subscriptionTier === 'mensuel').length;
  const annuelCount = users.filter(u => u.subscriptionTier === 'annuel').length;

  // Filtered User list
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.phoneNumber || '').includes(searchTerm) ||
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (selectedTierFilter === 'all') return true;
    if (selectedTierFilter === 'free') return u.subscriptionTier === 'free' || !u.subscriptionTier;
    return u.subscriptionTier === selectedTierFilter;
  });

  const handleApplyBonusDays = async () => {
    if (!selectedUser) return;
    setLoadingAction(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      const res = await grantSubscriptionBonus({
        targetUserId: selectedUser.userId,
        bonusDays,
        tier: targetTier,
        reason: `Bonus Administrateur Levelmak (+${bonusDays} jours)`
      });

      if (res && res.success) {
        const newExpiry = res.newExpiry;
        const formattedExpiry = newExpiry
          ? new Date(newExpiry).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '';
        setActionSuccessMsg(`✅ +${bonusDays} jour(s) accordé(s) à ${selectedUser.userName} (${targetTier.toUpperCase()}). Expiration : ${formattedExpiry}`);
        // Immediately update local state so the table refreshes without waiting
        setSelectedUser(prev => prev ? {
          ...prev,
          isPremium: true,
          premiumUntil: newExpiry,
          subscriptionTier: targetTier
        } : null);
        // Double refresh: immediate + after 2s to allow DB propagation
        onRefresh();
        setTimeout(() => onRefresh(), 2000);
      } else {
        setActionErrorMsg(res?.message || "Erreur lors de l'attribution du bonus");
        onRefresh();
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || "Erreur lors de l'attribution du bonus");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleApplyQuotaBoost = async () => {
    if (!selectedUser) return;
    setLoadingAction(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      const res = await grantQuotaBoost({
        targetUserId: selectedUser.userId,
        boostMessages
      });

      if (res && res.success) {
        setActionSuccessMsg(`Boost de +${boostMessages} msgs/jour accordé à ${selectedUser.userName}.`);
        setSelectedUser(prev => prev ? {
          ...prev,
          adminMessageBoost: (prev.adminMessageBoost || 0) + boostMessages
        } : null);
      } else {
        setActionErrorMsg(res?.message || "Erreur lors de l'attribution du boost");
      }
      onRefresh();
    } catch (err: any) {
      setActionErrorMsg(err.message || "Erreur lors de l'attribution du boost");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleStatus = async (newStatus: 'active' | 'suspended' | 'blocked') => {
    if (!selectedUser) return;
    setLoadingAction(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      const res = await updateUserStatusAdmin(selectedUser.userId, newStatus);
      if (res && res.success) {
        setActionSuccessMsg(`Statut de ${selectedUser.userName} mis à jour : ${newStatus.toUpperCase()}`);
      } else {
        setActionErrorMsg(res?.message || "Erreur lors de la modification du statut");
      }
      onRefresh();
    } catch (err: any) {
      setActionErrorMsg(err.message || "Erreur lors de la modification du statut");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          onClick={() => setSelectedTierFilter('all')}
          className={`glass p-6 rounded-[2rem] border text-left transition-all duration-300 relative overflow-hidden group hover:scale-[1.02] active:scale-95 cursor-pointer ${
            selectedTierFilter === 'all'
              ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
              : 'border-white/10 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-amber-400 transition-colors">Total Abonnés Payants</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Crown size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{activeSubscribedCount}</span>
            <span className="text-xs text-slate-400 font-bold">/ {totalUsersCount} élèves</span>
          </div>
          <p className="text-[10px] text-amber-400 font-medium">
            Taux de conversion : {totalUsersCount > 0 ? Math.round((activeSubscribedCount / totalUsersCount) * 100) : 0}% (Cliquer pour filtrer)
          </p>
        </button>

        <button
          onClick={() => setSelectedTierFilter('hebdo')}
          className={`glass p-6 rounded-[2rem] border text-left transition-all duration-300 relative overflow-hidden group hover:scale-[1.02] active:scale-95 cursor-pointer ${
            selectedTierFilter === 'hebdo'
              ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
              : 'border-white/10 hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-400 transition-colors">Plan Hebdomadaire</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Calendar size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{hebdoCount}</span>
            <span className="text-xs text-blue-400 font-bold">15 000 FG/sem</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">35 msgs/jour • 5 photos (Cliquer pour filtrer)</p>
        </button>

        <button
          onClick={() => setSelectedTierFilter('mensuel')}
          className={`glass p-6 rounded-[2rem] border text-left transition-all duration-300 relative overflow-hidden group hover:scale-[1.02] active:scale-95 cursor-pointer ${
            selectedTierFilter === 'mensuel'
              ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
              : 'border-white/10 hover:border-purple-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-purple-400 transition-colors">Plan Mensuel</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{mensuelCount}</span>
            <span className="text-xs text-purple-400 font-bold">45 000 FG/mois</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">75 msgs/jour • 15 photos (Cliquer pour filtrer)</p>
        </button>

        <button
          onClick={() => setSelectedTierFilter('annuel')}
          className={`glass p-6 rounded-[2rem] border text-left transition-all duration-300 relative overflow-hidden group hover:scale-[1.02] active:scale-95 cursor-pointer ${
            selectedTierFilter === 'annuel'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
              : 'border-white/10 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Plan Annuel (VIP)</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{annuelCount}</span>
            <span className="text-xs text-emerald-400 font-bold">385 000 FG/an</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">150 msgs/jour • 35 photos (Cliquer pour filtrer)</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass p-4 rounded-3xl border border-white/10">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, téléphone, email..."
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-xs outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Tier Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1 md:pb-0">
          {(['all', 'free', 'hebdo', 'mensuel', 'annuel'] as const).map(tier => (
            <button
              key={tier}
              onClick={() => setSelectedTierFilter(tier)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                selectedTierFilter === tier
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-glow-amber'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tier === 'all' ? 'Tous' : tier === 'free' ? 'Gratuit' : tier.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/60 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-5">Élève / Utilisateur</th>
                <th className="p-5">Classe</th>
                <th className="p-5">Abonnement Actuel</th>
                <th className="p-5">Expiration</th>
                <th className="p-5">Boosts Quota</th>
                <th className="p-5 text-right">Actions Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-bold">
                    Aucun utilisateur trouvé pour ces critères.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.userId} className="hover:bg-white/5 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center font-black text-amber-400 shrink-0">
                          {user.userName?.charAt(0)?.toUpperCase() || 'E'}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{user.userName}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <Phone size={10} /> {user.phoneNumber || user.email || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-5">
                      <span className="px-3 py-1 bg-white/5 rounded-xl border border-white/10 text-[10px] font-bold text-blue-300">
                        {user.gradeClass || user.education || 'Terminale'}
                      </span>
                    </td>

                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                        user.subscriptionTier === 'annuel'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : user.subscriptionTier === 'mensuel'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : user.subscriptionTier === 'hebdo'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}>
                        <Crown size={12} />
                        {user.subscriptionTier ? user.subscriptionTier.toUpperCase() : 'GRATUIT'}
                      </span>
                    </td>

                    <td className="p-5">
                      {user.premiumUntil ? (
                        <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
                          new Date(user.premiumUntil).getTime() <= Date.now()
                            ? 'text-rose-400'
                            : 'text-amber-300'
                        }`}>
                          <Clock size={12} />
                          {new Date(user.premiumUntil).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          {new Date(user.premiumUntil).getTime() <= Date.now() && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded-md font-black border border-rose-500/30 uppercase tracking-wider">
                              Expiré
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-bold">Aucune</span>
                      )}
                    </td>

                    <td className="p-5">
                      {user.adminMessageBoost ? (
                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-black whitespace-nowrap inline-block">
                          +{user.adminMessageBoost} msgs/j
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px] font-bold">Standard</span>
                      )}
                    </td>

                    <td className="p-5 text-right">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setActionSuccessMsg(null);
                          setActionErrorMsg(null);
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-glow-amber active:scale-95"
                      >
                        Gérer & Offrir Bonus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Action Drawer / Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-2xl z-10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                    <Crown size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedUser.userName}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Classe : {selectedUser.gradeClass || 'Terminale'} • {selectedUser.phoneNumber || selectedUser.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Alert Messages */}
              {actionSuccessMsg && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              {actionErrorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert size={16} />
                  <span>{actionErrorMsg}</span>
                </div>
              )}

              {/* Action 1: Offer Bonus Subscription Days */}
              <div className="space-y-3 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Gift size={16} className="text-amber-400" />
                  1. Offrir des jours de Premium Bonus
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Jours Bonus</label>
                    <select
                      value={bonusDays}
                      onChange={(e) => setBonusDays(Number(e.target.value))}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white font-medium text-xs outline-none focus:border-slate-700 cursor-pointer"
                    >
                      <option value={1}>+1 jour (24h)</option>
                      <option value={2}>+2 jours (48h)</option>
                      <option value={7}>+7 jours (1 semaine)</option>
                      <option value={30}>+30 jours (1 mois)</option>
                      <option value={365}>+365 jours (1 an)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Niveau d'Abonnement</label>
                    <select
                      value={targetTier}
                      onChange={(e) => setTargetTier(e.target.value as any)}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white font-medium text-xs outline-none focus:border-slate-700 cursor-pointer"
                    >
                      <option value="hebdo">Hebdomadaire (35 msgs/j)</option>
                      <option value="mensuel">Mensuel (75 msgs/j)</option>
                      <option value="annuel">Annuel (150 msgs/j)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleApplyBonusDays}
                  disabled={loadingAction}
                  className="w-full py-3.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {loadingAction && <RefreshCw className="animate-spin" size={16} />}
                  ATTRIBUER LE BONUS PREMIUM
                </button>
              </div>

              {/* Action 2: Offer Quota Boost */}
              <div className="space-y-3 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={16} className="text-indigo-400" />
                  2. Booster le Quota IA Quotidien (+msgs/jour)
                </h4>

                <div className="flex gap-2">
                  {[10, 20, 50].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setBoostMessages(amt)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        boostMessages === amt
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      +{amt} msgs/j
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleApplyQuotaBoost}
                  disabled={loadingAction}
                  className="w-full py-3.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {loadingAction && <RefreshCw className="animate-spin" size={16} />}
                  ACTIVER LE BOOST (+{boostMessages} MSGS/J)
                </button>
              </div>

              {/* Action 3: Suspend / Block / Reactivate */}
              <div className="space-y-3 bg-red-500/5 p-5 rounded-2xl border border-red-500/10">
                <h4 className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert size={16} />
                  3. Gestion de Statut du Compte
                </h4>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleStatus('active')}
                    disabled={loadingAction}
                    className="flex-1 py-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                  >
                    RÉACTIVER
                  </button>

                  <button
                    onClick={() => handleToggleStatus('suspended')}
                    disabled={loadingAction}
                    className="flex-1 py-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                  >
                    SUSPENDRE
                  </button>

                  <button
                    onClick={() => handleToggleStatus('blocked')}
                    disabled={loadingAction}
                    className="flex-1 py-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                  >
                    BLOQUER
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubscriptionManager;
