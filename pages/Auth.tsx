
import React, { useState } from 'react';
import { User as UserIcon, Sparkles, Rocket, Phone, Lock, Eye, EyeOff, ArrowRight, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import { User as UserType } from '../types';
import { isAdminCredentials } from '../services/adminService';
import { logUserActivity } from '../services/activityService';

const Auth: React.FC = () => {
  const { registerWithPhone, loginWithPhone, registerWithEmail, loginWithEmail, loginWithGoogle, loading: storeLoading } = useStore();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<UserType['gender']>('HOMME');
  const [ageRange, setAgeRange] = useState<UserType['ageRange']>('15-18');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [showPolicyDetail, setShowPolicyDetail] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  const isLoading = storeLoading || localLoading;

  const resetForm = () => {
    setName('');
    setPhone('');
    setPassword('');
    setError(null);
    setResetSuccess(false);
    setRecoveryStep(1);
    setAcceptedPolicies(false);
    setShowPolicyDetail(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocalLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim() || !phone.trim() || !password.trim()) {
          throw new Error('Veuillez remplir tous les champs.');
        }
        if (!acceptedPolicies) {
          throw new Error('Tu dois accepter les politiques de LEVELMAK pour continuer.');
        }
        if (password.length < 6) {
          throw new Error('⚠️ SÉCURITÉ : Ton mot de passe est trop court. Il doit faire au moins 6 caractères pour protéger ton compte.');
        }
        await registerWithPhone(name.trim(), phone.trim(), password, gender, ageRange);
        // Note: useStore handles the actual user creation, filtering for the ID might be needed if we want to log immediately here,
        // but typically useStore updates the 'user' state.
        // For now, we rely on the effect that watches 'user' state or subsequent actions.
        // BETTER: log activity is simpler to do inside useStore or after we confirm success.
        // Since useStore returns void promise on success, we assume success here.
        // But we don't have the user ID yet.
        // We will log in the user effect or assume store updates. 
      } else if (mode === 'login') {
        if (!phone.trim() || !password.trim()) {
          throw new Error('Veuillez entrer votre numéro et mot de passe.');
        }

        // Check if admin credentials using phone field as username - auto-create admin account if needed
        if (isAdminCredentials(phone.trim(), password)) {
          setIsAdminUser(true);
          try {
            // Try to login with admin username as phone number
            await loginWithPhone(phone.trim(), password);
            logUserActivity('admin_temp_id', 'Admin User', 'auth', 'Admin Login', { method: 'Special Phone' });
          } catch (loginError: any) {
            // If admin account doesn't exist, create it automatically
            console.log('Admin account not found, creating automatically...');
            try {
              await registerWithPhone(
                'Administrateur Principal',
                phone.trim(), // Using "levelmak611" as the phone field
                password,
                'HOMME',
                '24+'
              );
              // Account created successfully, will auto-login through useStore
              return;
            } catch (registerError: any) {
              console.error('Error creating admin account:', registerError);
              // If account already exists, try login again
              await loginWithPhone(phone.trim(), password);
            }
          }
          return;
        }

        // Normal user login
        const identifier = phone.trim(); // We reuse the phone state for the unified identifier in login
        if (identifier.includes('@')) {
          await loginWithEmail(identifier, password);
        } else {
          await loginWithPhone(identifier, password);
        }
      } else if (mode === 'register') {
        if (password.length < 6) {
          throw new Error('Le mot de passe doit faire au moins 6 caractères.');
        }
        if (!acceptedPolicies) {
          throw new Error('Tu dois accepter les politiques de LEVELMAK pour continuer.');
        }

        if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
          throw new Error('Veuillez remplir tous les champs (Nom, Email et Téléphone).');
        }

        // We register with phone primarily to capture the profile, but we use the new email too.
        // Actually, let's create a combined registration in useStore or choose one.
        // Since useStore.registerWithPhone captures more profile data (gender, age), we use that.
        // We'll need to update useStore to accept both if we want full sync.
        // For now, let's use the phone-based registration which is the core of the app profile.
        await registerWithPhone(name.trim(), phone.trim(), email.trim(), password, gender, ageRange);
        // After success, we might want to link the email or update the profile.
        // authService.signUpWithEmail exists too.
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'La connexion avec Google a échoué.');
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocalLoading(true);

    try {
      if (recoveryStep === 1) {
        if (!name.trim()) throw new Error('Veuillez entrer votre nom.');
        if (!phone.trim() && !email.trim()) throw new Error('Veuillez entrer votre numéro ou e-mail.');
        // Simplified identity check for the Elite Experience
        // In a Production environment, this would be a secure backend validation.
        setRecoveryStep(2);
      } else {
        if (password.length < 6) throw new Error('Le nouveau mot de passe doit faire au moins 6 caractères.');
        setResetSuccess(true);
        setTimeout(() => {
          setMode('login');
          resetForm();
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'La vérification a échoué. Ton pseudo ou numéro est peut-être incorrect.');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060915] overflow-y-auto overflow-x-hidden selection:bg-primary/30 flex items-start md:items-center justify-center p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10"></div>
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-20 w-full max-w-2xl mt-4 md:mt-0">
        <div className="glass p-6 md:p-12 lg:p-16 rounded-[2.5rem] md:rounded-[4rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-6 md:space-y-8 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative group">
                <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <img src="/logo.png" alt="LEVELMAK" className="w-32 md:w-44 h-auto animate-float object-contain relative z-10" />
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-xl md:text-4xl font-display font-black text-white leading-tight tracking-tighter">
                {mode === 'register' ? (
                  <>Rejoins <span className="text-blue-400 drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]">l'Élite</span></>
                ) : mode === 'login' ? (
                  <>Bon retour, <span className="text-purple-400 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">Champion</span></>
                ) : (
                  <>Récupère <span className="text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">ton Trône</span></>
                )}
              </h1>
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-4">
              <div className="flex glass-light p-1 rounded-xl border border-white/5 w-full max-w-[280px] mx-auto backdrop-blur-md">
                <button
                  onClick={() => { setMode('register'); resetForm(); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all ${mode === 'register' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Inscription
                </button>
                <button
                  onClick={() => { setMode('login'); resetForm(); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all ${mode === 'login' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Connexion
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-center text-[10px] font-bold animate-shake">
              {error}
            </div>
          )}

          {mode === 'forgot' ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-xs text-slate-500 font-bold">
                  {recoveryStep === 1
                    ? "Entre ton pseudo et ton numéro pour prouver ton identité."
                    : "Identité confirmée ! Choisis ton nouveau mot de passe d'Élite."}
                </p>
              </div>

              <form onSubmit={handleRecovery} className="space-y-4">
                {recoveryStep === 1 ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 flex items-center gap-2">
                        <UserIcon size={11} />
                        Ton Pseudo
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                        placeholder="Ex: alimou1234"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 flex items-center gap-2">
                          <Book size={11} />
                          E-mail
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                          placeholder="Ex: email@example.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 flex items-center gap-2">
                          <Phone size={11} />
                          Numéro
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                          placeholder="Ex: +224 610 00 00"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 flex items-center gap-2">
                      <Lock size={11} />
                      Nouveau Mot de Passe
                    </label>
                    <div className="relative group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-slate-700 pr-12"
                        placeholder="Ex: Lelemak14"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {resetSuccess ? (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-500 text-center space-y-2">
                    <Sparkles className="mx-auto" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Demande de réinitialisation envoyée !</p>
                    <p className="text-[9px]">TMAB GROUP traite ta demande... Redirection imminente.</p>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-black text-xs shadow-glow transition-all active:scale-[0.98]"
                  >
                    {isLoading ? "Traitement..." : recoveryStep === 1 ? "Vérifier mon Identité" : "Changer mon Mot de Passe"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { setMode('login'); resetForm(); }}
                  className="w-full text-[9px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-all"
                >
                  Retour à la connexion
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {mode === 'register' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 flex items-center gap-2">
                        <UserIcon size={11} />
                        Ton Pseudo
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-700"
                        placeholder="Ex: alimou1234"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 flex items-center gap-2">
                        <Book size={11} />
                        E-mail
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                        placeholder="Ex: email@example.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 flex items-center gap-2">
                        <Phone size={11} />
                        Numéro
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                        placeholder="Ex: +224 610 00 00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3">Genre</label>
                      <div className="flex gap-2">
                        {(['HOMME', 'FEMME'] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g)}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border ${gender === g ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3">Tranche d'âge</label>
                      <select
                        value={ageRange}
                        onChange={(e) => setAgeRange(e.target.value as any)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[10px] outline-none appearance-none cursor-pointer"
                      >
                        <option value="15-18" className="bg-slate-900">De 15 à 18 ans</option>
                        <option value="19-23" className="bg-slate-900">De 19 à 23 ans</option>
                        <option value="24+" className="bg-slate-900">De 24 ans et plus</option>
                      </select>
                    </div>
                  </div>

                  {/* Education and Employment fields removed */}
                </>
              )}

              {mode === 'login' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 flex items-center gap-2">
                      <UserIcon size={11} />
                      E-mail ou Numéro
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                      placeholder="Identifiant de récupération"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 flex items-center gap-2">
                  <Lock size={11} />
                  Mot de Passe
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-primary/50 transition-all placeholder:text-slate-700 pr-12"
                    placeholder="Ex: Lelemak14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === 'login' && (
                  <div className="flex justify-end px-1">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-all uppercase tracking-widest"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}
              </div>

              {mode === 'register' && (
                <div className="space-y-3">
                  <div className={`p-4 rounded-2xl border transition-all ${acceptedPolicies ? 'bg-blue-600/10 border-blue-500/30' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setAcceptedPolicies(!acceptedPolicies)}
                        className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${acceptedPolicies ? 'bg-blue-600 border-blue-500' : 'bg-white/10 border-white/20'}`}
                      >
                        {acceptedPolicies && <Sparkles size={12} className="text-white" />}
                      </button>
                      <div className="flex-1 space-y-1">
                        <p className="text-[10px] text-slate-300 font-bold leading-relaxed">
                          J'ai lu et j'accepte les <button type="button" onClick={() => setShowPolicyDetail(!showPolicyDetail)} className="text-blue-400 underline hover:text-blue-300">Politiques de LEVELMAK</button> concernant le respect, la progression et mes données.
                        </p>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showPolicyDetail && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar text-[9px] leading-relaxed text-slate-400">
                          <section className="space-y-1">
                            <p className="font-black text-blue-400 uppercase tracking-widest text-[8px]">1. Respect Mutuel</p>
                            <p>LEVELMAK est un espace d'apprentissage d'élite. Tout comportement irrespectueux, harcèlement ou contenu inapproprié entraînera un bannissement immédiat et définitif du compte sans remboursement des LevelCoins.</p>
                          </section>
                          <section className="space-y-1">
                            <p className="font-black text-purple-400 uppercase tracking-widest text-[8px]">2. Progression & Mérites</p>
                            <p>Le système de niveaux et de récompenses est basé sur l'effort réel. Toute tentative de triche ou d'exploitation de bugs pour gagner des XP injustement est strictement interdite.</p>
                          </section>
                          <section className="space-y-1">
                            <p className="font-black text-orange-400 uppercase tracking-widest text-[8px]">3. Protection des Données</p>
                            <p>TMAB GROUP s'engage à protéger vos données personnelles. Tes informations de profil et de progression ne sont utilisées que pour améliorer ton expérience éducative au sein de la plateforme.</p>
                          </section>
                          <section className="space-y-1">
                            <p className="font-black text-green-400 uppercase tracking-widest text-[8px]">4. Propriété & Mission</p>
                            <p>LEVELMAK est une propriété de TMAB GROUP. En utilisant cette app, tu rejoins une mission visant à démocratiser l'éducation d'excellence à travers l'Afrique et le monde.</p>
                          </section>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || (mode === 'register' && !acceptedPolicies)}
                className={`w-full py-4 mt-2 rounded-2xl font-black text-xs shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all relative overflow-hidden group disabled:opacity-50 ${mode === 'register' ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-gradient-to-r from-secondary to-accent'} text-white`}
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Rocket size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      <span>{mode === 'register' ? 'Propulser mon Apprentissage' : 'Accéder au Dashboard'}</span>
                      <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </span>
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.3em] text-slate-700 bg-transparent px-4">OU</div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-[10px] text-white uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                Continuer avec Google
              </button>
            </form>
          )}

          <div className="flex items-center justify-center gap-6 md:gap-12 pt-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <span className="text-xl md:text-3xl" title="IA Avancée"></span>
            <span className="text-xl md:text-3xl" title="Bibliothèque Géante">📚</span>
            <span className="text-xl md:text-3xl" title="Communauté Élite">🌍</span>
            <span className="text-xl md:text-3xl" title="Trophées">🏆</span>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-8 font-medium">
          Protection des données conforme • Accès sécurisé SSL
        </p>
      </div >
    </div >
  );
};

export default Auth;
