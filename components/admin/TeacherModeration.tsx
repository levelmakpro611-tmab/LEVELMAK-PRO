import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  X, 
  Eye, 
  MapPin, 
  BookOpen, 
  Calendar,
  User,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  School
} from 'lucide-react';
import { getPendingApplications, moderateTeacher } from '../../services/tutorService';
import Skeleton from '../Skeleton';

const TeacherModeration: React.FC = () => {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState<any | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadApplications();
    }, []);

    const loadApplications = async () => {
        setLoading(true);
        try {
            const apps = await getPendingApplications();
            setApplications(apps);
        } catch (error) {
            console.error("Error loading apps:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, status: 'verified' | 'rejected') => {
        setProcessingId(id);
        try {
            await moderateTeacher(id, status);
            setApplications(prev => prev.filter(app => app.id !== id));
            if (selectedApp?.id === id) setSelectedApp(null);
        } catch (error) {
            console.error("Action error:", error);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Validation Enseignants</h2>
                    <p className="text-xs text-slate-500">{applications.length} candidatures en attente</p>
                </div>
                <button 
                  onClick={loadApplications}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                >
                  <Calendar size={18} className="text-slate-400" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {applications.length === 0 ? (
                    <div className="col-span-full py-20 text-center animate-fade-in">
                        <ShieldCheck size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                        <p className="text-slate-500 font-medium italic">Aucune candidature à examiner.</p>
                    </div>
                ) : (
                    applications.map((app) => (
                        <motion.div
                            key={app.id}
                            layoutId={app.id}
                            onClick={() => setSelectedApp(app)}
                            className={`group glass p-5 rounded-3xl border border-white/5 hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden ${selectedApp?.id === app.id ? 'ring-2 ring-primary/50' : ''}`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center text-primary shrink-0">
                                    <User size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{app.first_name} {app.last_name}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                            <MapPin size={12} /> {app.city}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                            <BookOpen size={12} /> {app.subjects?.length || 0} matières
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {app.subjects?.slice(0, 2).map((s: string) => (
                                            <span key={s} className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-bold rounded-lg uppercase tracking-widest">{s}</span>
                                        ))}
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-700 group-hover:text-primary transition-colors" />
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Modal de Détails */}
            <AnimatePresence>
                {selectedApp && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-950 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                                        {selectedApp.avatar_url ? (
                                            <img src={selectedApp.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={32} className="text-slate-700" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">{selectedApp.first_name} {selectedApp.last_name}</h3>
                                        <p className="text-xs text-slate-400">Postulant {selectedApp.type === 'benevolent' ? 'Bénévole' : 'Professionnel'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                                <section className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Présentation & Bio</h4>
                                    <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-4 rounded-2xl italic">
                                        "{selectedApp.bio}"
                                    </p>
                                </section>

                                <div className="grid grid-cols-2 gap-6">
                                    <section className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Parcours</h4>
                                        <div className="space-y-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] text-slate-500 font-bold uppercase">Parcours Scolaire</span>
                                                {selectedApp.schools?.map((school: string, i: number) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400 italic">
                                                        <School size={14} className="text-secondary" /> {school}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                                                <MapPin size={14} className="text-accent" /> {selectedApp.neighborhood}, {selectedApp.city}
                                            </div>
                                        </div>
                                    </section>
                                    <section className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Contact</h4>
                                        <a 
                                          href={`https://wa.me/${selectedApp.whatsapp_number}`} 
                                          target="_blank" 
                                          className="text-xs text-success font-bold flex items-center gap-2 hover:underline"
                                        >
                                            <MessageSquare size={14} /> WhatsApp : {selectedApp.whatsapp_number}
                                        </a>
                                    </section>
                                </div>

                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-success">Dossier de candidature (Diplômes / CV)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {selectedApp.teacher_proofs?.length > 0 ? (
                                          selectedApp.teacher_proofs.map((proof: any) => (
                                            <div key={proof.id} className="relative group rounded-3xl overflow-hidden aspect-video border border-white/10 bg-white/5 shadow-xl">
                                                {proof.file_url.toLowerCase().endsWith('.pdf') ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                                                        <BookOpen size={32} className="text-success opacity-50" />
                                                        <span className="text-[10px] font-black text-slate-500 uppercase">Document PDF</span>
                                                    </div>
                                                ) : (
                                                    <img src={proof.file_url} alt="Proof" className="w-full h-full object-cover" />
                                                )}
                                                <a 
                                                  href={proof.file_url} 
                                                  target="_blank" 
                                                  className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 text-[10px] font-black text-white uppercase tracking-[0.2em] backdrop-blur-sm"
                                                >
                                                    <ExternalLink size={16} /> Ouvrir le document
                                                </a>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="col-span-full p-8 rounded-3xl border border-white/5 border-dashed text-center">
                                            <p className="text-xs text-slate-600 italic">Aucun document justificatif fourni dans le dossier.</p>
                                          </div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 bg-white/5 border-t border-white/5 grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => handleAction(selectedApp.id, 'rejected')}
                                    disabled={!!processingId}
                                    className="py-4 bg-danger/20 hover:bg-danger text-danger hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-danger/30"
                                >
                                    {processingId === selectedApp.id ? '...' : <><X size={16} /> Rejeter le profil</>}
                                </button>
                                <button 
                                    onClick={() => handleAction(selectedApp.id, 'verified')}
                                    disabled={!!processingId}
                                    className="py-4 bg-success/20 hover:bg-success text-success hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-success/30 shadow-glow"
                                >
                                    {processingId === selectedApp.id ? '...' : <><Check size={16} /> Valider l'Enseignant</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherModeration;
