
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Bell,
    Shield,
    Smartphone,
    Palette,
    Info,
    ChevronRight,
    Camera,
    Save,
    Check,
    Globe,
    Moon,
    Volume2,
    Type
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { audioService } from '../services/audio';
import { biometricService } from '../services/biometricService';
import { feedbackService } from '../services/feedbackService';
import { Fingerprint } from 'lucide-react';

const Settings: React.FC = () => {
    const { user, updateProfile, addActivity, settings, updateSettings, changePassword, t } = useStore();
    const [activeSection, setActiveSection] = useState<'profile' | 'appearance' | 'notifications' | 'security'>('profile');
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phoneNumber || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    React.useEffect(() => {
        const checkBiometric = async () => {
            const enabled = await biometricService.isEnabled();
            setBiometricEnabled(enabled);
        };
        checkBiometric();
    }, []);

    // Password change state (for security section)
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateProfile(name, phone);
            addActivity('profile', t('settings.success'), '');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (oldPassword.length < 6 || newPassword.length < 6) {
            setPasswordError("Min. 6 caractères requis.");
            return;
        }
        setPasswordLoading(true);
        setPasswordError('');
        setPasswordSuccess('');
        try {
            await changePassword(oldPassword, newPassword);
            setPasswordSuccess("Mot de passe mis à jour !");
            setOldPassword('');
            setNewPassword('');
        } catch (err: any) {
            setPasswordError(err.message);
        } finally {
            setPasswordLoading(false);
        }
    };

    const toggleTheme = () => {
        updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
    };

    const toggleSound = () => {
        const newEnabled = !settings.soundEnabled;
        updateSettings({ soundEnabled: newEnabled });
        audioService.setEnabled(newEnabled);
    };

    const toggleLanguage = () => {
        const nextLang = settings.language === 'fr' ? 'en' : settings.language === 'en' ? 'ar' : 'fr';
        updateSettings({ language: nextLang });
    };

    const sections = [
        { id: 'profile', title: t('settings.profile'), icon: User, color: 'text-primary', bg: 'bg-primary/10' },
        { id: 'appearance', title: t('settings.appearance'), icon: Palette, color: 'text-secondary', bg: 'bg-secondary/10' },
        { id: 'notifications', title: t('settings.notifications'), icon: Bell, color: 'text-accent', bg: 'bg-accent/10' },
        { id: 'security', title: t('settings.security'), icon: Shield, color: 'text-success', bg: 'bg-success/10' }
    ];

    return (
        <div className="max-w-4xl mx-auto py-6 md:py-10 space-y-8 md:space-y-12 animate-fade-in px-4">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-3 text-primary-light font-black uppercase tracking-[0.2em] text-xs">
                    <Info size={16} /> {t('settings.panel')}
                </div>
                <h1 className="text-3xl md:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tighter transition-colors">{t('settings.title')} <span className="text-gradient-primary">{t('settings.subtitle')}</span></h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm md:text-lg font-medium max-w-xl transition-colors">{t('settings.desc')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Navigation Menu */}
                <div className="space-y-2 overflow-x-auto md:overflow-visible flex md:flex-col gap-2 pb-4 md:pb-0 scrollbar-hide">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id as any)}
                            className={`flex items-center gap-4 p-4 rounded-2xl transition-all border shrink-0 md:w-full ${activeSection === section.id
                                ? 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-900 dark:text-white shadow-lg dark:shadow-black/20'
                                : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                        >
                            <div className={`p-2.5 rounded-xl ${section.bg} ${section.color}`}>
                                <section.icon size={20} />
                            </div>
                            <span className="font-bold tracking-wide text-sm md:text-base">{section.title}</span>
                            <ChevronRight size={16} className={`ml-auto opacity-50 hidden md:block transition-transform ${activeSection === section.id ? 'translate-x-1' : ''}`} />
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="md:col-span-2 space-y-8 min-h-[500px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeSection === 'profile' && (
                                <div className="glass p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6 md:space-y-8">
                                    <div className="flex items-center gap-6">
                                        <div className="relative group/avatar">
                                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-slate-800 border-2 border-white/10 shadow-2xl overflow-hidden ring-4 ring-primary/20">
                                                {user?.avatar?.image ? (
                                                    <img src={user.avatar.image} alt={user.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-2xl md:text-3xl font-black text-white bg-gradient-to-br from-slate-700 to-slate-900">
                                                        {user?.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white transition-colors">{t.photoTitle}</h3>
                                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Visite la boutique pour changer d'avatar !</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1">{t('settings.fullName')}</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Ex: Mouctar"
                                                className="w-full p-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl outline-none focus:border-primary/50 text-slate-900 dark:text-white font-bold transition-all text-sm md:text-base placeholder:text-slate-400"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1">{t('settings.phoneNum')}</label>
                                            <div className="relative">
                                                <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="+224 6100000000"
                                                    className="w-full pl-12 pr-4 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl outline-none focus:border-primary/50 text-slate-900 dark:text-white font-bold transition-all text-sm md:text-base placeholder:text-slate-400"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {showSuccess && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="text-success text-xs md:text-sm font-bold flex items-center gap-1.5"
                                                >
                                                    <Check size={16} /> {t('settings.success')}
                                                </motion.div>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={isSaving}
                                            className="px-6 md:px-8 py-3 md:py-4 bg-primary hover:bg-primary-light text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all shadow-glow flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSaving ? t('settings.saving') : (
                                                <>
                                                    <Save size={16} /> {t('settings.saveBtn')}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'appearance' && (
                                <div className="space-y-6">
                                    <div className="glass p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-2xl">
                                        <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3 transition-colors">
                                            <Palette className="text-secondary" /> {t('settings.appearance')}
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div
                                                onClick={toggleTheme}
                                                className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center gap-4 group hover:bg-white/10 transition-all cursor-pointer"
                                            >
                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
                                                    <Moon size={20} className="md:w-6 md:h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm transition-colors">{t('settings.darkMode')}</h4>
                                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none">
                                                        {settings.theme === 'dark' ? t('settings.darkOn') : t('settings.lightOn')}
                                                    </p>
                                                </div>
                                                <div className={`w-8 md:w-10 h-4 md:h-5 rounded-full relative transition-colors ${settings.theme === 'dark' ? 'bg-primary/40' : 'bg-slate-700'}`}>
                                                    <div className={`absolute top-0.5 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full transition-all ${settings.theme === 'dark' ? 'right-0.5' : 'left-0.5'}`}></div>
                                                </div>
                                            </div>

                                            <div
                                                onClick={toggleSound}
                                                className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center gap-4 group hover:bg-white/10 transition-all cursor-pointer"
                                            >
                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-300 group-hover:text-secondary transition-colors">
                                                    <Volume2 size={20} className="md:w-6 md:h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm transition-colors">{t('settings.appSounds')}</h4>
                                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none">
                                                        {settings.soundEnabled ? t('settings.soundsOn') : t('settings.soundsOff')}
                                                    </p>
                                                </div>
                                                <div className={`w-8 md:w-10 h-4 md:h-5 rounded-full relative transition-colors ${settings.soundEnabled ? 'bg-success/40' : 'bg-slate-700'}`}>
                                                    <div className={`absolute top-0.5 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full transition-all ${settings.soundEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                                </div>
                                                {settings.soundEnabled && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            audioService.playNotification();
                                                        }}
                                                        className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider transition-all"
                                                    >
                                                        Test
                                                    </button>
                                                )}
                                            </div>

                                            <div
                                                onClick={toggleLanguage}
                                                className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center gap-4 group hover:bg-white/10 transition-all cursor-pointer col-span-1 md:col-span-2"
                                            >
                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-300 group-hover:text-accent transition-colors">
                                                    <Globe size={20} className="md:w-6 md:h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm transition-colors">{t('settings.lang')}</h4>
                                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">
                                                        {settings.language === 'fr' ? 'Français (France)' : settings.language === 'ar' ? 'العربية (AR)' : 'English (US)'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 bg-black/20 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-white/5 font-black text-[8px] md:text-[10px] text-white tracking-widest uppercase">
                                                    Changer
                                                </div>
                                            </div>

                                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4 col-span-1 md:col-span-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
                                                        <Type size={20} className="md:w-6 md:h-6" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm transition-colors">{t('settings.fontSize')}</h4>
                                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{t('settings.fontSizeDesc')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 bg-black/20 p-2 rounded-2xl border border-white/5">
                                                    {(['xs', 'sm', 'base', 'lg', 'xl'] as const).map((size) => (
                                                        <button
                                                            key={size}
                                                            onClick={() => updateSettings({ fontSize: size })}
                                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${settings.fontSize === size
                                                                ? 'bg-primary text-white shadow-glow'
                                                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                                                }`}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="glass p-6 rounded-3xl border border-white/5 flex items-center gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-950/50 flex items-center justify-center text-slate-500">
                                            <Info size={20} className="md:w-6 md:h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-[10px] md:text-xs transition-colors">{t('settings.version')}</h4>
                                            <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{t('settings.build')}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'notifications' && (
                                <div className="glass p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-white/5 shadow-2xl">
                                    <div className="space-y-2 mb-8 text-center md:text-left">
                                        <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-3 transition-colors">
                                            <Bell className="text-accent" /> {t('settings.notifTitle')}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{t('settings.notifDesc')}</p>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            { id: 'missions', title: t('settings.notifMissions'), desc: 'Reçois une notification quand tes missions expirent.' },
                                            { id: 'quiz', title: t('settings.notifQuiz'), desc: 'Sois le premier au courant des nouveaux quiz disponibles.' },
                                            { id: 'community', title: t('settings.notifCommunity'), desc: 'Alertes sur les nouveaux posts et défis collectifs.' }
                                        ].map((item) => {
                                            const isEnabled = settings.notifications?.[item.id as keyof typeof settings.notifications];
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => updateSettings({
                                                        notifications: {
                                                            ...settings.notifications,
                                                            [item.id]: !isEnabled
                                                        }
                                                    })}
                                                    className="flex items-center justify-between p-5 md:p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                                                >
                                                    <div className="space-y-1 flex-1 pr-4">
                                                        <p className="font-bold text-slate-900 dark:text-white text-xs md:text-sm transition-colors">{item.title}</p>
                                                        <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 tracking-tight font-medium leading-tight">{item.desc}</p>
                                                    </div>
                                                    <div className={`w-10 h-6 md:w-12 md:h-7 rounded-full relative border transition-colors ${isEnabled ? 'bg-success/20 border-success/30' : 'bg-slate-700/50 border-white/10'}`}>
                                                        <div className={`absolute top-1 w-3 h-3 md:w-4 md:h-4 rounded-full transition-all ${isEnabled ? 'right-1 bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'left-1 bg-slate-500'}`}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeSection === 'security' && (
                                <div className="space-y-6">
                                    <div className="glass p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6 md:space-y-8">
                                        <div className="space-y-2 text-center md:text-left">
                                            <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-3 transition-colors">
                                                <Shield className="text-success" /> {t('settings.securityTitle')}
                                            </h3>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{t('settings.securityDesc')}</p>
                                        </div>

                                        <div className="bg-black/20 p-5 md:p-8 rounded-3xl border border-white/5 space-y-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2 px-1">{t('settings.oldPw')}</label>
                                                    <input
                                                        type="password"
                                                        value={oldPassword}
                                                        onChange={(e) => setOldPassword(e.target.value)}
                                                        className="w-full bg-black/5 dark:bg-slate-900 border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-success/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2 px-1">{t('settings.newPw')}</label>
                                                    <input
                                                        type="password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full bg-black/5 dark:bg-slate-900 border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-success/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                                                        placeholder="Nouveau code d'accès"
                                                    />
                                                </div>
                                            </div>

                                            {passwordError && (
                                                <div className="bg-danger/10 text-danger p-3 rounded-xl border border-danger/20 text-[10px] font-bold text-center">
                                                    {passwordError}
                                                </div>
                                            )}
                                            {passwordSuccess && (
                                                <div className="bg-success/10 text-success p-3 rounded-xl border border-success/20 text-[10px] font-bold text-center">
                                                    {passwordSuccess}
                                                </div>
                                            )}

                                            <button
                                                onClick={handlePasswordChange}
                                                disabled={passwordLoading}
                                                className="w-full py-4 bg-success/20 hover:bg-success text-success hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-success/30 disabled:opacity-50"
                                            >
                                                {passwordLoading ? t('settings.saving') : t('settings.changePw')}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="glass p-5 md:p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success">
                                                <Smartphone size={20} className="md:w-6 md:h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-xs transition-colors">{t('settings.sessions')}</h4>
                                                <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-tight">{t('settings.sessionsDesc')}</p>
                                            </div>
                                        </div>
                                        <div className="text-[8px] md:text-[9px] font-black text-success uppercase tracking-widest bg-success/10 px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-success/20 animate-pulse">
                                            Actif
                                        </div>
                                    </div>

                                    <div 
                                        onClick={async () => {
                                            const newState = !biometricEnabled;
                                            if (newState) {
                                                const password = window.prompt("Veuillez entrer votre mot de passe pour autoriser TouchID/FaceID:");
                                                if (!password) return; // Annulé par l'utilisateur
                                                
                                                const identifier = user?.phone || user?.email || user?.id || '';
                                                const success = await biometricService.enable(identifier, password);
                                                if (success) {
                                                    setBiometricEnabled(true);
                                                    feedbackService.fullSuccess();
                                                }
                                            } else {
                                                await biometricService.disable();
                                                setBiometricEnabled(false);
                                                feedbackService.mediumImpact();
                                            }
                                        }}
                                        className="glass p-5 md:p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-colors ${biometricEnabled ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-800 text-slate-500'}`}>
                                                <Fingerprint size={20} className="md:w-6 md:h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-xs transition-colors">Connexion Biométrique</h4>
                                                <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-tight">Utiliser FaceID / TouchID pour te connecter.</p>
                                            </div>
                                        </div>
                                        <div className={`w-10 h-6 md:w-12 md:h-7 rounded-full relative border transition-colors ${biometricEnabled ? 'bg-blue-500/20 border-blue-500/30' : 'bg-slate-700/50 border-white/10'}`}>
                                            <div className={`absolute top-1 w-3 h-3 md:w-4 md:h-4 rounded-full transition-all ${biometricEnabled ? 'right-1 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'left-1 bg-slate-500'}`}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Settings;
