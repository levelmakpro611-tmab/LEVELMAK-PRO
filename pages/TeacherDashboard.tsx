import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Star, 
  TrendingUp, 
  MessageSquare, 
  Calendar,
  ShieldCheck,
  Clock,
  Phone,
  LogOut,
  ChevronRight,
  AlertCircle,
  Settings,
  Bell,
  HelpCircle,
  Menu,
  X,
  BookOpen,
  Send,
  CheckCircle,
  MapPin,
  Sparkles
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { 
  getTeacherDashboardData, 
  getMyTeacherProfile, 
  updateTeacherProfile,
  submitPlatformComment,
  submitPlatformRating
} from '../services/tutorService';
import { supabase } from '../services/supabase';
import { Teacher, TeacherRating } from '../types';
import Skeleton from '../components/Skeleton';

type ActiveTab = 'dashboard' | 'announcements' | 'settings' | 'feedback' | 'rating';

const TeacherDashboard: React.FC = () => {
  const { user, logout, t } = useStore();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [data, setData] = useState<any>(null);
  const [studentPhones, setStudentPhones] = useState<{ [id: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Local form states for settings
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSchools, setEditSchools] = useState('');
  const [editSubjects, setEditSubjects] = useState<string[]>([]);

  // Feedback form states
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Rating form states
  const [ratingScore, setRatingScore] = useState<number>(10);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSuccess, setRatingSuccess] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Set form defaults once profile is loaded
  useEffect(() => {
    if (teacher) {
      setEditFirstName(teacher.firstName || '');
      setEditLastName(teacher.lastName || '');
      setEditWhatsapp(teacher.whatsappNumber || '');
      setEditCity(teacher.city || 'Conakry');
      setEditNeighborhood(teacher.neighborhood || '');
      setEditBio(teacher.bio || '');
      setEditSchools(teacher.schools?.join(', ') || '');
      setEditSubjects(teacher.subjects || []);
    }
  }, [teacher]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profile = await getMyTeacherProfile(user.id);
      if (profile) {
        setTeacher(profile);
        const dashboardData = await getTeacherDashboardData(profile.id);
        setData(dashboardData);

        // Fetch student phone numbers for WhatsApp integration
        if (dashboardData.consultations && dashboardData.consultations.length > 0) {
          const studentIds = dashboardData.consultations
            .map((c: any) => c.student_id)
            .filter(Boolean);

          if (studentIds.length > 0) {
            const { data: studentProfiles } = await supabase
              .from('profiles')
              .select('id, phone_number')
              .in('id', studentIds);

            if (studentProfiles) {
              const phoneMap: { [id: string]: string } = {};
              studentProfiles.forEach(p => {
                if (p.phone_number) phoneMap[p.id] = p.phone_number;
              });
              setStudentPhones(phoneMap);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !user) return;
    setUpdating(true);
    try {
      const schoolsArray = editSchools
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      await updateTeacherProfile(teacher.id, user.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        whatsappNumber: editWhatsapp.trim(),
        city: editCity,
        neighborhood: editNeighborhood.trim(),
        bio: editBio.trim(),
        schools: schoolsArray,
        subjects: editSubjects
      });

      // Reload
      await fetchDashboardData();
      alert("Profil mis à jour avec succès !");
    } catch (err: any) {
      console.error("Error updating settings:", err);
      alert("Erreur lors de la mise à jour : " + (err.message || err));
    } finally {
      setUpdating(false);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await submitPlatformComment(user.id, user.name, user.phoneNumber || '', feedbackContent, feedbackCategory);
      setFeedbackSuccess(true);
      setFeedbackContent('');
      setTimeout(() => setFeedbackSuccess(false), 5000);
    } catch (err) {
      console.error("Error sending feedback:", err);
      alert("Impossible d'envoyer le commentaire.");
    }
  };

  const handleSendRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await submitPlatformRating(user.id, user.name, ratingScore, ratingComment);
      setRatingSuccess(true);
      setRatingComment('');
      setTimeout(() => setRatingSuccess(false), 5000);
    } catch (err) {
      console.error("Error sending rating:", err);
      alert("Impossible d'envoyer la note.");
    }
  };

  // Notification count
  const unreadNotifsCount = user?.stats?.notifications?.filter((n: any) => !n.read).length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060915] p-6 space-y-6 flex flex-col items-center justify-center">
        <Skeleton className="h-40 w-full max-w-4xl rounded-[2.5rem]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)}
        </div>
        <Skeleton className="h-64 w-full max-w-4xl rounded-[2.5rem]" />
      </div>
    );
  }

  // Pending applicant view
  if (!teacher || teacher.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#060915] flex flex-col items-center justify-center p-4 md:p-6 text-center relative overflow-hidden py-20">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl space-y-6 relative z-10"
        >
          <div className="glass p-8 md:p-12 rounded-[3.5rem] border border-white/10 shadow-2xl space-y-8">
            <div className="relative group w-fit mx-auto">
              <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto shadow-glow-purple">
                  <Clock size={40} className="text-white animate-float" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                  Inscription Envoyée ! 🚀
              </h2>
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Vérification en cours</span>
              </div>
            </div>

            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                Ton compte est en attente de validation par l'administration Levelmak. Nous vérifions tes informations et tes justificatifs pour garantir la qualité de l'élite.
            </p>

            {teacher && (
              <div className="bg-white/5 rounded-3xl p-6 border border-white/5 text-left space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden">
                    {teacher.avatarUrl ? (
                      <img src={teacher.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Users size={24} className="text-slate-700" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{teacher.firstName} {teacher.lastName}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{teacher.type === 'benevolent' ? 'Bénévole' : 'Professionnel'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Localisation</p>
                    <p className="text-xs text-slate-300 font-bold">{teacher.neighborhood}, {teacher.city}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">WhatsApp</p>
                    <p className="text-xs text-success font-black">{teacher.whatsappNumber}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Matières Enseignées</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {teacher.subjects.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded-lg uppercase">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-white/5">
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Documents Fournis</p>
                  <div className="flex flex-col gap-2 mt-1">
                    {teacher.teacher_proofs && teacher.teacher_proofs.length > 0 ? (
                      teacher.teacher_proofs.map((proof: any, idx: number) => {
                        const fileUrl = proof.file_url || '';
                        const fileName = fileUrl.startsWith('data:') 
                          ? `Document Justificatif #${idx + 1}` 
                          : (fileUrl.split('/').pop() || 'document');
                        return (
                          <div key={proof.id} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl border border-white/5 text-[10px]">
                            <span className="text-slate-300 font-bold truncate max-w-[200px]">{decodeURIComponent(fileName)}</span>
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold uppercase tracking-wider text-[8px]">Voir</a>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[9px] text-slate-500 italic">Aucun document justificatif fourni.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 space-y-4">
                <button 
                  onClick={() => window.open('https://wa.me/224626440296', '_blank')}
                  className="w-full py-4 bg-primary hover:bg-primary/95 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-glow flex items-center justify-center gap-2"
                >
                    <HelpCircle size={16} /> Contacter le Support
                </button>
                <button 
                  onClick={logout} 
                  className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white font-black text-xs uppercase tracking-widest transition-all"
                >
                    Se Déconnecter
                </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060915] text-white flex flex-col lg:flex-row">
      
      {/* MOBILE HEADER */}
      <header className="lg:hidden bg-slate-900/80 border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center overflow-hidden shrink-0">
            {teacher.avatarUrl ? (
              <img src={teacher.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-black">{teacher.firstName?.charAt(0)}</span>
            )}
          </div>
          <span className="text-xs font-black uppercase tracking-widest">{teacher.firstName} {teacher.lastName}</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-white/5 rounded-xl hover:bg-white/10"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* RESPONSIVE SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#090d21] border-r border-white/5 z-50 flex flex-col transition-all duration-300 transform lg:translate-x-0 lg:static lg:h-screen ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 p-0.5">
            <div className="w-full h-full bg-slate-900 rounded-[0.9rem] overflow-hidden flex items-center justify-center">
              {teacher.avatarUrl ? (
                <img src={teacher.avatarUrl} alt={teacher.firstName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-black">{teacher.firstName?.charAt(0)}</span>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-tight truncate max-w-[150px]">{teacher.firstName} {teacher.lastName}</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{teacher.type === 'benevolent' ? 'Bénévole' : 'Pro'}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: <TrendingUp size={16} /> },
            { id: 'announcements', label: 'IMPORTANT', icon: <Bell size={16} />, badge: unreadNotifsCount },
            { id: 'settings', label: 'Paramètres', icon: <Settings size={16} /> },
            { id: 'feedback', label: 'Commentaire', icon: <MessageSquare size={16} /> },
            { id: 'rating', label: 'Note App', icon: <Star size={16} /> }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as ActiveTab);
                setIsSidebarOpen(false);
              }}
              className={`w-full px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === item.id ? 'bg-primary text-white shadow-glow' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-[8px] rounded-full">{item.badge}</span>
              )}
            </button>
          ))}
          
          <button
            onClick={logout}
            className="w-full px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </nav>

        {/* Support Card */}
        <div className="p-4 border-t border-white/5">
          <div 
            onClick={() => window.open('https://wa.me/224626440296', '_blank')}
            className="cursor-pointer group bg-gradient-to-br from-primary/10 to-purple-600/10 rounded-2xl border border-primary/20 p-4 text-center hover:border-primary/50 transition-all"
          >
            <HelpCircle size={24} className="mx-auto text-primary mb-2 group-hover:animate-float" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Aide & Assistance</h4>
            <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Centre d'Aide Elite</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            
            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <>
                {/* Dashboard Profile Header */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#121832] to-[#0c1025] border border-white/5 p-6 md:p-8 shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/15 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 p-0.5">
                      <div className="w-full h-full bg-slate-900 rounded-[0.9rem] overflow-hidden flex items-center justify-center">
                        {teacher.avatarUrl ? (
                          <img src={teacher.avatarUrl} alt={teacher.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-black">{teacher.firstName?.charAt(0)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-center md:text-left space-y-1">
                      <div className="flex flex-col md:flex-row items-center gap-2">
                        <h1 className="text-xl md:text-2xl font-black tracking-tight">
                          Bonjour, {teacher.firstName} {teacher.lastName}
                        </h1>
                        <span className="px-2 py-0.5 bg-success/15 border border-success/30 text-success text-[8px] font-black rounded-lg uppercase tracking-widest">Compte Vérifié</span>
                      </div>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{teacher.subjects?.join(' | ') || 'Aucune matière'}</p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass p-5 rounded-3xl border border-white/5 space-y-1.5">
                    <div className="w-8 h-8 bg-primary/15 rounded-xl flex items-center justify-center text-primary">
                      <Users size={16} />
                    </div>
                    <p className="text-xl font-black">{data?.stats.totalConsultations || 0}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Consultations</p>
                  </div>

                  <div className="glass p-5 rounded-3xl border border-white/5 space-y-1.5">
                    <div className="w-8 h-8 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500">
                      <Star size={16} className="fill-yellow-500" />
                    </div>
                    <p className="text-xl font-black">{data?.stats.avgRating.toFixed(1) || '0.0'}/10</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Note Globale</p>
                  </div>

                  <div className="glass p-5 rounded-3xl border border-white/5 space-y-1.5">
                    <div className="w-8 h-8 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                      <TrendingUp size={16} />
                    </div>
                    <p className="text-xl font-black">Top 10%</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Classement</p>
                  </div>

                  <div className="glass p-5 rounded-3xl border border-white/5 space-y-1.5">
                    <div className="w-8 h-8 bg-success/10 rounded-xl flex items-center justify-center text-success">
                      <ShieldCheck size={16} />
                    </div>
                    <p className="text-xl font-black">Actif</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Visibilité</p>
                  </div>
                </div>

                {/* Sub-grid of consultations and ratings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Consultations List */}
                  <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                      <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <Phone size={14} className="text-primary" /> Consultations Récentes
                      </h2>
                      <span className="text-[9px] text-slate-500 font-bold">{data?.consultations.length} total</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-1">
                      {data?.consultations.length === 0 ? (
                        <div className="py-16 text-center space-y-3 opacity-30">
                          <Clock size={28} className="mx-auto" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Aucune consultation encore</p>
                        </div>
                      ) : (
                        data?.consultations.map((c: any) => {
                          const studentPhone = studentPhones[c.student_id] || '';
                          return (
                            <div key={c.id} className="p-3.5 hover:bg-white/5 rounded-2xl transition-all flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-500">
                                  <Users size={14} />
                                </div>
                                <div>
                                  <p className="text-[11px] font-black text-white">{c.student_name || 'Élève Anonyme'}</p>
                                  <p className="text-[8px] text-slate-500 font-bold mt-0.5">{new Date(c.timestamp).toLocaleString()}</p>
                                </div>
                              </div>
                              {studentPhone ? (
                                <button
                                  onClick={() => window.open(`https://wa.me/${studentPhone}`, '_blank')}
                                  className="px-3 py-1.5 bg-success hover:bg-success-dark text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
                                >
                                  <MessageSquare size={10} /> WhatsApp
                                </button>
                              ) : (
                                <span className="text-[8px] text-slate-500 font-bold">Pas de numéro</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Ratings List */}
                  <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                      <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare size={14} className="text-yellow-500" /> Retours & Notes
                      </h2>
                      <span className="text-[9px] font-black text-yellow-500">Note Moyenne : {data?.stats.avgRating.toFixed(1)}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto max-h-[300px] p-4 space-y-3">
                      {data?.ratings.length === 0 ? (
                        <div className="py-16 text-center space-y-3 opacity-30">
                          <Star size={28} className="mx-auto" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Aucun avis reçu</p>
                        </div>
                      ) : (
                        data?.ratings.map((r: TeacherRating) => (
                          <div key={r.id} className={`p-4 rounded-2xl border transition-all ${r.score < 5 ? 'bg-orange-500/5 border-orange-500/25' : 'bg-white/5 border-white/5'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <Star key={i} size={10} className={`${r.score/2 >= i ? 'text-yellow-400 fill-yellow-400' : 'text-slate-800'}`} />
                                ))}
                              </div>
                              <span className={`text-base font-black ${r.score < 5 ? 'text-orange-500' : 'text-yellow-400'}`}>
                                {r.score}/10
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-300 italic">"{r.comment}"</p>
                            <p className="text-[8px] text-slate-500 font-bold mt-2 uppercase tracking-widest">{new Date(r.timestamp).toLocaleDateString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: ANNOUNCEMENTS */}
            {activeTab === 'announcements' && (
              <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col p-6 space-y-6">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Bell size={16} className="text-primary" /> Informations Importantes / Avis
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-1">Avis envoyés par l'administration Levelmak.</p>
                </div>

                <div className="space-y-3">
                  {!user?.stats?.notifications || user.stats.notifications.length === 0 ? (
                    <div className="py-16 text-center space-y-3 opacity-30">
                      <ShieldCheck size={40} className="mx-auto" />
                      <p className="text-xs font-black uppercase tracking-widest">Aucune notification pour le moment.</p>
                    </div>
                  ) : (
                    user.stats.notifications.map((notif: any) => (
                      <div 
                        key={notif.id} 
                        className={`p-5 rounded-2xl border flex items-start gap-4 transition-all ${notif.read ? 'bg-white/5 border-white/5 opacity-80' : 'bg-primary/5 border-primary/20'}`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <AlertCircle size={18} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-black uppercase tracking-wider">{notif.title}</h4>
                            <span className="text-[8px] text-slate-500 font-bold">{new Date(notif.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed">{notif.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="glass rounded-[2.5rem] border border-white/5 p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Settings size={16} className="text-primary" /> Paramètres du Profil
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-1">Gère les informations de ta fiche enseignant.</p>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-4 max-w-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Prénom</label>
                      <input 
                        type="text" 
                        value={editFirstName} 
                        onChange={e => setEditFirstName(e.target.value)} 
                        className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Nom de famille</label>
                      <input 
                        type="text" 
                        value={editLastName} 
                        onChange={e => setEditLastName(e.target.value)} 
                        className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all"
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Numéro WhatsApp (avec code pays, ex: 224...)</label>
                    <input 
                      type="text" 
                      value={editWhatsapp} 
                      onChange={e => setEditWhatsapp(e.target.value)} 
                      className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all"
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Ville</label>
                      <input 
                        type="text" 
                        value={editCity} 
                        onChange={e => setEditCity(e.target.value)} 
                        className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Commune / Quartier</label>
                      <input 
                        type="text" 
                        value={editNeighborhood} 
                        onChange={e => setEditNeighborhood(e.target.value)} 
                        className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all"
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Biographie / Présentation</label>
                    <textarea 
                      value={editBio} 
                      onChange={e => setEditBio(e.target.value)} 
                      className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all h-24 resize-none"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Écoles / Établissements fréquentés (séparés par des virgules)</label>
                    <input 
                      type="text" 
                      value={editSchools} 
                      onChange={e => setEditSchools(e.target.value)} 
                      className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={updating}
                    className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {updating ? "Enregistrement..." : "Enregistrer les modifications"}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: FEEDBACK / COMMENTAIRE */}
            {activeTab === 'feedback' && (
              <div className="glass rounded-[2.5rem] border border-white/5 p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare size={16} className="text-primary" /> Laisser un Commentaire
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-1">Partage ton avis ou tes suggestions avec l'administration.</p>
                </div>

                {feedbackSuccess ? (
                  <div className="p-6 bg-success/15 border border-success/30 rounded-2xl text-center space-y-2">
                    <CheckCircle size={32} className="mx-auto text-success" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-success">Merci pour ton retour !</h4>
                    <p className="text-[10px] text-slate-400">Ton commentaire a bien été transmis aux administrateurs.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSendFeedback} className="space-y-4 max-w-2xl">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Catégorie</label>
                      <select 
                        value={feedbackCategory} 
                        onChange={e => setFeedbackCategory(e.target.value)}
                        className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all cursor-pointer"
                      >
                        <option value="general" className="bg-slate-900">Général</option>
                        <option value="support" className="bg-slate-900">Assistance / Support</option>
                        <option value="feature" className="bg-slate-900">Suggestion de fonctionnalité</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Ton Message</label>
                      <textarea 
                        value={feedbackContent} 
                        onChange={e => setFeedbackContent(e.target.value)} 
                        placeholder="Rédige ton message ici..."
                        className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all h-36 resize-none"
                        required 
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Send size={14} /> Envoyer
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 5: NOTE APP */}
            {activeTab === 'rating' && (
              <div className="glass rounded-[2.5rem] border border-white/5 p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Star size={16} className="text-yellow-500" /> Noter l'application
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-1">Donne ta note globale à la plateforme Levelmak Pro.</p>
                </div>

                {ratingSuccess ? (
                  <div className="p-6 bg-success/15 border border-success/30 rounded-2xl text-center space-y-2">
                    <CheckCircle size={32} className="mx-auto text-success" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-success">Merci pour ta note !</h4>
                    <p className="text-[10px] text-slate-400">Ta note a été enregistrée avec succès.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSendRating} className="space-y-6 max-w-2xl">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Note globale (sur 10)</label>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setRatingScore(score)}
                            className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${ratingScore === score ? 'bg-yellow-500 text-slate-900 shadow-glow-yellow' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Ton commentaire / suggestion (optionnel)</label>
                      <textarea 
                        value={ratingComment} 
                        onChange={e => setRatingComment(e.target.value)} 
                        placeholder="Qu'est-ce que tu apprécies ou que nous devrions améliorer ?"
                        className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-[11px] outline-none focus:border-primary/50 transition-all h-28 resize-none"
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Star size={14} className="fill-slate-950" /> Enregistrer la Note
                    </button>
                  </form>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
};

export default TeacherDashboard;
