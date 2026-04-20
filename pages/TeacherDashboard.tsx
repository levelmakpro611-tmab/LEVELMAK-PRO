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
  AlertCircle
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { getTeacherDashboardData, getMyTeacherProfile } from '../services/tutorService';
import { Teacher, TeacherRating } from '../types';
import Skeleton from '../components/Skeleton';

const TeacherDashboard: React.FC = () => {
  const { user, logout, t } = useStore();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profile = await getMyTeacherProfile(user.id);
      if (profile) {
        setTeacher(profile);
        const dashboardData = await getTeacherDashboardData(profile.id);
        setData(dashboardData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060915] p-6 space-y-6">
        <Skeleton className="h-40 w-full rounded-[2.5rem]" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-[2.5rem]" />
      </div>
    );
  }

  if (!teacher || teacher.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#060915] flex flex-col items-center justify-center p-4 md:p-6 text-center relative overflow-hidden py-20">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl space-y-6 relative z-10"
        >
          {/* Main Card */}
          <div className="glass p-8 md:p-12 rounded-[3.5rem] border border-white/10 shadow-2xl space-y-8">
            <div className="relative group w-fit mx-auto">
              <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto shadow-glow-purple">
                  <Clock size={40} className="text-white animate-float" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                  {t('auth.successTeacher') || "Inscription Envoyée !"}
              </h2>
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Vérification en cours</span>
              </div>
            </div>

            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                {t('auth.pendingAdmin') || "Votre profil est actuellement en cours de révision par l'administration Levelmak. Nous vérifions vos documents pour garantir la qualité de l'élite."}
            </p>

            {/* Submission Summary Card */}
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
                    {teacher.subjects.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded-lg uppercase">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 space-y-4">
                <button 
                  onClick={() => window.open('https://wa.me/levelmak_support', '_blank')}
                  className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-glow"
                >
                    Contacter le Support
                </button>
                <button 
                  onClick={logout} 
                  className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white font-black text-xs uppercase tracking-widest transition-all"
                >
                    {t('auth.logout') || "Se Déconnecter"}
                </button>
            </div>
          </div>

          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em] pb-10">Levelmak Pro &copy; 2026</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060915] text-white p-4 md:p-8 space-y-8 pb-24">
      {/* Header / Profile Card */}
      <div className="relative overflow-hidden rounded-[3rem] bg-slate-900/50 border border-white/5 p-6 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-purple-600 p-1">
            <div className="w-full h-full bg-slate-900 rounded-[1.4rem] overflow-hidden flex items-center justify-center">
              {teacher.avatarUrl ? (
                <img src={teacher.avatarUrl} alt={teacher.firstName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black">{teacher.firstName?.charAt(0)}</span>
              )}
            </div>
          </div>
          
          <div className="text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight">
                Bonjour, <span className="text-gradient-primary">{teacher.firstName}</span> {teacher.lastName}
              </h1>
              <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${teacher.status === 'verified' ? 'bg-success/10 border-success/30 text-success' : 'bg-orange-500/10 border-orange-500/30 text-orange-500'}`}>
                {teacher.status === 'verified' ? 'Compte Vérifié' : 'En attente'}
              </div>
            </div>
            <p className="text-slate-500 text-xs md:text-sm font-medium italic">"{teacher.bio}"</p>
          </div>

          <button onClick={logout} className="md:ml-auto p-3 bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-2xl transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-6 rounded-3xl border border-white/5 space-y-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Users size={20} />
          </div>
          <p className="text-2xl font-black">{data?.stats.totalConsultations || 0}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-blue-500">Consultations</p>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 space-y-2">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500">
            <Star size={20} className="fill-yellow-500" />
          </div>
          <p className="text-2xl font-black">{data?.stats.avgRating.toFixed(1) || '0.0'}/10</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-yellow-500">Note Globale</p>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 space-y-2">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
            <TrendingUp size={20} />
          </div>
          <p className="text-2xl font-black">Top 10%</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-purple-500">Classement</p>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 space-y-2">
          <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center text-success">
            <ShieldCheck size={20} />
          </div>
          <p className="text-2xl font-black">Actif</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-success">Visibilité</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Consultations */}
        <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Phone size={16} className="text-primary" /> Consultations Récentes
            </h2>
            <span className="text-[10px] text-slate-500 font-bold">{data?.consultations.length} total</span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1">
            {data?.consultations.length === 0 ? (
              <div className="py-20 text-center space-y-3 opacity-30">
                <Clock size={32} className="mx-auto" />
                <p className="text-xs font-bold uppercase tracking-widest">Aucune consultation encore</p>
              </div>
            ) : (
              data?.consultations.map((c: any) => (
                <div key={c.id} className="p-4 hover:bg-white/5 rounded-2xl transition-all flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                    <Users size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-white">{c.student_name || 'Élève Anonyme'}</p>
                    <p className="text-[9px] text-slate-500 font-bold">{new Date(c.timestamp).toLocaleString()}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-800" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Ratings */}
        <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={16} className="text-yellow-500" /> Retours & Notes
            </h2>
            <span className="text-[10px] font-black text-yellow-500">Note Moyenne : {data?.stats.avgRating.toFixed(1)}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-4">
            {data?.ratings.length === 0 ? (
              <div className="py-20 text-center space-y-3 opacity-30">
                <Star size={32} className="mx-auto" />
                <p className="text-xs font-bold uppercase tracking-widest">Aucune note reçue</p>
              </div>
            ) : (
              data?.ratings.map((r: TeacherRating) => (
                <div key={r.id} className={`p-5 rounded-3xl border transition-all ${r.score < 5 ? 'bg-orange-500/5 border-orange-500/20' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={12} className={`${r.score/2 >= i ? 'text-yellow-400 fill-yellow-400' : 'text-slate-800'}`} />
                      ))}
                    </div>
                    <span className={`text-xl font-black ${r.score < 5 ? 'text-orange-500' : 'text-yellow-400'}`}>
                      {r.score}/10
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 italic leading-relaxed">"{r.comment}"</p>
                  <p className="text-[9px] text-slate-500 font-bold mt-4 uppercase tracking-[0.2em]">{new Date(r.timestamp).toLocaleDateString()}</p>
                  
                  {r.score < 5 && (
                    <div className="mt-4 p-3 bg-orange-500/10 rounded-xl flex items-center gap-3">
                      <AlertCircle size={14} className="text-orange-500 shrink-0" />
                      <p className="text-[9px] text-orange-200/70 font-bold uppercase tracking-widest leading-none">Note basse détectée. Améliorez la clarté de vos réponses.</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
