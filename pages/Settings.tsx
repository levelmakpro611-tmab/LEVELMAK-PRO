
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
    Sun,
    Volume2,
    Type,
    GraduationCap,
    FileText
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { audioService } from '../services/audio';
import { biometricService } from '../services/biometricService';
import { feedbackService } from '../services/feedbackService';
import { Fingerprint } from 'lucide-react';
import { PRIVACY_POLICY_SECTIONS, TERMS_OF_SERVICE_SECTIONS } from '../utils/legalTexts';
import { getSupportEmail } from '../services/adminService';

const getLegalUrl = (anchor: string) => {
  const isNative = window.location.origin.includes('https://localhost') || window.location.origin.startsWith('capacitor://');
  const base = isNative ? 'https://levelmak.app' : window.location.origin;
  return `${base}/legal.html${anchor}`;
};

const Settings: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
    const { user, updateProfile, addActivity, settings, updateSettings, changePassword, deleteCurrentUserAccount, t } = useStore();
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phoneNumber || '');
    const [education, setEducation] = useState(user?.education || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

    const [supportEmail, setSupportEmail] = useState('Tmab6544@gmail.com');

    React.useEffect(() => {
        const checkBiometric = async () => {
            const enabled = await biometricService.isEnabled();
            setBiometricEnabled(enabled);
        };
        checkBiometric();
    }, []);

    React.useEffect(() => {
        getSupportEmail().then(email => {
            setSupportEmail(email);
        }).catch(err => {
            console.error('Failed to load support email in settings:', err);
        });
    }, []);

    // Password change state (for security section)
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // Account deletion state
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'SUPPRIMER') {
            setDeleteError('Veuillez saisir le texte de confirmation correct.');
            return;
        }
        setDeleteLoading(true);
        setDeleteError('');
        try {
            await deleteCurrentUserAccount(deletePassword);
            alert("Votre compte a été supprimé définitivement.");
            window.location.reload();
        } catch (err: any) {
            setDeleteError(err.message || "Erreur de suppression du compte");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateProfile(name, phone, { education });
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
            setPasswordError(t('settings.minChar'));
            return;
        }
        setPasswordLoading(true);
        setPasswordError('');
        setPasswordSuccess('');
        try {
            await changePassword(oldPassword, newPassword);
            setPasswordSuccess(t('settings.pwUpdated'));
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
        { id: 'security', title: t('settings.security'), icon: Shield, color: 'text-success', bg: 'bg-success/10' },
        { id: 'legal', title: "Conditions et confidentialité", icon: FileText, color: 'text-info', bg: 'bg-info/10' }
    ];

    const replaceSupportEmail = (text: string) => {
        return text.replace(/tmab95544@gmail\.com|tmab6544@gmail\.com/gi, supportEmail);
    };

    if (!user) return null;

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

            <div className="space-y-4 max-w-2xl mx-auto">
                {sections.map((section) => {
                    const isExpanded = expandedSection === section.id;
                    return (
                        <div key={section.id} className="bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl transition-all">
                            {/* Accordion Header */}
                            <button
                                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                                className="w-full flex items-center justify-between p-5 md:p-6 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-all outline-none"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${section.bg} ${section.color}`}>
                                        <section.icon size={22} />
                                    </div>
                                    <div>
                                        <h3 className="font-black tracking-wide text-base md:text-lg text-slate-900 dark:text-white transition-colors">{section.title}</h3>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none mt-1">
                                            {isExpanded ? 'Cliquez pour replier' : 'Cliquez pour déplier'}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>

                            {/* Accordion Content */}
                            <AnimatePresence initial={false}>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    >
                                        <div className="p-6 md:p-8 border-t border-black/5 dark:border-white/10 bg-slate-950/20 space-y-6">
                                            {section.id === 'profile' && (
                                                <div className="space-y-6">
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
                                                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white transition-colors">{t('settings.photoTitle')}</h3>
                                                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{t('settings.changePhotoDesc')}</p>
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
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1">Classe</label>
                                                            <div className="relative">
                                                                <GraduationCap size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                                <input
                                                                    type="text"
                                                                    value={education}
                                                                    onChange={(e) => setEducation(e.target.value)}
                                                                    placeholder="Ex: 10ème, Terminale SM, Université..."
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

                                            {section.id === 'appearance' && (
                                                <div className="space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4 col-span-1 md:col-span-2">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-300">
                                                                    <Palette size={20} className="md:w-6 md:h-6 text-primary" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm transition-colors">{t('settings.darkMode')}</h4>
                                                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none">
                                                                        {settings.theme === 'dark' ? 'Mode Sombre Activé' : 'Mode Clair Activé'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div
                                                                    onClick={() => updateSettings({ theme: 'light' })}
                                                                    className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                                                                        settings.theme === 'light'
                                                                            ? 'bg-white/10 border-primary shadow-glow text-primary scale-[1.02]'
                                                                            : 'bg-black/25 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                                                        settings.theme === 'light' ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400'
                                                                    }`}>
                                                                        <Sun size={24} />
                                                                    </div>
                                                                    <span className="font-black tracking-wider text-xs uppercase">Mode Clair</span>
                                                                </div>

                                                                <div
                                                                    onClick={() => updateSettings({ theme: 'dark' })}
                                                                    className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                                                                        settings.theme === 'dark'
                                                                            ? 'bg-white/10 border-primary shadow-glow text-primary scale-[1.02]'
                                                                            : 'bg-black/25 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                                                        settings.theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400'
                                                                    }`}>
                                                                        <Moon size={24} />
                                                                    </div>
                                                                    <span className="font-black tracking-wider text-xs uppercase">Mode Sombre</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-6 group hover:bg-white/8 transition-all col-span-1 md:col-span-2">
                                                            <div 
                                                                onClick={toggleSound}
                                                                className="flex items-center gap-4 cursor-pointer"
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
                                                            </div>

                                                            <AnimatePresence>
                                                                {settings.soundEnabled && (
                                                                    <motion.div 
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="space-y-3 pt-4 border-t border-white/5 overflow-hidden"
                                                                    >
                                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('settings.soundSettings.title')}</p>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                                            {[
                                                                                { id: 'quiz', label: t('settings.soundSettings.quiz') },
                                                                                { id: 'timeMachine', label: t('settings.soundSettings.timeMachine') },
                                                                                { id: 'notifications', label: t('settings.soundSettings.notifications') }
                                                                            ].map((sub) => (
                                                                                <div 
                                                                                    key={sub.id}
                                                                                    onClick={() => updateSettings({
                                                                                        soundSettings: {
                                                                                            ...settings.soundSettings,
                                                                                            [sub.id]: !settings.soundSettings[sub.id as keyof typeof settings.soundSettings]
                                                                                        }
                                                                                    })}
                                                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${settings.soundSettings[sub.id as keyof typeof settings.soundSettings] ? 'bg-secondary/10 border-secondary/30 text-secondary' : 'bg-black/20 border-white/5 text-slate-500'}`}
                                                                                >
                                                                                    <span className="text-[10px] font-bold uppercase tracking-tight">{sub.label}</span>
                                                                                    <div className={`w-6 h-3 rounded-full relative ${settings.soundSettings[sub.id as keyof typeof settings.soundSettings] ? 'bg-secondary/40' : 'bg-slate-700'}`}>
                                                                                        <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${settings.soundSettings[sub.id as keyof typeof settings.soundSettings] ? 'right-0.5' : 'left-0.5'}`}></div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>

                                                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4 col-span-1 md:col-span-2">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-300">
                                                                    <Globe size={20} className="md:w-6 md:h-6 text-accent" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm transition-colors">{t('settings.lang')}</h4>
                                                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none">
                                                                        {settings.language === 'fr' ? 'Français' : settings.language === 'ar' ? 'العربية' : 'English'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-3 gap-3">
                                                                {[
                                                                    { code: 'fr', name: 'Français', label: 'FR', flag: '🇫🇷' },
                                                                    { code: 'en', name: 'English', label: 'EN', flag: '🇬🇧' },
                                                                    { code: 'ar', name: 'العربية', label: 'AR', flag: '🇸🇦' }
                                                                ].map((lang) => {
                                                                    const isActive = settings.language === lang.code;
                                                                    return (
                                                                        <div
                                                                            key={lang.code}
                                                                            onClick={() => updateSettings({ language: lang.code as any })}
                                                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center ${
                                                                                isActive
                                                                                    ? 'bg-white/10 border-accent shadow-glow text-accent scale-[1.02]'
                                                                                    : 'bg-black/25 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                                                            }`}
                                                                        >
                                                                            <span className="text-2xl md:text-3xl filter saturate-100">{lang.flag}</span>
                                                                            <span className="font-bold text-xs md:text-sm text-slate-900 dark:text-white transition-colors">{lang.name}</span>
                                                                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60">{lang.label}</span>
                                                                        </div>
                                                                    );
                                                                })}
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

                                            {section.id === 'notifications' && (
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
                                            )}

                                            {section.id === 'security' && (
                                                <div className="space-y-6">
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
                                                                    placeholder={t('settings.newPwPlaceholder')}
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
                                                            {t('settings.active')}
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
                                                                <h4 className="font-bold text-slate-900 dark:text-white text-xs transition-colors">{t('settings.biometricTitle')}</h4>
                                                                <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-tight">{t('settings.biometricDesc')}</p>
                                                            </div>
                                                        </div>
                                                        <div className={`w-10 h-6 md:w-12 md:h-7 rounded-full relative border transition-colors ${biometricEnabled ? 'bg-blue-500/20 border-blue-500/30' : 'bg-slate-700/50 border-white/10'}`}>
                                                            <div className={`absolute top-1 w-3 h-3 md:w-4 md:h-4 rounded-full transition-all ${biometricEnabled ? 'right-1 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'left-1 bg-slate-500'}`}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {section.id === 'legal' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                                        <div className="space-y-1">
                                                            <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 transition-colors">
                                                                <FileText className="text-primary" /> Conditions et confidentialité
                                                            </h3>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">LEVELMAK Pro • TMAB GROUP</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white/5 border border-white/5 p-6 rounded-3xl space-y-4">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-left">
                                                            Pour vous offrir une expérience d'utilisation fluide et sécurisée, nos conditions générales et notre politique de confidentialité sont désormais hébergées et consultables en ligne.
                                                        </p>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); window.open(getLegalUrl('#p-sec-1'), '_system'); }}
                                                                className="p-5 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 text-primary-light transition-all flex flex-col items-center justify-center gap-2 text-center"
                                                            >
                                                                <span className="font-black text-xs uppercase tracking-wider text-primary">Politique de Confidentialité</span>
                                                                <span className="text-[9px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-tight">Données & Sécurité</span>
                                                            </button>

                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); window.open(getLegalUrl('#t-sec-1'), '_system'); }}
                                                                className="p-5 rounded-2xl bg-secondary/10 border border-secondary/20 hover:bg-secondary/20 hover:border-secondary/40 text-secondary-light transition-all flex flex-col items-center justify-center gap-2 text-center"
                                                            >
                                                                <span className="font-black text-xs uppercase tracking-wider text-secondary">Conditions d'Utilisation (CGU)</span>
                                                                <span className="text-[9px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-tight">Règles & Engagements</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}

                {/* Supprimer mon compte Collapsible Panel */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-3xl overflow-hidden shadow-xl transition-all">
                    {/* Header */}
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'delete_account' ? null : 'delete_account')}
                        className="w-full flex items-center justify-between p-5 md:p-6 text-left hover:bg-red-500/10 transition-all outline-none"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-red-500/10 text-red-500">
                                <User size={22} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-black tracking-wide text-base md:text-lg text-red-500">Supprimer mon compte</h3>
                                <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest leading-none mt-1">
                                    Zone de danger • Irréversible
                                </p>
                            </div>
                        </div>
                        <ChevronRight size={18} className={`text-red-400 transition-transform ${expandedSection === 'delete_account' ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Content */}
                    <AnimatePresence initial={false}>
                        {expandedSection === 'delete_account' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                            >
                                <div className="p-6 md:p-8 border-t border-red-500/10 bg-red-950/10 space-y-4">
                                    <p className="text-xs text-red-400 font-medium leading-relaxed">
                                        Cette action supprimera définitivement votre compte, vos points, LevelCoins, badges, écrits, et toutes les données de Levelmak. Cette action est irréversible.
                                    </p>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-red-400 font-black uppercase tracking-widest block">Confirmer votre mot de passe actuel</label>
                                            <input
                                                type="password"
                                                value={deletePassword}
                                                onChange={(e) => setDeletePassword(e.target.value)}
                                                className="w-full bg-black/40 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none transition-all placeholder:text-slate-700"
                                                placeholder="Saisissez votre mot de passe"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] text-red-400 font-black uppercase tracking-widest block">Tapez "SUPPRIMER" pour confirmer</label>
                                            <input
                                                type="text"
                                                value={deleteConfirmText}
                                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                className="w-full bg-black/40 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none transition-all placeholder:text-slate-700"
                                                placeholder="SUPPRIMER"
                                            />
                                        </div>

                                        {deleteError && (
                                            <div className="bg-red-500/10 text-red-400 p-3 rounded-xl border border-red-500/20 text-xs font-bold text-center">
                                                {deleteError}
                                            </div>
                                        )}

                                        <button
                                            onClick={handleDeleteAccount}
                                            disabled={deleteLoading || !deletePassword || deleteConfirmText !== 'SUPPRIMER'}
                                            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 flex items-center justify-center"
                                        >
                                            {deleteLoading ? "Suppression..." : "Supprimer définitivement mon compte"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Settings;
