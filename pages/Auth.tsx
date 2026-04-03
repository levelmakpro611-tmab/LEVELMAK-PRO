
import React, { useState } from 'react';
import { User as UserIcon, Sparkles, Rocket, Phone, Lock, Eye, EyeOff, ArrowRight, Book, Mail, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import { User as UserType } from '../types';
import { isAdminCredentials } from '../services/adminService';
import { logUserActivity } from '../services/activityService';
import { biometricService } from '../services/biometricService';

const Auth: React.FC = () => {
  const { t, registerWithPhone, loginWithPhone, registerWithEmail, loginWithEmail, loginWithGoogle, loading: storeLoading } = useStore();
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
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  React.useEffect(() => {
    const checkBiometrics = async () => {
      const isEnabled = await biometricService.isEnabled();
      setBiometricAvailable(isEnabled);
    };
    checkBiometrics();
  }, []);

  const isLoading = storeLoading || localLoading;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRegisterStep(1);
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
        console.log('Tentative d\'inscription transition...');
        if (registerStep === 1) {
          if (!name.trim() || !email.trim()) {
            throw new Error(t('auth.authRequired'));
          }
          setRegisterStep(2);
          return;
        }

        if (!password.trim()) {
          throw new Error(t('auth.pwRequired'));
        }
        if (!acceptedPolicies) {
          throw new Error(t('auth.acceptRequired'));
        }
        if (password.length < 6) {
          throw new Error(t('auth.pwShort'));
        }

        await registerWithEmail(
          name.trim(),
          email.trim(),
          password,
          gender,
          ageRange
        );
        console.log('Inscription réussie !');
      } else if (mode === 'login') {
        console.log('Tentative de connexion...');
        if (!email.trim() || !password.trim()) {
          throw new Error(t('auth.emailPwRequired'));
        }

        const identifier = email.trim();
        await loginWithEmail(identifier, password);
        console.log('Login success');
      }
    } catch (err: any) {
      console.error('SUBMISSION ERROR:', err);
      setError(err.message || t('auth.errorUnknown'));
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
      setError(err.message || t('auth.googleFailed'));
    }
  };

  const handleBiometricLogin = async () => {
    setError(null);
    setLocalLoading(true);
    try {
      const creds = await biometricService.authenticate();
      if (creds && creds.identifier && creds.password) {
         if (creds.identifier.includes('@')) {
           await loginWithEmail(creds.identifier, creds.password);
         } else {
           await loginWithPhone(creds.identifier, creds.password);
         }
      } else {
         setError(t('auth.biometricFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('auth.biometricError'));
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocalLoading(true);

    try {
      if (recoveryStep === 1) {
        if (!name.trim()) throw new Error(t('auth.identityRequired'));
        // Simplified identity check for the Elite Experience
        // In a Production environment, this would be a secure backend validation.
        setRecoveryStep(2);
      } else {
        if (password.length < 6) throw new Error(t('auth.pwLength'));
        setResetSuccess(true);
        setTimeout(() => {
          setMode('login');
          resetForm();
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || t('auth.recoveryFailed'));
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060915] overflow-y-auto overflow-x-hidden selection:bg-primary/30 flex items-start md:items-center justify-center p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10"></div>
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-20 w-full max-w-xl mt-4 md:mt-0">
        <div className="glass p-8 md:p-12 lg:p-14 rounded-[3rem] md:rounded-[4rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] space-y-8 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative group">
                <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <img src="/logo.png" alt="LEVELMAK" className="w-32 md:w-44 h-auto animate-float object-contain relative z-10" />
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-display font-black text-white leading-tight tracking-tighter">
                {mode === 'register' ? (
                  <>{t('auth.joinElite').split(' ')[0]} <span className="text-blue-400 drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]">{t('auth.joinElite').split(' ')[1]}</span></>
                ) : mode === 'login' ? (
                  <>{t('auth.championReturn').split(' ').slice(0, 2).join(' ')} <span className="text-purple-400 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">{t('auth.championReturn').split(' ').slice(2).join(' ')}</span></>
                ) : (
                  <>{t('auth.claimThrone').split(' ').slice(0, 1).join(' ')} <span className="text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">{t('auth.claimThrone').split(' ').slice(1).join(' ')}</span></>
                )}
              </h1>
            </div>
          </div>

          {mode === 'register' && (
            <div className="flex justify-center gap-2 mb-4">
              <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${registerStep === 1 ? 'bg-blue-500 shadow-glow' : 'bg-white/10'}`} />
              <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${registerStep === 2 ? 'bg-blue-500 shadow-glow' : 'bg-white/10'}`} />
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="space-y-4">
              <div className="flex glass-light p-1 rounded-xl border border-white/5 w-full max-w-[280px] mx-auto backdrop-blur-md">
                <button
                  onClick={() => { setMode('register'); resetForm(); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all ${mode === 'register' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t('auth.register')}
                </button>
                <button
                  onClick={() => { setMode('login'); resetForm(); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all ${mode === 'login' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t('auth.login')}
                </button>
              </div>
            </div>
          )}



          {mode === 'forgot' ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  {recoveryStep === 1
                    ? t('auth.identityVerif')
                    : t('auth.accessAuthorized')}
                </p>
              </div>

              <form onSubmit={handleRecovery} className="space-y-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={recoveryStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {recoveryStep === 1 ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                            <UserIcon size={12} className="text-orange-500" />
                            {t('auth.pseudoOrEmail')}
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-slate-700"
                            placeholder={t('auth.placeholderPseudo')}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                          <Lock size={12} className="text-orange-500" />
                          {t('auth.newPassword')}
                        </label>
                        <div className="relative group">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-orange-500/50 transition-all placeholder:text-slate-700 pr-12"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {resetSuccess ? (
                  <div className="p-5 bg-orange-500/10 border border-orange-500/20 rounded-[2rem] text-orange-500 text-center space-y-3">
                    <Sparkles className="mx-auto" size={32} />
                    <p className="text-xs font-black uppercase tracking-widest text-white">{t('auth.requestValidated')}</p>
                    <p className="text-[10px] font-medium opacity-80">{t('auth.updatingAccess')}</p>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-glow transition-all active:scale-[0.98] hover:shadow-orange-500/20"
                    >
                      {isLoading ? t('auth.verifying') : recoveryStep === 1 ? t('auth.verifyIdentity') : t('auth.changeAccess')}
                    </button>
                )}

                <button
                  type="button"
                  onClick={() => { setMode('login'); resetForm(); }}
                  className="w-full text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-all py-2"
                >
                  {t('auth.backToLogin')}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {mode === 'register' ? (
                  <motion.div
                    key={`reg-step-${registerStep}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-5"
                  >
                    {registerStep === 1 ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                            <UserIcon size={12} className="text-blue-500" />
                            {t('auth.pseudo')}
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                            placeholder={t('auth.placeholderPseudo')}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                            <Mail size={12} className="text-blue-500" />
                            {t('auth.email')}
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                            placeholder={t('auth.placeholderEmail')}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">{t('auth.gender')}</label>
                            <div className="flex gap-2">
                              {(['HOMME', 'FEMME'] as const).map((g) => (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => setGender(g)}
                                  className={`flex-1 py-4 rounded-xl text-[10px] font-black transition-all border ${gender === g ? 'bg-blue-600 border-blue-500 text-white shadow-glow' : 'bg-white/5 border-white/10 text-slate-500'}`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">{t('auth.ageRange')}</label>
                            <select
                              value={ageRange}
                              onChange={(e) => setAgeRange(e.target.value as any)}
                              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                            >
                              <option value="15-18" className="bg-slate-900">{t('auth.age1518')}</option>
                              <option value="19-23" className="bg-slate-900">{t('auth.age1923')}</option>
                              <option value="24+" className="bg-slate-900">{t('auth.age24plus')}</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                            <Lock size={12} className="text-blue-500" />
                            {t('auth.password')}
                          </label>
                          <div className="relative group">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 pr-12"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-4 group cursor-pointer" onClick={() => setAcceptedPolicies(!acceptedPolicies)}>
                          <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${acceptedPolicies ? 'bg-blue-600 border-blue-500 shadow-glow' : 'border-white/20'}`}>
                            {acceptedPolicies && <Sparkles size={10} className="text-white" />}
                          </div>
                          <p className="text-[10px] text-slate-300 font-bold leading-relaxed selection:bg-transparent">
                            {t('auth.acceptPolicy')}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                        <Mail size={12} className="text-purple-500" />
                        {t('auth.email')}
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-700"
                        placeholder={t('auth.placeholderEmail')}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                          <Lock size={12} className="text-purple-500" />
                          {t('auth.password')}
                        </label>
                        <button type="button" onClick={() => setMode('forgot')} className="text-[9px] font-black text-slate-500 hover:text-purple-400 uppercase tracking-widest transition-colors">{t('auth.forgot')}</button>
                      </div>
                      <div className="relative group">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-700 pr-12"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 text-center text-xs font-black animate-shake shadow-lg shadow-red-500/10"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Sparkles size={16} />
                    <span>{t('auth.errorSystem')}</span>
                  </div>
                  {error}
                </motion.div>
              )}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isLoading || (mode === 'register' && registerStep === 2 && !acceptedPolicies)}
                  className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all relative z-30 shadow-2xl hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 ${isLoading || (mode === 'register' && registerStep === 2 && !acceptedPolicies)
                    ? 'bg-slate-800 text-slate-500'
                    : mode === 'register'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/40'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/40'
                    }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === 'register' ? (registerStep === 1 ? <ArrowRight size={20} /> : <Rocket size={20} className="animate-bounce" />) : <ArrowRight size={20} />}
                      <span>
                        {mode === 'login'
                          ? t('auth.accessDashboard')
                          : registerStep === 1
                            ? t('auth.continue')
                            : t('auth.propelKnowledge')
                        }
                      </span>
                    </>
                  )}
                </button>

                {mode === 'register' && registerStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setRegisterStep(1)}
                    className="w-full text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-all"
                  >
                    {t('auth.backToPrev')}
                  </button>
                )}

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                  <div className="relative flex justify-center text-[10px]"><span className="px-3 bg-[#060915] text-slate-600 font-bold uppercase tracking-widest leading-none">{t('auth.orVia')}</span></div>
                </div>

                {mode === 'login' && biometricAvailable && (
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={isLoading}
                    className="w-full py-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-2xl font-black text-[10px] text-purple-400 uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
                  >
                    <Fingerprint size={16} />
                    {t('auth.biometricAuth')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-[10px] text-white uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale group-hover:grayscale-0" />
                  {t('auth.googleAuth')}
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
          {t('auth.legal')}
        </p>
      </div >
    </div >
  );
};

export default Auth;
