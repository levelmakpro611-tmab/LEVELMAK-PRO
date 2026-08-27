import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  MessageSquare, 
  Star, 
  Filter, 
  LayoutGrid, 
  GraduationCap,
  Sparkles,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Phone
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { getTeachers, logConsultation } from '../services/tutorService';
import { Teacher, TeacherRating } from '../types';
import Skeleton from '../components/Skeleton';

const GUINEA_CITIES = [
  'Conakry', 'Kindia', 'Boké', 'Mamou', 'Labé', 'Faranah', 'Kankan', 'Nzérékoré', 
  'Kissidougou', 'Guéckédou', 'Coyah', 'Dubréka'
];

const SUBJECTS = [
  'Mathématiques', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Français', 
  'Anglais', 'Histoire', 'Géographie'
];

const CONAKRY_COMMUNES = [
  'Kaloum', 'Dixinn', 'Matam', 'Ratoma', 'Matoto', 'Kassa', 'Gbessia', 'Lambanyi', 'Tombolia'
];

const TutorHub: React.FC = () => {
  const { user, t } = useStore();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState<'professional' | 'benevolent' | ''>('');
  const [ratingTeacher, setRatingTeacher] = useState<Teacher | null>(null);
  const [userRating, setUserRating] = useState(10);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, [selectedCity, selectedCommune, selectedSubject, selectedType]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const data = await getTeachers({
        city: selectedCity || undefined,
        subject: selectedSubject || undefined,
        type: selectedType || undefined,
        neighborhood: selectedCommune || undefined
      });
      setTeachers(data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto py-6 md:py-10 px-4 space-y-10 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[3rem] bg-slate-950 p-8 md:p-16 border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
        
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
            <Sparkles size={16} className="text-primary" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Hub des Experts Levelmak</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tighter">
            Trouvez l'Aide <span className="text-gradient-primary">Pédagogique</span> qu'il vous faut.
          </h1>
          <p className="text-slate-400 text-sm md:text-lg font-medium">
            Mise en relation directe avec les meilleurs enseignants de Guinée. Soutien scolaire, coaching et mentorat.
          </p>
          
          {/* Search Bar */}
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Chercher par nom ou matière..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl outline-none focus:border-primary/50 text-white font-bold transition-all shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-2 text-white">
          <div className="flex items-center gap-2 mr-4">
            <Filter size={18} className="text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Filtres :</span>
          </div>
          
          <select 
            value={selectedCity} 
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setSelectedCommune('');
            }}
            className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-bold outline-none focus:border-primary/50 cursor-pointer"
          >
            <option value="" className="bg-slate-900">Toutes les Villes</option>
            {GUINEA_CITIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
          </select>

          {selectedCity === 'Conakry' && (
            <select 
              value={selectedCommune} 
              onChange={(e) => setSelectedCommune(e.target.value)}
              className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-bold outline-none focus:border-primary/50 cursor-pointer animate-fade-in"
            >
              <option value="" className="bg-slate-900">Toutes les Communes</option>
              {CONAKRY_COMMUNES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
            </select>
          )}

          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-bold outline-none focus:border-primary/50 cursor-pointer"
          >
            <option value="" className="bg-slate-900">Toutes les Matières</option>
            {SUBJECTS.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
          </select>

          <div className="h-8 w-[1px] bg-white/10 mx-2 hidden md:block"></div>

          <button 
            onClick={() => setSelectedType(selectedType === 'professional' ? '' : 'professional')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedType === 'professional' ? 'bg-primary border-primary text-white shadow-glow' : 'bg-white/5 border-white/10 text-slate-400'}`}
          >
            Professionnels
          </button>
          <button 
            onClick={() => setSelectedType(selectedType === 'benevolent' ? '' : 'benevolent')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedType === 'benevolent' ? 'bg-secondary border-secondary text-white shadow-glow-secondary' : 'bg-white/5 border-white/10 text-slate-400'}`}
          >
            Bénévoles
          </button>
        </div>
        
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          {filteredTeachers.length} Enseignant(s) trouvé(s)
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[380px] w-full rounded-[2.5rem]" />)
        ) : filteredTeachers.length === 0 ? (
          <div className="col-span-full py-32 text-center space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-700">
              <Search size={32} />
            </div>
            <p className="text-slate-500 font-medium">Aucun professeur ne correspond à vos critères.</p>
            <button 
              onClick={() => { setSelectedCity(''); setSelectedCommune(''); setSelectedSubject(''); setSelectedType(''); setSearchQuery(''); }}
              className="text-primary font-bold text-xs uppercase tracking-widest hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          filteredTeachers.map((teacher) => (
            <motion.div
              key={teacher.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -8 }}
              className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative group flex flex-col h-full overflow-hidden"
            >
              {/* Type Badge */}
              <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${teacher.type === 'professional' ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-secondary/20 border-secondary/30 text-secondary'}`}>
                {teacher.type === 'professional' ? 'Expert Pro' : 'Bénévole'}
              </div>

              {/* Profile */}
              <div className="flex items-center gap-4 mb-6">
                <div 
                  onClick={() => setExpandedTeacherId(expandedTeacherId === teacher.id ? null : teacher.id)}
                  title="Cliquer pour voir la description"
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-white/10 flex items-center justify-center overflow-hidden ring-4 ring-white/5 cursor-pointer hover:scale-105 active:scale-95 transition-all relative group/avatar"
                >
                  {teacher.avatar ? (
                    <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-white">{(String(teacher?.name || 'T')).charAt(0)}</span>
                  )}
                  {/* Subtle info indicator overlay */}
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black text-white uppercase tracking-wider">
                    Bio ℹ️
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    {teacher.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-black text-white">{teacher.ratingAvg.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-500 font-bold">({teacher.ratingCount})</span>
                  </div>
                </div>
              </div>

              {/* Tags (always visible) */}
              <div className="flex flex-wrap gap-1.5 mb-6">
                {teacher.subjects.map(s => (
                  <span key={s} className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-slate-300 border border-white/5">
                    {s}
                  </span>
                ))}
              </div>

              {/* Collapsible Info (Bio, Location, Schools) */}
              <AnimatePresence>
                {expandedTeacherId === teacher.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden mb-6 flex-grow"
                  >
                    {/* Bio */}
                    <p className="text-xs text-slate-400 leading-relaxed italic mb-4">
                      "{teacher.bio}"
                    </p>

                    {/* Location & School */}
                    <div className="flex flex-col gap-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 p-4 rounded-[1.5rem] border border-white/5">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-primary shrink-0" />
                        <span className="truncate">{teacher.city === 'Conakry' ? `Commune de ${teacher.neighborhood}, Conakry` : `${teacher.neighborhood}, ${teacher.city}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-secondary shrink-0" />
                        <span className="truncate">{teacher.schools[0] || 'Expert Levelmak'}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Helper notice if not expanded */}
              {expandedTeacherId !== teacher.id && (
                <div 
                  onClick={() => setExpandedTeacherId(teacher.id)}
                  className="text-[9px] font-black text-slate-600 hover:text-slate-400 uppercase tracking-wider mb-6 text-center cursor-pointer transition-colors flex-grow flex items-center justify-center"
                >
                  ℹ️ Cliquez sur la photo pour voir la bio & l'adresse
                </div>
              )}

              {/* Action */}
              <div className="flex gap-2">
                <a 
                  href={`https://wa.me/${teacher.whatsappNumber}?text=Bonjour ${teacher.name}, je vous contacte via Levelmak Pro.`} 
                  target="_blank"
                  onClick={() => {
                      if (user) logConsultation(teacher.id, user.id, user.name);
                  }}
                  className="flex-1 py-4 bg-white/5 hover:bg-white text-slate-400 hover:text-black rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-white group-hover:shadow-glow"
                >
                  <Phone size={14} /> WhatsApp
                </a>
                <button 
                  onClick={() => setRatingTeacher(teacher)}
                  className="p-4 bg-white/5 hover:bg-yellow-500/20 text-slate-500 hover:text-yellow-500 rounded-2xl transition-all border border-transparent hover:border-yellow-500/30"
                >
                  <Star size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Rating Modal */}
      <AnimatePresence>
        {ratingTeacher && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] border border-white/10 p-8 space-y-8 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
                  <Star size={32} className="fill-primary" />
                </div>
                <h3 className="text-xl font-black text-white">Noter {ratingTeacher.name}</h3>
                <p className="text-xs text-slate-500">Votre évaluation aide la communauté à choisir les meilleurs profs.</p>
              </div>

              <div className="flex justify-center flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button 
                    key={star}
                    onClick={() => setUserRating(star)}
                    className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${userRating >= star ? 'bg-yellow-500 border-yellow-400 text-white shadow-glow' : 'bg-white/5 border-white/10 text-slate-700'}`}
                  >
                    {star}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setRatingTeacher(null)}
                  className="py-4 bg-white/5 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={async () => {
                    if (!user) return;
                    setIsSubmittingRating(true);
                    try {
                      // Import submitRating dynamically or use service
                      const { submitRating } = await import('../services/tutorService');
                      await submitRating(ratingTeacher.id, user.id, user.name, userRating, "");
                      setRatingTeacher(null);
                      fetchTeachers(); // Refresh
                    } catch (e) { console.error(e); } finally { setIsSubmittingRating(false); }
                  }}
                  disabled={isSubmittingRating}
                  className="py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-glow"
                >
                  {isSubmittingRating ? '...' : 'Valider'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default TutorHub;
