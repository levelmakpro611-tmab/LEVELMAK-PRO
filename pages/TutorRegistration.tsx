import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  BookOpen, 
  FileText, 
  Upload, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  X,
  Phone,
  School,
  Star
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { applyAsTeacher } from '../services/tutorService';
import { Teacher } from '../types';

const GUINEA_CITIES = [
  'Conakry', 'Kindia', 'Boké', 'Mamou', 'Labé', 'Faranah', 'Kankan', 'Nzérékoré', 
  'Kissidougou', 'Guéckédou', 'Coyah', 'Dubréka'
];

const SUBJECTS = [
  'Mathématiques', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Français', 
  'Anglais', 'Histoire', 'Géographie', 'Informatique'
];

const TutorRegistration: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { user, t } = useStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    whatsappNumber: user?.phoneNumber || '',
    city: 'Conakry',
    neighborhood: '',
    subjects: [] as string[],
    schools: [''],
    type: 'professional' as 'professional' | 'benevolent'
  });

  const [avatar, setAvatar] = useState<File | null>(null);
  const [proofs, setProofs] = useState<File[]>([]);

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'proof') => {
    if (e.target.files) {
      if (type === 'avatar') {
        setAvatar(e.target.files[0]);
      } else {
        setProofs(prev => [...prev, ...Array.from(e.target.files!)]);
      }
    }
  };

  const removeFile = (index: number) => {
    setProofs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (proofs.length === 0) {
        setError("Veuillez ajouter au moins une preuve (diplôme ou attestation).");
        return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await applyAsTeacher(user.id, formData as any, proofs, avatar || undefined);
      if (submitError) throw submitError;
      
      setSuccess(true);
      setTimeout(() => onComplete(), 3000);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'envoi de votre candidature.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center text-success animate-bounce">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white">Candidature Envoyée !</h2>
        <p className="text-slate-500 max-w-sm">
          Votre dossier est en cours d'examen par notre équipe. Vous recevrez une notification dès que votre profil sera validé.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Devenir <span className="text-gradient-primary">Enseignant</span>
        </h1>
        <p className="text-slate-500 font-medium">Rejoignez l'élite pédagogique de Levelmak Pro</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i}
            className={`h-1.5 rounded-full transition-all ${step >= i ? 'w-12 bg-primary' : 'w-6 bg-slate-200 dark:bg-slate-800'}`}
          />
        ))}
      </div>

      {/* Form Content */}
      <div className="glass p-6 md:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl min-h-[400px] flex flex-col">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 flex-1"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 text-primary rounded-xl"><User size={20} /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Informations Personnelles</h3>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Prénom</label>
                    <input 
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={e => setFormData({...formData, firstName: e.target.value})}
                        className="w-full p-4 bg-black/5 dark:bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 text-white font-bold"
                        placeholder="Votre prénom"
                    />
                    </div>
                    <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Nom</label>
                    <input 
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={e => setFormData({...formData, lastName: e.target.value})}
                        className="w-full p-4 bg-black/5 dark:bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 text-white font-bold"
                        placeholder="Votre nom de famille"
                    />
                    </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Photo de Profil (Professionnelle)</label>
                  <label className="w-full h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all cursor-pointer overflow-hidden relative">
                    {avatar ? (
                      <img src={URL.createObjectURL(avatar)} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload size={20} className="text-slate-500" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Cliquez pour ajouter</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'avatar')} />
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Numéro WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="tel"
                      value={formData.whatsappNumber}
                      onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-black/5 dark:bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 text-white font-bold"
                      placeholder="+224 ..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Bio / Présentation</label>
                  <textarea 
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                    rows={4}
                    className="w-full p-4 bg-black/5 dark:bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 text-white font-bold resize-none"
                    placeholder="Présentez votre expérience et votre passion pour l'enseignement..."
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 flex-1"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-secondary/10 text-secondary rounded-xl"><BookOpen size={20} /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Expertise Pédagogique</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Type de Profil</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setFormData({...formData, type: 'professional'})}
                      className={`p-4 rounded-2xl border transition-all text-xs font-bold ${formData.type === 'professional' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-slate-500'}`}
                    >
                      Professionnel (Payant)
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, type: 'benevolent'})}
                      className={`p-4 rounded-2xl border transition-all text-xs font-bold ${formData.type === 'benevolent' ? 'bg-secondary/20 border-secondary text-secondary' : 'bg-white/5 border-white/10 text-slate-500'}`}
                    >
                      Bénévole (Gratuit)
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Matières</label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleSubject(s)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${formData.subjects.includes(s) ? 'bg-primary text-white border-primary shadow-glow' : 'bg-white/5 border-white/10 text-slate-400'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">École actuelle / Université</label>
                  <div className="relative">
                    <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text"
                      value={formData.schools[0]}
                      onChange={e => setFormData({...formData, schools: [e.target.value]})}
                      className="w-full pl-12 pr-4 py-4 bg-black/5 dark:bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 text-white font-bold"
                      placeholder="Ex: Université de Conakry"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 flex-1"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-accent/10 text-accent rounded-xl"><MapPin size={20} /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Localisation Personnalisée</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Ville</label>
                  <select 
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="w-full p-4 bg-black/5 dark:bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 text-white font-bold accent-primary"
                  >
                    {GUINEA_CITIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Quartier / Zone</label>
                  <input 
                    type="text"
                    value={formData.neighborhood}
                    onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                    className="w-full p-4 bg-black/5 dark:bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 text-white font-bold"
                    placeholder="Ex: Kaloum, Kaporo, Sangoyah..."
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 flex-1"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-success/10 text-success rounded-xl"><FileText size={20} /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Justificatifs & Preuves</h3>
              </div>
              
              <p className="text-xs text-slate-500">
                Veuillez télécharger une photo de votre diplôme ou d'une attestation d'enseignement. Ces documents resteront confidentiels et ne serviront qu'à votre validation par l'équipe Levelmak.
              </p>

              <div className="space-y-4">
                <label className="w-full border-2 border-dashed border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                    <Upload size={24} />
                  </div>
                  <span className="text-xs font-bold text-slate-400">Cliquez pour ajouter des photos</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'proof')} />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {proofs.map((file, i) => (
                    <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-300 truncate max-w-[80px]">{file.name}</span>
                      <button onClick={() => removeFile(i)} className="text-danger hover:scale-110 transition-transform">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-xs font-bold text-center">
                  {error}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="pt-8 flex items-center justify-between mt-auto">
          {step > 1 ? (
            <button 
              onClick={handlePrev}
              className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
            >
              <ChevronLeft size={16} /> Précédent
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button 
              onClick={handleNext}
              className="px-6 py-4 bg-primary hover:bg-primary-light text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-glow"
            >
              Suivant <ChevronRight size={16} />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-4 bg-success hover:bg-success-light text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-success"
            >
              {loading ? "Envoi en cours..." : "Finaliser & Envoyer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorRegistration;
