import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FileText, Search, ChevronDown, ChevronUp, Lock, CheckCircle2, Award, ExternalLink } from 'lucide-react';
import { PRIVACY_POLICY_SECTIONS, TERMS_OF_SERVICE_SECTIONS, LegalSection } from '../utils/legalTexts';

export interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy'
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  // Sync tab when initialTab changes on open
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
      // Expand the first 3 sections by default
      setExpandedSections({ 0: true, 1: true, 2: true });
    }
  }, [isOpen, initialTab]);

  const sections = activeTab === 'privacy' ? PRIVACY_POLICY_SECTIONS : TERMS_OF_SERVICE_SECTIONS;

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter((sec) => {
      const matchTitle = sec.title.toLowerCase().includes(q);
      const matchContent = Array.isArray(sec.content)
        ? sec.content.some(c => c.toLowerCase().includes(q))
        : typeof sec.content === 'string' && sec.content.toLowerCase().includes(q);
      return matchTitle || matchContent;
    });
  }, [sections, searchQuery]);

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    sections.forEach((_, idx) => { all[idx] = true; });
    setExpandedSections(all);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 md:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl h-[92vh] max-h-[850px] bg-slate-900 border border-white/10 rounded-3xl sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden z-10 text-white select-text"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-slate-800/80 border-b border-white/10 shrink-0 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${
                  activeTab === 'privacy' 
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 shadow-blue-500/10' 
                    : 'bg-purple-500/20 border-purple-500/30 text-purple-400 shadow-purple-500/10'
                }`}>
                  {activeTab === 'privacy' ? <Shield size={24} /> : <FileText size={24} />}
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {activeTab === 'privacy' ? 'Politique de Confidentialité' : "Conditions Générales d'Utilisation"}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                    LEVELMAK PRO • TMAB GROUP • Conakry, République de Guinée
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/legal.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all border border-white/10 text-xs font-bold active:scale-95"
                  title="Ouvrir la page web publique"
                >
                  <ExternalLink size={14} className="text-blue-400" />
                  <span className="hidden sm:inline">Page Web</span>
                </a>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/10 active:scale-95 shrink-0"
                  title="Fermer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => { setActiveTab('privacy'); setExpandedSections({ 0: true, 1: true }); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    activeTab === 'privacy'
                      ? 'bg-blue-600 text-white shadow-glow shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield size={14} />
                  <span>Confidentialité & Données</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('terms'); setExpandedSections({ 0: true, 1: true }); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    activeTab === 'terms'
                      ? 'bg-purple-600 text-white shadow-glow shadow-purple-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText size={14} />
                  <span>Conditions d'Utilisation (CGU)</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un article..."
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 font-medium focus:border-blue-500/50 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="px-6 py-2.5 bg-slate-800/40 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>{filteredSections.length} article{filteredSections.length > 1 ? 's' : ''} disponible{filteredSections.length > 1 ? 's' : ''}</span>
            <div className="flex gap-3">
              <button onClick={expandAll} className="hover:text-blue-400 transition-colors font-bold">Tout déplier</button>
              <span>•</span>
              <button onClick={collapseAll} className="hover:text-blue-400 transition-colors font-bold">Tout replier</button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
            {filteredSections.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Search size={40} className="mx-auto text-slate-600 animate-pulse" />
                <p className="text-slate-400 text-sm font-bold">Aucun article ne correspond à votre recherche "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Effacer la recherche
                </button>
              </div>
            ) : (
              filteredSections.map((sec, idx) => {
                const isExpanded = !!expandedSections[idx];
                const contentLines = Array.isArray(sec.content) ? sec.content : [sec.content];

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all ${
                      isExpanded 
                        ? 'bg-slate-800/70 border-white/15 shadow-lg' 
                        : 'bg-slate-800/30 border-white/5 hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleSection(idx)}
                      className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          activeTab === 'privacy' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <h3 className="font-bold text-sm sm:text-base text-white">
                          {sec.title}
                        </h3>
                      </div>
                      <div className="text-slate-400 hover:text-white shrink-0">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {/* Accordion Body */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 pb-5 pt-1 border-t border-white/5 space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed"
                      >
                        {contentLines.map((paragraph, pIdx) => {
                          const isBullet = paragraph.trim().startsWith('•') || paragraph.trim().startsWith('-');
                          const isNumbered = /^\d+\./.test(paragraph.trim());
                          return (
                            <p
                              key={pIdx}
                              className={`${
                                isBullet || isNumbered ? 'pl-4 border-l-2 border-blue-500/30 font-normal py-0.5' : 'font-normal'
                              }`}
                            >
                              {paragraph}
                            </p>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                );
              })
            )}

            {/* Legal Footer Note */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2 mt-8">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-300">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Document juridique certifié et conforme aux lois en vigueur</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pour toute question ou demande relative à vos droits, contactez notre DPO à <a href="mailto:Tmab6544@gmail.com" className="text-blue-400 underline hover:text-blue-300">Tmab6544@gmail.com</a>
              </p>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="p-4 bg-slate-800/90 border-t border-white/10 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Dernière révision : Septembre 2026 • TMAB GROUP
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-glow shadow-blue-500/20 active:scale-95 ml-auto"
            >
              Fermer et retourner
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
