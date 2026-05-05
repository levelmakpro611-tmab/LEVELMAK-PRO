import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, MapPin, MessageSquare, Filter, BookOpen, Home, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useStore } from '../../hooks/useStore';

type TeacherType = 'volunteer' | 'home';
type AvailabilityStatus = 'available' | 'busy' | 'away';

interface TeacherProfile {
    id: string;
    userId: string;
    name: string;
    avatar: string;
    type: TeacherType;
    subjects: string[];
    location?: string;
    city?: string; // New field for city from dropdown
    priceRange?: string;
    experience?: string;
    availabilityStatus: AvailabilityStatus;
    ratingAvg: number;
    ratingCount: number;
    isVerified: boolean;
    bio?: string;
}

const GUINEA_CITIES = ['Conakry', 'Kindia', 'Labé', 'Kankan', 'Nzérékoré', 'Mamou', 'Boké', 'Faranah', 'Coyah', 'Dubréka', 'Kindia', 'Boffa', 'Forécariah', 'Télimélé', 'Fria', 'Gaoual', 'Koundara', 'Mali', 'Tougué', 'Lelouma', 'Dalaba', 'Pita', 'Dinguiraye', 'Dabola', 'Kouroussa', 'Siguiri', 'Mandiana', 'Kérouané', 'Beyla', 'Macenta', 'Guéckédou', 'Lola', 'Yomou'];

const SUBJECTS = ['Maths', 'Physique', 'Chimie', 'Français', 'Anglais', 'Histoire-Géo', 'Philo', 'SVT', 'Informatique'];

const subjectColors: Record<string, string> = {
    'Maths': 'from-blue-500 to-blue-600',
    'Physique': 'from-purple-500 to-purple-600',
    'Chimie': 'from-green-500 to-green-600',
    'Français': 'from-red-500 to-red-600',
    'Anglais': 'from-yellow-500 to-yellow-600',
    'Histoire-Géo': 'from-orange-500 to-orange-600',
    'Philo': 'from-pink-500 to-pink-600',
    'SVT': 'from-emerald-500 to-emerald-600',
    'Informatique': 'from-cyan-500 to-cyan-600',
};

const StatusBadge: React.FC<{ status: AvailabilityStatus }> = ({ status }) => {
    const config = {
        available: { color: 'bg-emerald-500', text: 'Disponible', icon: CheckCircle },
        busy: { color: 'bg-yellow-500', text: 'Occupé', icon: Clock },
        away: { color: 'bg-red-500', text: 'Absent', icon: XCircle },
    }[status];
    
    return (
        <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${config.color} ${status === 'available' ? 'animate-pulse' : ''}`} />
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${
                status === 'available' ? 'text-emerald-400' : status === 'busy' ? 'text-yellow-400' : 'text-red-400'
            }`}>{config.text}</span>
        </div>
    );
};

const StarRating: React.FC<{ rating: number; count: number }> = ({ rating, count }) => (
    <div className="flex items-center gap-1">
        <Star size={11} className="text-yellow-400 fill-yellow-400" />
        <span className="text-[11px] font-black text-yellow-400">{rating.toFixed(1)}</span>
        <span className="text-[10px] text-slate-500">({count})</span>
    </div>
);

const TeacherCard: React.FC<{ teacher: TeacherProfile; onContact: (t: TeacherProfile) => void }> = ({ teacher, onContact }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={{ y: -2 }}
            className="relative bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5 overflow-hidden group hover:border-blue-500/20 hover:bg-white/[0.04] transition-all duration-300 shadow-lg"
        >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 transition-all duration-500 rounded-3xl" />

            <div className="relative z-10">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white/10 group-hover:ring-blue-500/30 transition-all duration-300">
                            {teacher.avatar && (teacher.avatar.startsWith('http') || teacher.avatar.startsWith('data:')) ? (
                                <img src={teacher.avatar} className="w-full h-full object-cover" alt={teacher.name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl">
                                    {teacher.name[0]}
                                </div>
                            )}
                        </div>
                        {/* Verified badge */}
                        {teacher.isVerified && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#020617]">
                                <CheckCircle size={9} className="text-white fill-white" />
                            </div>
                        )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h4 className="font-black text-white text-[15px] truncate leading-tight">{teacher.name}</h4>
                                <div className="mt-1">
                                    <StatusBadge status={teacher.availabilityStatus} />
                                </div>
                            </div>
                            {teacher.type === 'home' && (
                                <StarRating rating={teacher.ratingAvg} count={teacher.ratingCount} />
                            )}
                        </div>
                        
                        {/* Location for home teachers */}
                        {teacher.location && (
                            <div className="flex items-center gap-1 mt-2">
                                <MapPin size={10} className="text-slate-500 shrink-0" />
                                <span className="text-[10px] text-slate-500 font-bold truncate">{teacher.location}</span>
                            </div>
                        )}

                        {/* Price for home teachers */}
                        {teacher.priceRange && (
                            <div className="mt-1">
                                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    {teacher.priceRange}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Subjects */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                    {teacher.subjects.slice(0, 4).map(sub => (
                        <span
                            key={sub}
                            className={`text-[9px] font-black uppercase tracking-widest text-white px-2.5 py-1 rounded-full bg-gradient-to-r ${subjectColors[sub] || 'from-slate-600 to-slate-700'} shadow-sm`}
                        >
                            {sub}
                        </span>
                    ))}
                    {teacher.subjects.length > 4 && (
                        <span className="text-[9px] font-black text-slate-400 px-2.5 py-1 rounded-full bg-white/5">
                            +{teacher.subjects.length - 4}
                        </span>
                    )}
                </div>

                {/* Bio */}
                {teacher.bio && (
                    <p className="text-[11px] text-slate-400 mt-3 leading-relaxed line-clamp-2">{teacher.bio}</p>
                )}

                {/* Contact Button */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onContact(teacher)}
                    disabled={teacher.type === 'volunteer' && teacher.availabilityStatus === 'away'}
                    className={`w-full mt-4 py-3 rounded-2xl flex items-center justify-center gap-2 font-black text-[12px] uppercase tracking-[0.15em] transition-all duration-300
                        ${teacher.type === 'volunteer' && teacher.availabilityStatus === 'away'
                            ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_12px_30px_rgba(37,99,235,0.5)] hover:from-blue-500 hover:to-indigo-500'
                        }`}
                >
                    <MessageSquare size={14} />
                    {teacher.type === 'volunteer' && teacher.availabilityStatus === 'away' ? 'Indisponible' : 'Contacter'}
                </motion.button>
            </div>
        </motion.div>
    );
};

// Demo data for when DB is empty
const DEMO_VOLUNTEERS: TeacherProfile[] = [
    { id: '1', userId: 'v1', name: 'M. Ibrahima Diallo', avatar: '', type: 'volunteer', subjects: ['Maths', 'Physique'], availabilityStatus: 'available', ratingAvg: 4.9, ratingCount: 142, isVerified: true, bio: 'Professeur de Maths depuis 8 ans. Spécialiste en préparation au Bac.' },
    { id: '2', userId: 'v2', name: 'Mme Fatoumata Camara', avatar: '', type: 'volunteer', subjects: ['Français', 'Philo', 'Histoire-Géo'], availabilityStatus: 'busy', ratingAvg: 4.7, ratingCount: 89, isVerified: true, bio: 'Professeure certifiée. J\'adore aider les élèves à progresser en expression écrite.' },
    { id: '3', userId: 'v3', name: 'M. Mamadou Bah', avatar: '', type: 'volunteer', subjects: ['Anglais', 'Informatique'], availabilityStatus: 'available', ratingAvg: 4.8, ratingCount: 63, isVerified: true, bio: 'Ingénieur en informatique. Bilingue anglais-français.' },
    { id: '4', userId: 'v4', name: 'Mme Mariama Sow', avatar: '', type: 'volunteer', subjects: ['SVT', 'Chimie'], availabilityStatus: 'away', ratingAvg: 4.6, ratingCount: 55, isVerified: false, bio: 'Docteure en biologie. Passionnée par les sciences de la vie.' },
];

const DEMO_HOME: TeacherProfile[] = [
    { id: '5', userId: 'h1', name: 'M. Alpha Condé', avatar: '', type: 'home', subjects: ['Maths', 'Physique', 'Chimie'], location: 'Conakry — Ratoma', priceRange: 'À partir de 100 000 GNF/h', experience: '12 ans', availabilityStatus: 'available', ratingAvg: 4.95, ratingCount: 312, isVerified: true, bio: 'Ancien major de sa promotion, je prépare les élèves au Bac avec une méthode éprouvée.' },
    { id: '6', userId: 'h2', name: 'Mme Kadiatou Barry', avatar: '', type: 'home', subjects: ['Français', 'Anglais'], location: 'Conakry — Kaloum', priceRange: 'À partir de 75 000 GNF/h', experience: '7 ans', availabilityStatus: 'available', ratingAvg: 4.8, ratingCount: 178, isVerified: true, bio: 'Bilingue Français-Anglais. Je me déplace dans tout Conakry.' },
    { id: '7', userId: 'h3', name: 'M. Ousmane Kouyaté', avatar: '', type: 'home', subjects: ['Histoire-Géo', 'Philo', 'Français'], location: 'Conakry — Matam', priceRange: 'À partir de 60 000 GNF/h', experience: '5 ans', availabilityStatus: 'busy', ratingAvg: 4.7, ratingCount: 94, isVerified: true, bio: 'Enseignant passionné par les humanités et la culture générale.' },
];

interface TeachersViewProps {
    onContact?: (teacher: TeacherProfile) => void;
}

const TeachersView: React.FC<TeachersViewProps> = ({ onContact }) => {
    const { user, addNotification } = useStore();
    const [subTab, setSubTab] = useState<TeacherType>('volunteer');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [onlyAvailable, setOnlyAvailable] = useState(false);
    const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [ratingTeacher, setRatingTeacher] = useState<TeacherProfile | null>(null);
    const [ratingScore, setRatingScore] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    useEffect(() => {
        loadTeachers();
    }, [subTab]);

    const loadTeachers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('teacher_profiles')
                .select(`
                    id, user_id, type, subjects, location, price_range, experience,
                    availability_status, rating_avg, rating_count, is_verified, bio,
                    profiles:user_id (name, avatar_config)
                `)
                .eq('type', subTab)
                .eq('is_verified', true);

            if (error || !data || data.length === 0) {
                // Use demo data if no real data
                setTeachers(subTab === 'volunteer' ? DEMO_VOLUNTEERS : DEMO_HOME);
            } else {
                setTeachers(data.map((t: any) => ({
                    id: t.id,
                    userId: t.user_id,
                    name: t.profiles?.name || 'Professeur',
                    avatar: t.profiles?.avatar_config?.image || t.profiles?.avatar_config?.baseColor || '',
                    type: t.type,
                    subjects: t.subjects || [],
                    location: t.location,
                    priceRange: t.price_range,
                    experience: t.experience,
                    availabilityStatus: t.availability_status || 'away',
                    ratingAvg: t.rating_avg || 0,
                    ratingCount: t.rating_count || 0,
                    isVerified: t.is_verified,
                    bio: t.bio,
                })));
            }
        } catch {
            setTeachers(subTab === 'volunteer' ? DEMO_VOLUNTEERS : DEMO_HOME);
        } finally {
            setLoading(false);
        }
    };

    const filteredTeachers = teachers.filter(t => {
        const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesSubject = !selectedSubject || t.subjects.includes(selectedSubject);
        const matchesCity = !selectedCity || t.city === selectedCity || t.location?.includes(selectedCity);
        const matchesAvailable = !onlyAvailable || t.availabilityStatus === 'available';
        return matchesSearch && matchesSubject && matchesAvailable && matchesCity;
    });

    const handleContact = (teacher: TeacherProfile) => {
        if (!user) return;
        if (onContact) onContact(teacher);
        
        // If it's a Pro teacher, we might want to suggest rating later
        if (teacher.type === 'home') {
            // In a real app, we'd trigger this after some time or interaction
            // For now, let's keep the option available
            console.log('[TeachersView] Initiated contact with premium teacher:', teacher.name);
        }
    };

    const handleSubmitRating = async () => {
        if (!user || !ratingTeacher || ratingScore === 0) return;
        setIsSubmittingRating(true);
        try {
            // Reuse the service if it exists, or local call
            const { error } = await supabase.from('teacher_ratings').insert({
                teacher_id: ratingTeacher.id,
                student_id: user.id,
                student_name: user.name,
                score: ratingScore,
                comment: ratingComment,
                timestamp: new Date().toISOString()
            });

            if (error) throw error;

            addNotification('success', 'Merci !', `Votre note de ${ratingScore}/5 a été enregistrée.`);
            setRatingTeacher(null);
            setRatingScore(0);
            setRatingComment('');
            loadTeachers(); // Reload for updated avg
        } catch (err) {
            console.error('Error submitting rating:', err);
            addNotification('error', 'Erreur', 'Impossible de soumettre la note.');
        } finally {
            setIsSubmittingRating(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#020617] overflow-hidden">
            {/* Sub-tabs */}
            <div className="px-4 pt-4 pb-3 space-y-4">
                <div className="flex gap-2 p-1.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                    {[
                        { id: 'volunteer' as const, label: '🟢 Bénévoles', sub: 'Aide en direct' },
                        { id: 'home' as const, label: '🏠 Maison', sub: 'Cours planifiés' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setSubTab(tab.id); setSelectedSubject(null); setSearchQuery(''); }}
                            className={`flex-1 py-3 px-3 rounded-[14px] transition-all duration-300 text-center
                                ${subTab === tab.id
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_4px_15px_rgba(37,99,235,0.35)]'
                                    : 'hover:bg-white/5'}`}
                        >
                            <div className={`text-[11px] font-black ${subTab === tab.id ? 'text-white' : 'text-slate-400'}`}>{tab.label}</div>
                            <div className={`text-[9px] mt-0.5 ${subTab === tab.id ? 'text-blue-200' : 'text-slate-600'}`}>{tab.sub}</div>
                        </button>
                    ))}
                </div>

                {/* Search + Filter */}
                <div className="flex gap-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder={`Rechercher un prof...`}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 transition-all font-bold"
                        />
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowFilters(!showFilters)}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all
                            ${showFilters || selectedSubject || onlyAvailable
                                ? 'bg-blue-600 border-blue-500 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]'
                                : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white'}`}
                    >
                        <Filter size={16} />
                    </motion.button>
                </div>

                {/* Filter Panel */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-3 pt-1">
                                {/* Available only toggle */}
                                <button
                                    onClick={() => setOnlyAvailable(!onlyAvailable)}
                                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl border transition-all
                                        ${onlyAvailable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${onlyAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                                    <span className="text-[11px] font-black uppercase tracking-[0.15em]">Disponibles uniquement</span>
                                </button>

                                <div className="flex flex-col gap-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Villes de Guinée</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {GUINEA_CITIES.slice(0, 10).map(city => (
                                            <button
                                                key={city}
                                                onClick={() => setSelectedCity(selectedCity === city ? null : city)}
                                                className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all
                                                    ${selectedCity === city
                                                        ? 'bg-blue-600 text-white border-transparent'
                                                        : 'bg-white/[0.02] border-white/[0.08] text-slate-500 hover:text-white'}`}
                                            >
                                                {city}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Subject filter */}
                                <div className="flex flex-wrap gap-1.5">
                                    {SUBJECTS.map(sub => (
                                        <button
                                            key={sub}
                                            onClick={() => setSelectedSubject(selectedSubject === sub ? null : sub)}
                                            className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all
                                                ${selectedSubject === sub
                                                    ? `bg-gradient-to-r ${subjectColors[sub] || 'from-blue-600 to-indigo-600'} text-white border-transparent shadow-md`
                                                    : 'bg-white/[0.02] border-white/[0.08] text-slate-500 hover:text-white hover:border-white/20'}`}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Teacher List */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="space-y-4 pt-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-5 animate-pulse">
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5" />
                                    <div className="flex-1 space-y-3">
                                        <div className="h-4 bg-white/5 rounded-full w-40" />
                                        <div className="h-3 bg-white/[0.03] rounded-full w-24" />
                                        <div className="flex gap-2">
                                            <div className="h-5 w-16 bg-white/5 rounded-full" />
                                            <div className="h-5 w-16 bg-white/5 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                                <div className="h-10 bg-white/[0.03] rounded-2xl mt-4" />
                            </div>
                        ))}
                    </div>
                ) : filteredTeachers.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                        {filteredTeachers.map(teacher => (
                            <TeacherCard key={teacher.id} teacher={teacher} onContact={handleContact} />
                        ))}
                    </AnimatePresence>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 space-y-6">
                        <div className="relative w-24 h-24">
                            <div className="absolute inset-0 bg-blue-500/10  rounded-full animate-pulse" />
                            <div className="relative w-full h-full bg-white/[0.02] rounded-[32px] flex items-center justify-center border border-white/10">
                                <BookOpen size={36} className="text-slate-700" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-lg font-black text-white">Aucun résultat</p>
                            <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed font-bold uppercase tracking-[0.1em]">
                                {selectedSubject ? `Aucun prof de ${selectedSubject} trouvé` : 'Affine ta recherche ou reviens plus tard'}
                            </p>
                        </div>
                        {(searchQuery || selectedSubject || onlyAvailable) && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setSearchQuery(''); setSelectedSubject(null); setOnlyAvailable(false); }}
                                className="px-6 py-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-widest"
                            >
                                Réinitialiser les filtres
                            </motion.button>
                        )}
                    </div>
                )}

                {/* Info banner for home tab */}
                {subTab === 'home' && filteredTeachers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 p-4 rounded-2xl bg-blue-600/5 border border-blue-500/20 space-y-1"
                    >
                        <div className="flex items-center gap-2">
                            <Home size={14} className="text-blue-400 shrink-0" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.15em]">Comment ça marche ?</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Contacte le professeur directement, discutez des horaires et du tarif. Le paiement se fait entre vous (Orange Money, espèces...). LEVELMAK vous met en relation, c'est tout !
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default TeachersView;
