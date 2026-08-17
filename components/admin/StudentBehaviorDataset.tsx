import React, { useState, useEffect, useMemo } from 'react';
import { 
  Brain, Download, Trash2, CheckCircle2, XCircle, Search, Filter, 
  RefreshCw, BookOpen, Clock, FileText, Check, Layers, HardDrive, AlertTriangle, Loader2
} from 'lucide-react';
import { studentAiService } from '../../services/studentAiService';
import { StudentAIInteraction } from '../../services/telemetryService';

// Génère un nom de fichier avec la date/heure actuelle ex: levelmak_dataset_2026-08-16_21h08
const getExportFileName = (extension: 'jsonl' | 'json') => {
  const now = new Date();
  const date = now.toLocaleDateString('fr-CA'); // YYYY-MM-DD
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `levelmak_dataset_${date}_${hours}h${minutes}.${extension}`;
};

export const StudentBehaviorDataset: React.FC = () => {
  const [interactions, setInteractions] = useState<StudentAIInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportNotification, setExportNotification] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState<'jsonl' | 'json' | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await studentAiService.getDataset();
      setInteractions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInteractions = useMemo(() => {
    return interactions.filter(item => {
      if (!item) return false;
      const promptStr = typeof item.prompt === 'string' ? item.prompt : JSON.stringify(item.prompt || '');
      const responseStr = typeof item.response === 'string' ? item.response : JSON.stringify(item.response || '');
      const userNameStr = String(item.userName || '');
      const subjectStr = String(item.subject || '');
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        promptStr.toLowerCase().includes(q) ||
        responseStr.toLowerCase().includes(q) ||
        userNameStr.toLowerCase().includes(q) ||
        subjectStr.toLowerCase().includes(q);
      const matchesSubject = selectedSubject === 'all' || subjectStr === selectedSubject;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      return matchesSearch && matchesSubject && matchesStatus;
    });
  }, [interactions, searchQuery, selectedSubject, selectedStatus]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    interactions.forEach(i => { if (i.subject) set.add(i.subject); });
    return Array.from(set);
  }, [interactions]);

  const metrics = useMemo(() => {
    const total = interactions.length;
    const approved = interactions.filter(i => i.status === 'approved').length;
    const pending = interactions.filter(i => i.status === 'pending').length;
    const subjectsCount = subjects.length;
    const avgTime = total > 0 
      ? Math.round(interactions.reduce((acc, curr) => acc + (curr.reasoningTimeSeconds || 0), 0) / total) 
      : 0;
    return { total, approved, pending, subjectsCount, avgTime };
  }, [interactions, subjects]);

  const handleStatusChange = async (id: string, newStatus: StudentAIInteraction['status']) => {
    setInteractions(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    await studentAiService.updateStatus(id, newStatus);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cet enregistrement du dataset ?')) {
      setInteractions(prev => prev.filter(item => item.id !== id));
      await studentAiService.deleteRecord(id);
    }
  };

  // Export ONLY (sans suppression)
  const handleExportJSONL = () => {
    const datasetToExport = filteredInteractions.length > 0 ? filteredInteractions : interactions;
    const filename = getExportFileName('jsonl');
    studentAiService.exportJSONL(datasetToExport, filename);
    triggerToast(`✅ ${datasetToExport.length} interactions exportées → ${filename}`);
  };

  const handleExportJSON = () => {
    const datasetToExport = filteredInteractions.length > 0 ? filteredInteractions : interactions;
    const filename = getExportFileName('json');
    studentAiService.exportJSON(datasetToExport, filename);
    triggerToast(`✅ Fichier JSON sauvegardé → ${filename}`);
  };

  // Export + Purge automatique (workflow recommandé)
  const handleExportAndPurge = async (format: 'jsonl' | 'json') => {
    const datasetToExport = interactions;
    if (datasetToExport.length === 0) {
      triggerToast('⚠️ Aucune donnée à exporter.');
      setShowPurgeModal(null);
      return;
    }
    // 1. Télécharger d'abord
    const filename = getExportFileName(format);
    if (format === 'jsonl') {
      studentAiService.exportJSONL(datasetToExport, filename);
    } else {
      studentAiService.exportJSON(datasetToExport, filename);
    }
    setShowPurgeModal(null);
    // 2. Purger Supabase après un court délai
    setPurging(true);
    await new Promise(r => setTimeout(r, 1500));
    try {
      await studentAiService.purgeCloudStorage();
      setInteractions([]);
      triggerToast(`✅ ${datasetToExport.length} interactions exportées (${filename}) et supprimées de Supabase.`);
    } catch (e) {
      triggerToast(`⚠️ Export OK mais erreur lors de la purge Supabase. Réessayez "Vider Supabase".`);
    } finally {
      setPurging(false);
    }
  };

  // Purge manuelle seule
  const handleClearCloud = async () => {
    if (confirm('⚠️ Attention : Cela effacera TOUTES les données du Dataset IA de Supabase.\n\nAssurez-vous d\'avoir exporté les données sur votre PC/disque dur avant de continuer !\n\nContinuer ?')) {
      setPurging(true);
      try {
        await studentAiService.purgeCloudStorage();
        await loadData();
        triggerToast('🗑️ Base Supabase purgée. Vos exports PC sont conservés.');
      } finally {
        setPurging(false);
      }
    }
  };

  const triggerToast = (msg: string) => {
    setExportNotification(msg);
    setTimeout(() => setExportNotification(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {exportNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-md">
          <CheckCircle2 size={22} className="shrink-0" />
          <span className="font-semibold text-sm">{exportNotification}</span>
        </div>
      )}

      {/* Modal de confirmation Export + Purge */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-500/20 rounded-xl">
                <HardDrive size={22} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Exporter & Purger Supabase</h3>
                <p className="text-slate-400 text-xs">Action irréversible</p>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-amber-200 text-sm font-medium leading-relaxed">
                  Cette action va :<br/>
                  <strong className="text-white">1.</strong> Télécharger <strong className="text-emerald-400">{interactions.length} interactions</strong> sur votre PC/disque dur<br/>
                  <strong className="text-white">2.</strong> Supprimer définitivement ces données de Supabase<br/>
                  <span className="text-slate-300 text-xs">→ Réduit les coûts d'hébergement Supabase</span>
                </p>
              </div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 mb-5 border border-slate-700">
              <p className="text-slate-300 text-xs font-mono flex items-center gap-2">
                <Download size={14} className="text-indigo-400 shrink-0" />
                <span className="text-indigo-300">{getExportFileName(showPurgeModal)}</span>
              </p>
              <p className="text-slate-500 text-[11px] mt-1 pl-5">Nom du fichier qui sera sauvegardé</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPurgeModal(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => handleExportAndPurge(showPurgeModal)}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 transition-all"
              >
                <Download size={16} />
                Confirmer Export &amp; Purge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading purge overlay */}
      {purging && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 flex items-center gap-4 shadow-2xl">
            <Loader2 size={28} className="text-indigo-400 animate-spin" />
            <div>
              <p className="text-white font-bold">Purge Supabase en cours...</p>
              <p className="text-slate-400 text-sm">Suppression des données exportées</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Brain size={26} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Comportement Élèves &amp; Dataset IA</h2>
                <p className="text-slate-400 text-sm">Entraînement &amp; Fine-Tuning du futur modèle d'IA Levelmak Pro</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Bouton principal recommandé : Export + Purge automatique */}
            <button
              onClick={() => interactions.length > 0 ? setShowPurgeModal('jsonl') : triggerToast('⚠️ Aucune donnée à exporter.')}
              disabled={purging}
              className="relative flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              title="Télécharge sur votre PC puis supprime de Supabase automatiquement"
            >
              <HardDrive size={17} />
              <span>Exporter &amp; Purger</span>
              <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Recommandé</span>
            </button>

            {/* Export JSONL seul */}
            <button
              onClick={handleExportJSONL}
              disabled={purging}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              title="Télécharger seulement (sans supprimer de Supabase)"
            >
              <Download size={18} />
              <span>Exporter .JSONL</span>
            </button>

            {/* Export JSON seul */}
            <button
              onClick={handleExportJSON}
              disabled={purging}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <FileText size={18} />
              <span>Format JSON</span>
            </button>

            {/* Vider Supabase manuellement */}
            <button
              onClick={handleClearCloud}
              disabled={purging}
              className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
              title="Vider Supabase manuellement (assurez-vous d'avoir exporté d'abord)"
            >
              <Trash2 size={16} />
              <span>Vider Supabase</span>
            </button>

            <button
              onClick={loadData}
              disabled={purging || loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-all"
              title="Rafraîchir"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Info bandeau */}
        <div className="relative z-10 mt-4 flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2.5">
          <HardDrive size={15} className="text-indigo-400 shrink-0" />
          <p className="text-indigo-300 text-xs font-medium">
            <strong className="text-white">Conseil :</strong> Utilisez <em>"Exporter &amp; Purger"</em> régulièrement pour télécharger les données sur votre PC/disque dur et libérer l'espace Supabase. Le fichier est nommé avec la date automatiquement.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Interactions</span>
            <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{metrics.total}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Paires Prompt / Réponse capturées</p>
        </div>
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Validées (Fine-Tuning)</span>
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{metrics.approved}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{metrics.pending} en attente de curation</p>
        </div>
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Matières Couvertes</span>
            <BookOpen size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{metrics.subjectsCount}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Domaines d'apprentissage enregistrés</p>
        </div>
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Temps Moyen de Réflexion</span>
            <Clock size={18} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">{metrics.avgTime}s</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Par interaction avec le Coach IA</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par prompt, réponse ou élève..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-semibold">
            <Filter size={15} className="text-slate-400" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-slate-200 focus:outline-none cursor-pointer font-bold"
            >
              <option value="all">Toutes les matières</option>
              {subjects.map(s => (
                <option key={s} value={s} className="bg-white dark:bg-slate-900">{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-semibold">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-slate-200 focus:outline-none cursor-pointer font-bold"
            >
              <option value="all">Tous les statuts</option>
              <option value="approved">Validés (Approuvés)</option>
              <option value="pending">En attente</option>
              <option value="rejected">Rejetés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dataset List */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <RefreshCw size={32} className="animate-spin text-indigo-500" />
            <p className="text-sm font-semibold text-slate-500">Chargement des données...</p>
          </div>
        ) : filteredInteractions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <Brain size={40} className="text-slate-400 mb-1" />
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-300">Aucune interaction trouvée</h4>
            <p className="text-sm text-slate-500 max-w-md font-medium">
              Les échanges des élèves avec le Coach IA apparaîtront ici automatiquement.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredInteractions.map((item) => {
              const isExpanded = expandedId === item.id;
              const promptText = typeof item.prompt === 'string' ? item.prompt : JSON.stringify(item.prompt || '');
              const responseText = typeof item.response === 'string' ? item.response : JSON.stringify(item.response || '');
              return (
                <div
                  key={item.id}
                  className={`p-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    item.status === 'approved' ? 'border-l-4 border-l-emerald-500' :
                    item.status === 'rejected' ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-amber-500'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold">
                        {String(item.subject || 'Général')}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 rounded-lg text-xs font-bold">
                        {String(item.gradeClass || 'Toutes Classes')}
                      </span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                        👤 {String(item.userName || 'Élève')}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                        <Clock size={12} />
                        {new Date(item.createdAt || Date.now()).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-end lg:self-auto">
                      {item.status !== 'approved' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'approved')}
                          className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          <Check size={14} />
                          <span>Approuver</span>
                        </button>
                      )}
                      {item.status !== 'rejected' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'rejected')}
                          className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          <XCircle size={14} />
                          <span>Exclure</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold ml-2"
                      >
                        {isExpanded ? 'Réduire' : 'Détails Echange'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide block mb-1">
                        💬 Question / Prompt Élève :
                      </span>
                      <p className="text-sm text-slate-900 dark:text-slate-200 font-mono whitespace-pre-wrap font-medium">
                        {isExpanded ? promptText : promptText.length > 220 ? promptText.substring(0, 220) + '...' : promptText}
                      </p>
                    </div>
                    {(isExpanded || responseText) && (
                      <div className="bg-indigo-50/50 dark:bg-slate-950/40 border border-indigo-200 dark:border-indigo-900/30 rounded-xl p-3.5">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide block mb-1">
                          🤖 Réponse Coach IA :
                        </span>
                        <p className="text-sm text-slate-800 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-medium">
                          {isExpanded ? responseText : responseText.length > 260 ? responseText.substring(0, 260) + '...' : responseText}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentBehaviorDataset;
