
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Map as MapIcon, 
  Waves, 
  Mountain, 
  Thermometer, 
  ChevronRight, 
  ArrowLeft,
  Search,
  BookOpen,
  Info,
  Sparkles,
  MapPin,
  HardHat
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { ATLAS_LESSONS, AtlasLesson } from '../utils/atlasLessons';
import { HapticFeedback } from '../services/nativeAdapters';

interface AtlasLibraryProps {
  onNavigate: (tab: string) => void;
}

const AtlasLibrary: React.FC<AtlasLibraryProps> = ({ onNavigate }) => {
  const { t, setMapFocusFeatureId, atlasFocusFeatureId, setAtlasFocusFeatureId } = useStore();
  const [activeCategory, setActiveCategory] = useState<'all' | 'hydro' | 'relief' | 'climate'>('all');
  const [selectedLesson, setSelectedLesson] = useState<AtlasLesson | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle incoming focus from Map
  React.useEffect(() => {
    if (atlasFocusFeatureId) {
      const lesson = ATLAS_LESSONS[atlasFocusFeatureId];
      if (lesson) {
        setSelectedLesson(lesson);
      }
      // Reset after a short delay so user can go back and forth
      // ✅ Store timer ID and clear it on cleanup to avoid memory leaks
      const timer = setTimeout(() => setAtlasFocusFeatureId(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [atlasFocusFeatureId, setAtlasFocusFeatureId]);


  const categories = [
    { id: 'all', label: t('atlas.all'), icon: Globe, color: 'text-slate-400' },
    { id: 'hydro', label: t('atlas.hydro'), icon: Waves, color: 'text-blue-500' },
    { id: 'relief', label: t('atlas.relief'), icon: Mountain, color: 'text-orange-500' },
    { id: 'resource', label: t('atlas.resource'), icon: HardHat, color: 'text-yellow-500' },
    { id: 'climate', label: t('atlas.climate'), icon: Thermometer, color: 'text-emerald-500' },
  ];

  const filteredLessons = useMemo(() => {
    return Object.values(ATLAS_LESSONS).filter(lesson => {
      const translatedTitle = t(`atlas.lessons.${lesson.id}.title`);
      const translatedContent = t(`atlas.lessons.${lesson.id}.content`);
      
      const matchesCategory = activeCategory === 'all' || lesson.category === activeCategory;
      const matchesSearch = translatedTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           translatedContent.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, t]);

  const handleViewOnMap = (id: string) => {
    HapticFeedback.success();
    setMapFocusFeatureId(id);
    onNavigate('map');
  };

  return (
    <div className="min-h-full p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/5 dark:border-white/5">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            {t('atlas.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-md font-medium">
            Explorez les richesses géographiques du "Château d'eau de l'Afrique de l'Ouest".
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative group w-full md:w-80">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder={t('atlas.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedLesson ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Category Switcher */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      HapticFeedback.selection();
                      setActiveCategory(cat.id as any);
                    }}
                    className={`
                      flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all
                      ${isActive 
                        ? 'bg-orange-500 text-white shadow-glow-orange scale-105' 
                        : 'bg-black/5 dark:bg-white/5 text-slate-500 hover:bg-black/10 dark:hover:bg-white/10'
                      }
                    `}
                  >
                    <Icon size={18} className={isActive ? 'text-white' : cat.color} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLessons.map((lesson) => (
                <motion.div
                  key={lesson.id}
                  layoutId={`card-${lesson.id}`}
                  whileHover={{ y: -5 }}
                  className="glass dark:bg-slate-900/40 p-6 rounded-[2rem] border border-black/5 dark:border-white/5 flex flex-col h-full group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${
                      lesson.category === 'hydro' ? 'bg-blue-500/10 text-blue-500' :
                      lesson.category === 'relief' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {lesson.category === 'hydro' && <Waves size={24} />}
                      {lesson.category === 'relief' && <Mountain size={24} />}
                      {lesson.category === 'resource' && <HardHat size={24} />}
                      {lesson.category === 'climate' && <Thermometer size={24} />}
                    </div>
                    <button 
                      onClick={() => handleViewOnMap(lesson.id)}
                      className="p-3 text-white bg-orange-500/20 hover:bg-orange-500 transition-all rounded-xl border border-orange-500/30 group/map"
                      title={t('atlas.viewOnMap')}
                    >
                      <MapPin size={20} className="text-orange-500 group-hover/map:text-white" />
                    </button>
                  </div>

                  <h3 className="text-xl font-black mb-2 line-clamp-1">
                    {t(`atlas.lessons.${lesson.id}.title`)}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-6 flex-grow leading-relaxed">
                    {t(`atlas.lessons.${lesson.id}.content`)}
                  </p>

                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => {
                        HapticFeedback.selection();
                        setSelectedLesson(lesson);
                      }}
                      className="flex-1 bg-black/5 dark:bg-white/5 hover:bg-orange-500 hover:text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <BookOpen size={18} />
                      {t('atlas.readLesson')}
                    </button>
                    <button
                      onClick={() => handleViewOnMap(lesson.id)}
                      className="p-3 bg-orange-500/10 text-orange-500 rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-glow-orange border border-orange-500/20"
                      title={t('atlas.viewOnMap')}
                    >
                      <MapIcon size={20} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredLessons.length === 0 && (
              <div className="text-center py-20 bg-black/5 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <Search size={48} className="mx-auto text-slate-300 mb-4 opacity-50" />
                <p className="text-slate-500 font-bold">Aucun résultat trouvé pour "{searchQuery}"</p>
                <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); }} className="text-orange-500 font-black mt-2">Réinitialiser les filtres</button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto"
          >
            {/* Detail View */}
            <div className="mb-8">
              <button
                onClick={() => setSelectedLesson(null)}
                className="flex items-center gap-2 text-slate-500 hover:text-orange-500 font-bold transition-colors group mb-6"
              >
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg group-hover:bg-orange-500/10">
                  <ArrowLeft size={20} />
                </div>
                {t('atlas.backToAtlas')}
              </button>

              <div className="glass dark:bg-slate-900/60 rounded-[2.5rem] border border-black/5 dark:border-white/5 overflow-hidden">
                {/* Hero Section */}
                <div className="relative p-8 md:p-12 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className={`p-4 rounded-2xl ${
                        selectedLesson.category === 'hydro' ? 'bg-blue-500 text-white shadow-glow-blue' :
                        selectedLesson.category === 'relief' ? 'bg-orange-500 text-white shadow-glow-orange' :
                        selectedLesson.category === 'resource' ? 'bg-yellow-500 text-white shadow-glow-yellow' :
                        'bg-emerald-500 text-white shadow-glow-emerald'
                      }`}>
                        {selectedLesson.category === 'hydro' && <Waves size={32} />}
                        {selectedLesson.category === 'relief' && <Mountain size={32} />}
                        {selectedLesson.category === 'resource' && <HardHat size={32} />}
                        {selectedLesson.category === 'climate' && <Thermometer size={32} />}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                          {t(`atlas.${selectedLesson.category}`)}
                        </p>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                          {t(`atlas.lessons.${selectedLesson.id}.title`)}
                        </h2>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewOnMap(selectedLesson.id)}
                      className="hidden md:flex flex-col items-center gap-2 bg-orange-500 text-white p-4 px-6 rounded-2xl font-black shadow-glow-orange hover:scale-105 transition-transform"
                    >
                      <MapPin size={24} />
                      <span className="text-[10px] uppercase">{t('atlas.viewOnMap')}</span>
                    </button>
                  </div>

                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-xl leading-relaxed text-slate-600 dark:text-slate-300 font-medium whitespace-pre-wrap">
                      {t(`atlas.lessons.${selectedLesson.id}.content`)}
                    </p>
                  </div>

                  {/* Fact Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
                    {selectedLesson.keyFacts.map((fact) => (
                      <div key={fact.label} className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                          {t(`atlas.labels.${fact.label}`)}
                        </p>
                        <p className="font-bold text-sm leading-tight">{fact.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Did You Know? */}
                  {t(`atlas.lessons.${selectedLesson.id}.didYouKnow`) !== `atlas.lessons.${selectedLesson.id}.didYouKnow` && (
                    <div className="mt-8 bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 text-blue-500/20">
                        <Sparkles size={64} />
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-500 p-2 rounded-lg text-white">
                          <Info size={20} />
                        </div>
                        <div>
                          <p className="font-black text-blue-500 text-xs uppercase tracking-widest mb-1">{t('atlas.labels.didYouKnow')}</p>
                          <p className="text-blue-900 dark:text-blue-200 font-medium italic">
                            "{t(`atlas.lessons.${selectedLesson.id}.didYouKnow`)}"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleViewOnMap(selectedLesson.id)}
                    className="w-full mt-8 bg-orange-500 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-glow-orange md:hidden"
                  >
                    <MapIcon size={24} />
                    {t('atlas.viewOnMap')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .dark .glass {
          background: rgba(15, 23, 42, 0.4);
        }
        .shadow-glow-orange {
          box-shadow: 0 0 20px rgba(249, 115, 22, 0.3);
        }
        .shadow-glow-blue {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }
        .shadow-glow-emerald {
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default AtlasLibrary;
