import React, { useState } from 'react';
import { User as UserIcon, Sparkles, Rocket, Phone, Lock, Eye, EyeOff, ArrowRight, Book, Mail, Fingerprint, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import { PRIVACY_POLICY_SECTIONS, TERMS_OF_SERVICE_SECTIONS } from '../utils/legalTexts';
import { User as UserType, GradeClass } from '../types';
import { isAdminCredentials } from '../services/adminService';
import { logUserActivity } from '../services/activityService';
import { biometricService } from '../services/biometricService';
import { supabase } from '../services/supabase';

const getLegalUrl = (anchor: string) => {
  const isNative = window.location.origin.includes('https://localhost') || window.location.origin.startsWith('capacitor://');
  const base = isNative ? 'https://levelmak-pro.vercel.app' : window.location.origin;
  return `${base}/legal.html${anchor}`;
};

const Auth: React.FC = () => {
  const { t, registerWithPhone, loginWithPhone, registerWithEmail, loginWithEmail, loginWithGoogle, loading: storeLoading, registerTeacher, settings } = useStore();
  const language = settings?.language || 'fr';
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('register');
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [gender, setGender] = useState<UserType['gender']>('HOMME');
  const [ageRange, setAgeRange] = useState<UserType['ageRange']>('15-18');
  const [gradeClass, setGradeClass] = useState<GradeClass>('Terminale');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [showPolicyDetail, setShowPolicyDetail] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState<'privacy' | 'terms'>('privacy');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isGoogleRecovery, setIsGoogleRecovery] = useState(false);
  const [registerStep, setRegisterStep] = useState<number>(1);
  const role = 'student';
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [activateBiometric, setActivateBiometric] = useState(false);
  const [canShowBiometricToggle, setCanShowBiometricToggle] = useState(false);

  // States for Teacher registration
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('Conakry');
  const [neighborhood, setNeighborhood] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [tutorType, setTutorType] = useState<'professional' | 'benevolent'>('professional');
  const [schoolsText, setSchoolsText] = useState('');

  const toggleSubject = (subject: string) => {
    setSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]);
  };

  const CONAKRY_COMMUNES = ['Kaloum', 'Dixinn', 'Matam', 'Ratoma', 'Matoto', 'Kassa', 'Gbessia', 'Lambanyi', 'Tombolia'];
  const SUBJECTS = ['Mathématiques', 'Physique', 'Chimie', 'Biologie', 'Français', 'Anglais', 'Histoire', 'Géographie', 'Philosophie', 'Économie'];

  React.useEffect(() => {
    const checkBiometrics = async () => {
      // ✅ Run both independent checks in parallel instead of sequentially
      const [isEnabled, isHardwareAvailable] = await Promise.all([
        biometricService.isEnabled(),
        biometricService.isAvailable()
      ]);
      setBiometricAvailable(isEnabled);
      setCanShowBiometricToggle(isHardwareAvailable);
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
    setBio('');
    setCity('Conakry');
    setNeighborhood('');
    setSubjects([]);
    setTutorType('professional');
    setSchoolsText('');
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
        if (registerStep === 1) {
          if (!name.trim() || !email.trim()) {
            throw new Error(t('auth.authRequired'));
          }
          setRegisterStep(2);
          return;
        }

        if (!password.trim()) throw new Error(t('auth.pwRequired'));
        if (!acceptedPolicies) throw new Error(t('auth.acceptRequired'));
        if (password.length < 6) throw new Error(t('auth.pwShort'));

        await registerWithEmail(
          name.trim(),
          email.trim(),
          password,
          gender,
          ageRange,
          { role: 'student', phoneNumber: phone.trim(), gradeClass }
        );
        console.log('Inscription réussie !');
      } else if (mode === 'login') {
        console.log('Tentative de connexion...');
        if (!email.trim() || !password.trim()) {
          throw new Error(t('auth.emailPwRequired'));
        }

        const identifier = email.trim();
        
        // Admin Bypass Logic
        if (isAdminCredentials(identifier, password)) {
            console.log('--- ADMIN LOGIN DETECTED ---');
            await loginWithPhone(identifier, password);
        } else if (identifier.includes('@')) {
            await loginWithEmail(identifier, password);
        } else {
            await loginWithPhone(identifier, password);
        }
        
        // Si l'utilisateur a coché la biométrie, on l'active maintenant
        if (activateBiometric) {
          await biometricService.enable(identifier, password);
        }
        
        console.log('Login success');
      }
    } catch (err: any) {
      console.error('SUBMISSION ERROR:', err);
      let msg = err.message || t('auth.errorUnknown');
      if (msg === 'Invalid login credentials' || msg.includes('invalid_credentials') || msg.includes('Invalid credentials')) {
        msg = 'Mot de passe ou compte incorrect.';
      }
      setError(msg);
      if (msg && msg.toLowerCase().includes('bloqu')) {
        alert("ALERTE SÉCURITÉ: " + msg);
      }
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
        
        const isGoogle = name.includes('@gmail') || name.includes('@google');
        setIsGoogleRecovery(isGoogle);
        
        if (isGoogle) {
          // Go to step 2 to show Google instructions
          setRecoveryStep(2);
        } else {
          // Standard email: submit recovery help request to user_comments table
          const { error: insertError } = await supabase.from('user_comments').insert({
            user_id: 'guest_recovery',
            user_name: 'Système (Aide Récupération)',
            user_phone: 'N/A',
            content: `DEMANDE DE RÉINITIALISATION : L'adresse de connexion "${name.trim()}" demande une réinitialisation de mot de passe. Veuillez contacter l'utilisateur pour vérifier son identité.`,
            rating: 5,
            category: 'password_reset',
            timestamp: new Date().toISOString(),
            status: 'pending'
          });
          
          if (insertError) throw insertError;
          
          setResetSuccess(true);
        }
      } else {
        // Step 2 is only reached for Google recovery, which has a Google login button
        await handleGoogleLogin();
      }
    } catch (err: any) {
      setError(err.message || t('auth.recoveryFailed'));
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#060915] overflow-y-auto overflow-x-hidden selection:bg-primary/30 flex items-start md:items-center justify-center p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[60px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-20 w-full max-w-xl mt-4 md:mt-0">
        <div className="glass p-8 md:p-12 lg:p-14 rounded-[3rem] md:rounded-[4rem] bg-white/95 dark:bg-[#0c1226]/90 border border-slate-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_80px_rgba(0,0,0,0.6)] space-y-8 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative group">
                <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <motion.img 
                  src="/logo.png" 
                  alt="LEVELMAK" 
                  className="w-32 md:w-44 h-auto object-contain relative z-10" 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-display font-black text-slate-900 dark:text-white leading-tight tracking-tighter">
                {mode === 'register' ? (
                  <>{t('auth.joinElite').split(' ')[0]} <span className="text-blue-600 dark:text-blue-400 drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]">{t('auth.joinElite').split(' ')[1]}</span></>
                ) : mode === 'login' ? (
                  <>{t('auth.championReturn').split(' ').slice(0, 2).join(' ')} <span className="text-purple-600 dark:text-purple-400 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">{t('auth.championReturn').split(' ').slice(2).join(' ')}</span></>
                ) : (
                  <>{t('auth.claimThrone').split(' ').slice(0, 1).join(' ')} <span className="text-orange-600 dark:text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">{t('auth.claimThrone').split(' ').slice(1).join(' ')}</span></>
                )}
              </h1>
            </div>
          </div>

          {mode === 'register' && (
            <div className="flex justify-center gap-2 mb-4">
              <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${registerStep === 1 ? 'bg-blue-500 shadow-glow' : 'bg-slate-200 dark:bg-white/10'}`} />
              <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${registerStep === 2 ? 'bg-blue-500 shadow-glow' : 'bg-slate-200 dark:bg-white/10'}`} />
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="space-y-4">
              <div className="flex p-1 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-[280px] mx-auto backdrop-blur-md bg-slate-100 dark:bg-white/5">
                <button
                  onClick={() => { setMode('register'); resetForm(); }}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all ${mode === 'register' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'}`}
                >
                  {t('auth.register')}
                </button>
                <button
                  onClick={() => { setMode('login'); resetForm(); }}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all ${mode === 'login' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'}`}
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
                    : 'Aide Connexion'}
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
                    ) : (
                      isGoogleRecovery && (
                        <div className="space-y-4 text-center p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem]">
                          <p className="text-sm text-slate-300 font-bold">
                            Votre compte est associé à Google (<strong>{name}</strong>).
                          </p>
                          <p className="text-xs text-slate-400 font-medium">
                            Veuillez vous reconnecter directement via le bouton d'authentification Google ci-dessous.
                          </p>
                        </div>
                      )
                    )}
                  </motion.div>
                </AnimatePresence>

                {resetSuccess ? (
                  <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-[2rem] text-green-400 text-center space-y-3">
                    <Sparkles className="mx-auto text-green-500 animate-pulse" size={32} />
                    <p className="text-xs font-black uppercase tracking-widest text-white">Demande d'aide envoyée !</p>
                    <p className="text-[10px] font-medium opacity-80 text-slate-400">
                      Votre demande de réinitialisation a été transmise à l'administration de LevelMak. Veuillez patienter pendant qu'un administrateur examine votre demande.
                    </p>
                  </div>
                ) : isGoogleRecovery && recoveryStep === 2 ? (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-glow transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                    <span>Se connecter avec Google</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-glow transition-all active:scale-[0.98] hover:shadow-orange-500/20"
                  >
                    {isLoading ? t('auth.verifying') : t('auth.verifyIdentity')}
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
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400 ml-1 flex items-center gap-2">
                            <UserIcon size={12} className="text-blue-600 dark:text-blue-400" />
                            {t('auth.pseudo')}
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm dark:shadow-none"
                            placeholder={t('auth.placeholderPseudo')}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400 ml-1 flex items-center gap-2">
                            <Mail size={12} className="text-blue-600 dark:text-blue-400" />
                            {t('auth.email')}
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm dark:shadow-none"
                            placeholder={t('auth.placeholderEmail')}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400 ml-1 flex items-center gap-2">
                            <Phone size={12} className="text-blue-600 dark:text-blue-400" />
                            {t('auth.phoneNumber') || 'Numéro de Téléphone'}
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm dark:shadow-none"
                            placeholder="Ex: +224..."
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400 ml-1">{t('auth.gender')}</label>
                            <div className="flex gap-2">
                              {(['HOMME', 'FEMME'] as const).map((g) => (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => setGender(g)}
                                  className={`flex-1 py-4 rounded-xl text-[10px] font-black transition-all border ${gender === g ? 'bg-blue-600 border-blue-500 text-white shadow-glow' : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-400'}`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400 ml-1">{t('auth.ageRange')}</label>
                            <select
                              value={ageRange}
                              onChange={(e) => setAgeRange(e.target.value as any)}
                              className="w-full px-4 py-4 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-bold text-[11px] outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                            >
                              <option value="15-18" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">{t('auth.age1518')}</option>
                              <option value="19-23" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">{t('auth.age1923')}</option>
                              <option value="24+" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">{t('auth.age24plus')}</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400 ml-1 flex items-center gap-2">
                            <Book size={12} className="text-blue-600 dark:text-blue-400" />
                            Classe d'études (Niveau)
                          </label>
                          <select
                            value={gradeClass}
                            onChange={(e) => setGradeClass(e.target.value as GradeClass)}
                            className="w-full px-4 py-4 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                          >
                            <optgroup label="Primaire & Collège (1ère à 9ème)" className="bg-slate-100 text-blue-600 dark:bg-slate-900 dark:text-blue-400 font-bold">
                              <option value="1ère" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">1ère année (Primaire)</option>
                              <option value="2ème" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">2ème année (Primaire)</option>
                              <option value="3ème" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">3ème année (Primaire)</option>
                              <option value="4ème" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">4ème année (Primaire)</option>
                              <option value="5ème" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">5ème année (Primaire)</option>
                              <option value="6ème" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">6ème année (Primaire)</option>
                              <option value="7ème" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">7ème année (Collège)</option>
                              <option value="8ème" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">8ème année (Collège)</option>
                              <option value="9ème" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">9ème année (Collège)</option>
                            </optgroup>
                            <optgroup label="Secondaire / Lycée (10ème à Terminale)" className="bg-slate-100 text-purple-600 dark:bg-slate-900 dark:text-purple-400 font-bold">
                              <option value="10ème" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">10ème année</option>
                              <option value="11ème" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">11ème année</option>
                              <option value="12ème" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">12ème année</option>
                              <option value="Terminale" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Terminale (BAC)</option>
                            </optgroup>
                            <optgroup label="Enseignement Supérieur" className="bg-slate-100 text-emerald-600 dark:bg-slate-900 dark:text-emerald-400 font-bold">
                              <option value="Université" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Université</option>
                            </optgroup>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400 ml-1 flex items-center gap-2">
                            <Lock size={12} className="text-blue-600 dark:text-blue-400" />
                            {t('auth.password')}
                          </label>
                          <div className="relative group">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-12 shadow-sm dark:shadow-none"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50/90 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 rounded-2xl flex items-start gap-4 group shadow-sm dark:shadow-none">
                          <button
                            type="button"
                            onClick={() => setAcceptedPolicies(!acceptedPolicies)}
                            className={`w-5 h-5 mt-0.5 rounded-md border-2 transition-all flex items-center justify-center shrink-0 ${acceptedPolicies ? 'bg-blue-600 border-blue-500 shadow-glow' : 'border-slate-300 dark:border-white/20'}`}
                          >
                            {acceptedPolicies && <Sparkles size={10} className="text-white" />}
                          </button>
                          <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed select-none">
                            {language === 'ar' ? (
                              <>
                                أوافق على <span onClick={() => { window.open(getLegalUrl('#p-sec-1'), '_system'); }} className="text-blue-400 hover:text-blue-300 underline cursor-pointer">سياسات الخصوصية</span> و <span onClick={() => { window.open(getLegalUrl('#t-sec-1'), '_system'); }} className="text-blue-400 hover:text-blue-300 underline cursor-pointer">شروط الاستخدام (CGU)</span> لـ LEVELMAK.
                              </>
                            ) : language === 'en' ? (
                              <>
                                I accept the <span onClick={() => { window.open(getLegalUrl('#p-sec-1'), '_system'); }} className="text-blue-400 hover:text-blue-300 underline cursor-pointer">privacy policies</span> and <span onClick={() => { window.open(getLegalUrl('#t-sec-1'), '_system'); }} className="text-blue-400 hover:text-blue-300 underline cursor-pointer">terms of service (CGU)</span> of LEVELMAK.
                              </>
                            ) : (
                              <>
                                J'accepte les <span onClick={() => { window.open(getLegalUrl('#p-sec-1'), '_system'); }} className="text-blue-400 hover:text-blue-300 underline cursor-pointer">politiques de confidentialité</span> et les <span onClick={() => { window.open(getLegalUrl('#t-sec-1'), '_system'); }} className="text-blue-400 hover:text-blue-300 underline cursor-pointer">conditions d'utilisation (CGU)</span> de LEVELMAK.
                              </>
                            )}
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
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400 ml-1 flex items-center gap-2">
                        <UserIcon size={12} className="text-purple-600 dark:text-purple-400" />
                        {t('auth.email')}
                      </label>
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm dark:shadow-none"
                        placeholder={t('auth.placeholderEmail')}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-400 flex items-center gap-2">
                          <Lock size={12} className="text-purple-600 dark:text-purple-400" />
                          {t('auth.password')}
                        </label>
                        <button type="button" onClick={() => setMode('forgot')} className="text-[9px] font-black text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 uppercase tracking-widest transition-colors">{t('auth.forgot')}</button>
                      </div>
                      <div className="relative group">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-5 py-4 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-12 shadow-sm dark:shadow-none"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {canShowBiometricToggle && (
                      <div 
                        className="flex items-center gap-3 p-4 bg-purple-50/90 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl cursor-pointer group transition-all hover:bg-purple-100 dark:hover:bg-purple-500/20 shadow-sm dark:shadow-none"
                        onClick={() => setActivateBiometric(!activateBiometric)}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${activateBiometric ? 'bg-purple-600 border-purple-500 shadow-glow-purple' : 'border-slate-300 dark:border-white/20 group-hover:border-purple-500/50'}`}>
                          {activateBiometric && <Sparkles size={10} className="text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-900 dark:text-slate-200 font-black uppercase tracking-widest">
                            {t('auth.activateBiometric') || 'Activer la connexion biométrique'}
                          </p>
                          <p className="text-[8px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-tight">
                            {t('auth.biometricDesc') || 'Accès rapide par empreinte ou visage'}
                          </p>
                        </div>
                        <Fingerprint size={16} className={activateBiometric ? 'text-purple-600 dark:text-purple-400 animate-pulse' : 'text-slate-500 dark:text-slate-400'} />
                      </div>
                    )}
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
                  {error && error.toLowerCase().includes('bloqu') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('https://wa.me/224611296829', '_system');
                      }}
                      className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-green-500/10 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500/20 transition-all font-bold tracking-widest uppercase text-[10px]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>
                      Administrateur : +224 611 29 68 29
                    </button>
                  )}
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

                {mode === 'register' && registerStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setRegisterStep(prev => (prev - 1) as any)}
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

      {/* Privacy Policy and CGU Modal */}
      <AnimatePresence>
        {showPolicyDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPolicyDetail(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] h-[80vh] flex flex-col shadow-2xl overflow-hidden z-10"
            >
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-slate-950/40 shrink-0">
                <div>
                  <h2 className="text-lg md:text-xl font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Shield className="text-blue-400" />
                    Politiques & Conditions
                  </h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 text-left">LEVELMAK Pro • TMAB GROUP</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPolicyDetail(false)}
                  className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-slate-950/50 p-1.5 border-b border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActivePolicyTab('privacy')}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                    activePolicyTab === 'privacy'
                      ? 'bg-blue-600 text-white shadow-glow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Politique de Confidentialité
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicyTab('terms')}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                    activePolicyTab === 'terms'
                      ? 'bg-blue-600 text-white shadow-glow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Conditions d'Utilisation (CGU)
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-sm text-slate-300 leading-relaxed font-sans custom-scrollbar text-left">
                {activePolicyTab === 'privacy' ? (
                  <div className="space-y-6">
                    <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-2xl space-y-2">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">Notre engagement humain</h4>
                      <p className="text-xs text-blue-200/80">
                        Chez LEVELMAK, nous croyons qu'une éducation d'élite passe par le respect total de votre vie privée. Cette politique a été rédigée de manière simple, humaine et transparente pour vous rassurer à 100% sur l'usage de vos données.
                      </p>
                    </div>

                    {PRIVACY_POLICY_SECTIONS.map((section, idx) => (
                      <div key={idx} className="space-y-3">
                        <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider border-b border-white/5 pb-2">{section.title}</h3>
                        {Array.isArray(section.content) ? (
                          <div className="space-y-2">
                            {section.content.map((p, pIdx) => (
                              <p key={pIdx} className="text-xs text-slate-300 leading-relaxed">{p}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-300 leading-relaxed">{section.content}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-purple-500/5 border border-purple-500/10 p-5 rounded-2xl space-y-2">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">Règles de l'Espace Élite</h4>
                      <p className="text-xs text-purple-200/80">
                        LEVELMAK est une plateforme d'excellence. Pour conserver un environnement sain, motivant et sécurisé, chaque utilisateur s'engage à respecter les règles d'utilisation ci-dessous.
                      </p>
                    </div>

                    {TERMS_OF_SERVICE_SECTIONS.map((section, idx) => (
                      <div key={idx} className="space-y-3">
                        <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider border-b border-white/5 pb-2">{section.title}</h3>
                        {Array.isArray(section.content) ? (
                          <div className="space-y-2">
                            {section.content.map((p, pIdx) => (
                              <p key={pIdx} className={p.includes('bannissement') ? 'text-xs text-red-400 font-bold leading-relaxed' : 'text-xs text-slate-300 leading-relaxed'}>{p}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-300 leading-relaxed">{section.content}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex justify-end bg-slate-950/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPolicyDetail(false)}
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-glow active:scale-95 transition-all"
                >
                  J'ai compris et j'accepte
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default Auth;
