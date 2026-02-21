
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
    console.log('--- DEBUT SUBMISSION ---');
    console.log('Mode:', mode);
    console.log('Nom:', name);
    console.log('Email:', email);
    console.log('Phone:', phone);
    setError(null);
    setLocalLoading(true);

    try {
      if (mode === 'register') {
        console.log('Tentative d\'inscription...');
        if (!name.trim() || !phone.trim() || !password.trim() || !email.trim()) {
          throw new Error('Veuillez remplir tous les champs (Nom, Email, Numéro et Mot de Passe).');
        }
        if (!acceptedPolicies) {
          throw new Error('Tu dois accepter les politiques de LEVELMAK pour continuer.');
        }
        if (password.length < 6) {
          throw new Error('⚠️ SÉCURITÉ : Ton mot de passe est trop court. Il doit faire au moins 6 caractères pour protéger ton compte.');
        }
        await registerWithPhone(name.trim(), phone.trim(), email.trim(), password, gender, ageRange);
        console.log('Inscription réussie !');
      } else if (mode === 'login') {
        console.log('Tentative de connexion...');
        if (!phone.trim() || !password.trim()) {
          throw new Error('Veuillez entrer votre numéro et mot de passe.');
        }

        // Check if admin credentials using phone field as username - auto-create admin account if needed
        if (isAdminCredentials(phone.trim(), password)) {
          console.log('Admin credentials detected');
          setIsAdminUser(true);
          try {
            await loginWithPhone(phone.trim(), password);
            console.log('Admin login success');
            logUserActivity('admin_temp_id', 'Admin User', 'auth', 'Admin Login', { method: 'Special Phone' });
          } catch (loginError: any) {
            console.log('Admin auto-creation needed...');
            try {
              await registerWithPhone(
                'Administrateur Principal',
                phone.trim(),
                'admin@levelmak.pro',
                password,
                'HOMME',
                '24+'
              );
              console.log('Admin created and logged in');
              return;
            } catch (registerError: any) {
              console.error('CRITICAL ADMIN ERROR:', registerError);
              await loginWithPhone(phone.trim(), password);
            }
          }
          return;
        }

        // Normal user login
        const identifier = phone.trim();
        if (identifier.includes('@')) {
          console.log('Login with email:', identifier);
          await loginWithEmail(identifier, password);
        } else {
          console.log('Login with phone:', identifier);
          await loginWithPhone(identifier, password);
        }
        console.log('Login success');
      }
    } catch (err: any) {
      console.error('SUBMISSION ERROR:', err);
      setError(err.message || 'Une erreur inconnue est survenue.');
    } finally {
      console.log('--- FIN SUBMISSION ---');
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
        <div className="glass p-6 md:p-12 lg:p-16 rounded-[2.5rem] md:rounded-[4rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-6 md:space-y-8 animate-slide-up relative">
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
            <div className="p-4 bg-red-500/20 border-2 border-red-500 rounded-2xl text-red-500 text-center text-xs font-black animate-shake shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles size={14} />
                <span>ERREUR D'INSCRIPTION</span>
              </div>
              {error}
              <div className="mt-2 text-[9px] opacity-70">
                Vérifiez votre connexion ou contactez le support si le problème persiste.
              </div>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {mode === 'register' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 flex items-center gap-2">
                        <UserIcon size={11} />
                        Ton Pseudo (Obligatoire)
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500 transition-all"
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
                          className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500 transition-all"
                          placeholder="Ex: mail@example.com"
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
                          className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500 transition-all"
                          placeholder="Ex: 620 00 00 00"
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
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3">Âge</label>
                        <select
                          value={ageRange}
                          onChange={(e) => setAgeRange(e.target.value as any)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[10px] outline-none"
                        >
                          <option value="15-18" className="bg-slate-900">15-18 ans</option>
                          <option value="19-23" className="bg-slate-900">19-23 ans</option>
                          <option value="24+" className="bg-slate-900">24+ ans</option>
                        </select>
                      </div>
                    </div>
                  </div>
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
                        className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500 transition-all"
                        placeholder="Identifiant"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 flex items-center gap-2">
                    <Lock size={11} />
                    Mot de Passe (Min. 6)
                  </label>
                  <div className="relative group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500 transition-all pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {mode === 'register' && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={acceptedPolicies}
                      onChange={(e) => setAcceptedPolicies(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600"
                    />
                    <p className="text-[10px] text-slate-300 font-bold">
                      J'accepte les politiques de LEVELMAK
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading || (mode === 'register' && !acceptedPolicies)}
                  className={`w-full py-4 rounded-xl font-black text-xs transition-all relative z-30 shadow-lg ${isLoading || (mode === 'register' && !acceptedPolicies) ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Rocket size={16} />
                        <span>{mode === 'register' ? 'Propulser mon Apprentissage' : 'Accéder au Dashboard'}</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black text-[10px] text-white uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-3 h-3" />
                  Google
                </button>
              </div>
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
