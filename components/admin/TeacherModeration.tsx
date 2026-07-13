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
  School,
  Printer,
  AlertTriangle,
  Trash2,
  Send,
  CheckCircle,
  Bell
} from 'lucide-react';
import { 
  moderateTeacher, 
  suspendTeacher, 
  deleteTeacher, 
  getTeachersByStatus, 
  sendTeacherNotification 
} from '../../services/tutorService';
import Skeleton from '../Skeleton';

type StatusTab = 'pending' | 'verified' | 'rejected';

const TeacherModeration: React.FC = () => {
    const [statusTab, setStatusTab] = useState<StatusTab>('pending');
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState<any | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'parcours' | 'documents' | 'notify'>('profile');

    // Direct Message Form State
    const [notifTitle, setNotifTitle] = useState('');
    const [notifMessage, setNotifMessage] = useState('');
    const [notifSuccess, setNotifSuccess] = useState(false);

    useEffect(() => {
        loadApplications();
    }, [statusTab]);

    const loadApplications = async () => {
        setLoading(true);
        try {
            const apps = await getTeachersByStatus(statusTab);
            setApplications(apps);
        } catch (error) {
            console.error("Error loading apps:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, actionType: 'verified' | 'rejected' | 'suspend' | 'delete') => {
        setProcessingId(id);
        try {
            if (actionType === 'verified') {
                await moderateTeacher(id, 'verified');
            } else if (actionType === 'rejected') {
                await moderateTeacher(id, 'rejected');
            } else if (actionType === 'suspend') {
                await suspendTeacher(id);
            } else if (actionType === 'delete') {
                if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette fiche enseignant ? Ses justificatifs et ses avis seront effacés.")) {
                    await deleteTeacher(id);
                } else {
                    return;
                }
            }
            
            // Remove from current tab list
            setApplications(prev => prev.filter(app => app.id !== id));
            if (selectedApp?.id === id) setSelectedApp(null);
        } catch (error) {
            console.error("Action error:", error);
            alert("Erreur lors de l'exécution de l'action.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedApp) return;
        setProcessingId(selectedApp.id);
        try {
            await sendTeacherNotification(selectedApp.userId, notifTitle, notifMessage);
            setNotifSuccess(true);
            setNotifTitle('');
            setNotifMessage('');
            setTimeout(() => setNotifSuccess(false), 5000);
        } catch (error) {
            console.error("Error sending notif:", error);
            alert("Erreur lors de l'envoi du message.");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Validation Enseignants</h2>
                  <p className="text-xs text-slate-500">{applications.length} enseignants listés</p>
                </div>
                
                {/* Status Tab Selector */}
                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-black/5 dark:border-white/5 w-fit">
                    {[
                        { id: 'pending', label: 'En attente' },
                        { id: 'verified', label: 'Validés' },
                        { id: 'rejected', label: 'Rejetés' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setStatusTab(tab.id as StatusTab);
                                setSelectedApp(null);
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusTab === tab.id ? 'bg-primary text-white shadow-glow' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {applications.length === 0 ? (
                        <div className="col-span-full py-20 text-center animate-fade-in">
                            <ShieldCheck size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                            <p className="text-slate-500 font-medium italic">Aucun enseignant dans cette catégorie.</p>
                        </div>
                    ) : (
                        applications.map((app) => (
                            <motion.div
                                key={app.id}
                                layoutId={app.id}
                                onClick={() => {
                                    setSelectedApp(app);
                                    setActiveTab('profile');
                                }}
                                className={`group bg-[#0c1025] hover:bg-slate-900/40 p-5 rounded-3xl border border-white/5 hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden ${selectedApp?.id === app.id ? 'ring-2 ring-primary/50' : ''}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                                        {app.avatarUrl ? (
                                            <img src={app.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={24} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{app.firstName} {app.lastName}</h3>
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
            )}

            {/* Modal de Détails */}
            <AnimatePresence>
                {selectedApp && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-950 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 no-print">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                                        {selectedApp.avatarUrl ? (
                                            <img src={selectedApp.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={32} className="text-slate-700" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">{selectedApp.firstName} {selectedApp.lastName}</h3>
                                        <p className="text-xs text-slate-400">Postulant {selectedApp.type === 'benevolent' ? 'Bénévole' : 'Professionnel'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => window.print()} 
                                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all"
                                    >
                                        <Printer size={14} /> Imprimer
                                    </button>
                                    <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                        <X size={20} className="text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Tabs Selector */}
                            <div className="flex border-b border-white/5 bg-slate-950/40 no-print">
                                {[
                                    { id: 'profile', label: 'Fiche Identité' },
                                    { id: 'parcours', label: 'Parcours & Matières' },
                                    { id: 'documents', label: 'Justificatifs' },
                                    { id: 'notify', label: 'Avertir / Message', visible: statusTab !== 'pending' }
                                ].map((tab) => (
                                    (tab.visible === undefined || tab.visible) && (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${activeTab === tab.id ? 'border-primary text-white bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    )
                                ))}
                            </div>

                             {/* Modal Content */}
                             <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar print-area">
                                 <style dangerouslySetInnerHTML={{ __html: `
                                     @media print {
                                         body {
                                             background: white !important;
                                             color: black !important;
                                         }
                                         .no-print {
                                             display: none !important;
                                         }
                                         .print-area {
                                             display: block !important;
                                             background: white !important;
                                             color: black !important;
                                             padding: 0 !important;
                                             margin: 0 !important;
                                             border: none !important;
                                             box-shadow: none !important;
                                             max-height: none !important;
                                             overflow: visible !important;
                                         }
                                         .print-area * {
                                             color: black !important;
                                             border-color: #cbd5e1 !important;
                                         }
                                     }
                                 `}} />

                                 {/* SECTION 1: FICHE IDENTITÉ */}
                                 <div className={`${activeTab === 'profile' ? 'block' : 'hidden print:block'} space-y-6`}>
                                     <div className="grid grid-cols-2 gap-6 border-b border-white/5 pb-6 print:border-slate-300">
                                         <div>
                                             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nom complet</h4>
                                             <p className="text-sm font-bold text-white mt-1 print:text-slate-900">{selectedApp.firstName} {selectedApp.lastName}</p>
                                         </div>
                                         <div>
                                             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Type Enseignant</h4>
                                             <p className="text-sm font-bold text-white mt-1 print:text-slate-900">{selectedApp.type === 'benevolent' ? 'Bénévole' : 'Professionnel'}</p>
                                         </div>
                                         <div>
                                             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Localisation</h4>
                                             <p className="text-sm font-bold text-white mt-1 print:text-slate-900">{selectedApp.neighborhood}, {selectedApp.city}</p>
                                         </div>
                                         <div>
                                             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Numéro WhatsApp</h4>
                                             <p className="text-sm font-bold text-success mt-1 print:text-slate-900">{selectedApp.whatsappNumber}</p>
                                         </div>
                                     </div>

                                     <div className="space-y-2">
                                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Biographie & Présentation</h4>
                                         <p className="text-xs text-slate-300 leading-relaxed font-medium bg-white/5 p-4 rounded-2xl border border-white/5 print:bg-slate-50 print:border-slate-300 print:text-slate-900">{selectedApp.bio || "Aucune biographie fournie."}</p>
                                     </div>
                                 </div>

                                 {/* SECTION 2: PARCOURS & MATIÈRES */}
                                 <div className={`${activeTab === 'parcours' ? 'block' : 'hidden print:block'} space-y-6`}>
                                     <div className="space-y-4">
                                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2 print:text-slate-700 print:border-slate-300">Matières Enseignées</h4>
                                         <div className="flex flex-wrap gap-2">
                                             {selectedApp.subjects && selectedApp.subjects.length > 0 ? (
                                                 selectedApp.subjects.map((subject: string) => (
                                                     <span key={subject} className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black rounded-xl uppercase tracking-widest print:bg-slate-100 print:border-slate-300 print:text-slate-800">{subject}</span>
                                                 ))
                                             ) : (
                                                 <span className="text-xs text-slate-500 italic">Aucune matière sélectionnée.</span>
                                             )}
                                         </div>
                                     </div>

                                     <div className="space-y-4 pt-4">
                                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2 print:text-slate-700 print:border-slate-300">Écoles & Établissements fréquentés</h4>
                                         <div className="flex flex-col gap-2">
                                             {selectedApp.schools && selectedApp.schools.length > 0 ? (
                                                 selectedApp.schools.map((school: string) => (
                                                     <div key={school} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 print:bg-slate-50 print:border-slate-300">
                                                         <School size={16} className="text-primary print:text-slate-800" />
                                                         <span className="text-xs text-slate-300 font-bold print:text-slate-800">{school}</span>
                                                     </div>
                                                 ))
                                             ) : (
                                                 <span className="text-xs text-slate-500 italic">Aucune école mentionnée.</span>
                                             )}
                                         </div>
                                     </div>
                                 </div>

                                 {/* SECTION 3: PIÈCES JOINTES */}
                                 <div className={`${activeTab === 'documents' ? 'block' : 'hidden print:block'} space-y-6`}>
                                     <section className="space-y-4">
                                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-success border-b border-white/5 pb-2 print:text-slate-700 print:border-slate-300">Diplômes, CV & Justificatifs</h4>
                                         <div className="flex flex-col gap-3">
                                             {selectedApp.teacher_proofs?.length > 0 ? (
                                                 selectedApp.teacher_proofs.map((proof: any, idx: number) => {
                                                     const fileUrl = proof.file_url || '';
                                                     const fileName = fileUrl.startsWith('data:') 
                                                        ? `Document Justificatif #${idx + 1}` 
                                                        : (fileUrl.split('/').pop() || 'document');
                                                     const isPdf = fileUrl.toLowerCase().endsWith('.pdf') || fileUrl.includes('application/pdf');
                                                     const isWord = fileUrl.toLowerCase().endsWith('.doc') || fileUrl.toLowerCase().endsWith('.docx') || fileUrl.includes('officedocument') || fileUrl.includes('msword');
                                                     return (
                                                         <div key={proof.id} className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-3xl hover:bg-white/10 hover:border-primary/50 transition-all group print:bg-slate-50 print:border-slate-200">
                                                             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/20 to-primary/20 flex items-center justify-center text-success shrink-0 print:from-slate-200 print:to-slate-300">
                                                                 <BookOpen size={24} />
                                                             </div>
                                                             <div className="flex-1 min-w-0">
                                                                 <p className="text-xs font-black text-white truncate print:text-slate-800">{decodeURIComponent(fileName)}</p>
                                                                 <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                                                                     {isPdf ? 'Fichier PDF' : isWord ? 'Document Word' : 'Justificatif Image'}
                                                                 </p>
                                                             </div>
                                                             <a 
                                                                 href={fileUrl} 
                                                                 target="_blank" 
                                                                 rel="noreferrer"
                                                                 className="px-4 py-2 bg-white/5 hover:bg-success text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 no-print"
                                                             >
                                                                 <ExternalLink size={14} /> Ouvrir / Voir
                                                             </a>
                                                             <div className="hidden print:block text-[10px] font-bold text-slate-500">
                                                                 Lien : {fileUrl.startsWith('data:') ? 'Fichier Embarqué (Base64)' : fileUrl}
                                                             </div>
                                                         </div>
                                                     );
                                                 })
                                             ) : (
                                                 <div className="p-8 rounded-3xl border border-white/5 border-dashed text-center print:border-slate-300">
                                                     <p className="text-xs text-slate-600 italic">Aucun document justificatif fourni dans le dossier.</p>
                                                 </div>
                                             )}
                                         </div>
                                     </section>
                                 </div>

                                 {/* SECTION 4: ENVOYER MESSAGE / NOTIFICATION */}
                                 {activeTab === 'notify' && (
                                     <div className="space-y-4">
                                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-b border-white/5 pb-2">Envoyer un Message / Avertissement</h4>
                                         
                                         {notifSuccess ? (
                                             <div className="p-6 bg-success/15 border border-success/30 rounded-2xl text-center space-y-2">
                                                 <CheckCircle size={32} className="mx-auto text-success" />
                                                 <h4 className="text-xs font-black uppercase tracking-widest text-success">Message Envoyé !</h4>
                                                 <p className="text-[10px] text-slate-400">L'enseignant recevra une notification instantanée.</p>
                                             </div>
                                         ) : (
                                             <form onSubmit={handleSendNotification} className="space-y-4">
                                                 <div className="space-y-2">
                                                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Objet / Titre</label>
                                                     <input 
                                                         type="text" 
                                                         value={notifTitle} 
                                                         onChange={e => setNotifTitle(e.target.value)} 
                                                         placeholder="ex: Avertissement de sécurité, Félicitations..."
                                                         className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all"
                                                         required 
                                                     />
                                                 </div>
                                                 <div className="space-y-2">
                                                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Contenu de l'avis</label>
                                                     <textarea 
                                                         value={notifMessage} 
                                                         onChange={e => setNotifMessage(e.target.value)} 
                                                         placeholder="Rédigez votre message à l'enseignant..."
                                                         className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all h-28 resize-none"
                                                         required 
                                                     />
                                                 </div>
                                                 <button 
                                                     type="submit" 
                                                     disabled={!!processingId}
                                                     className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                 >
                                                     <Send size={14} /> Envoyer le message
                                                 </button>
                                             </form>
                                         )}
                                     </div>
                                 )}
                             </div>

                             {/* Modal Footer */}
                             <div className="p-6 bg-white/5 border-t border-white/5 grid grid-cols-2 gap-4 no-print">
                                 {statusTab === 'pending' ? (
                                     <>
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
                                     </>
                                 ) : statusTab === 'verified' ? (
                                     <>
                                         <button 
                                             onClick={() => handleAction(selectedApp.id, 'suspend')}
                                             disabled={!!processingId}
                                             className="py-4 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-orange-500/20"
                                         >
                                             {processingId === selectedApp.id ? '...' : <><AlertTriangle size={16} /> Suspendre</>}
                                         </button>
                                         <button 
                                             onClick={() => handleAction(selectedApp.id, 'delete')}
                                             disabled={!!processingId}
                                             className="py-4 bg-red-500/15 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-red-500/20"
                                         >
                                             {processingId === selectedApp.id ? '...' : <><Trash2 size={16} /> Supprimer Fiche</>}
                                         </button>
                                     </>
                                 ) : (
                                     <>
                                         <button 
                                             onClick={() => handleAction(selectedApp.id, 'verified')}
                                             disabled={!!processingId}
                                             className="py-4 bg-success/20 hover:bg-success text-success hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-success/30"
                                         >
                                             {processingId === selectedApp.id ? '...' : <><Check size={16} /> Valider / Réactiver</>}
                                         </button>
                                         <button 
                                             onClick={() => handleAction(selectedApp.id, 'delete')}
                                             disabled={!!processingId}
                                             className="py-4 bg-red-500/15 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-red-500/20"
                                         >
                                             {processingId === selectedApp.id ? '...' : <><Trash2 size={16} /> Supprimer Fiche</>}
                                         </button>
                                     </>
                                 )}
                             </div>
                         </motion.div>
                     </motion.div>
                 )}
             </AnimatePresence>
         </div>
     );
 };
 
 export default TeacherModeration;
