import React, { useState, useEffect, useMemo } from 'react';
import { 
  Brain, Download, Trash2, CheckCircle2, XCircle, Search, Filter, 
  RefreshCw, Sparkles, BookOpen, Clock, AlertTriangle, FileText, Check, Layers
} from 'lucide-react';
import { telemetryService, StudentAIInteraction } from '../../services/telemetryService';

export const StudentBehaviorDataset: React.FC = () => {
  const [interactions, setInteractions] = useState<StudentAIInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportNotification, setExportNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await telemetryService.getInteractions();
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

  // Filtered interactions
  const filteredInteractions = useMemo(() => {
    return interactions.filter(item => {
      if (!item) return false;
      const promptStr = typeof item.prompt === 'string' ? item.prompt : (typeof item.prompt === 'object' ? JSON.stringify(item.prompt) : String(item.prompt || ''));
      const responseStr = typeof item.response === 'string' ? item.response : (typeof item.response === 'object' ? JSON.stringify(item.response) : String(item.response || ''));
      const userNameStr = typeof item.userName === 'string' ? item.userName : String(item.userName || '');
      const subjectStr = typeof item.subject === 'string' ? item.subject : String(item.subject || '');

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

  // Distinct subjects
  const subjects = useMemo(() => {
    const set = new Set<string>();
    interactions.forEach(i => {
      if (i.subject) set.add(i.subject);
    });
    return Array.from(set);
  }, [interactions]);

  // KPI Metrics
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
    await telemetryService.updateStatus(id, newStatus);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cet enregistrement du dataset ?')) {
      setInteractions(prev => prev.filter(item => item.id !== id));
      await telemetryService.deleteInteraction(id);
    }
  };

  const handleExportJSONL = () => {
    const datasetToExport = filteredInteractions.length > 0 ? filteredInteractions : interactions;
    telemetryService.exportToPCJSONL(datasetToExport, `levelmak_dataset_finetuning_${Date.now()}.jsonl`);
    triggerToast(`Dataset (.JSONL) enregistré avec succès sur votre ordinateur ! (${datasetToExport.length} exemples)`);
  };

  const handleExportJSON = () => {
    const datasetToExport = filteredInteractions.length > 0 ? filteredInteractions : interactions;
    telemetryService.exportToPCJSON(datasetToExport, `levelmak_dataset_ia_${Date.now()}.json`);
    triggerToast(`Fichier JSON sauvegardé sur votre ordinateur !`);
  };

  const handleClearCloud = async () => {
    if (confirm('⚠️ Attention : Cela effacera les données de Supabase Cloud pour garder votre base de données légère. Assurez-vous d\'avoir d\'abord exporté le fichier sur votre PC. Continuer ?')) {
      await telemetryService.clearCloudDataset();
      await loadData();
      triggerToast('Base de données Supabase purgée. Vos exports sont conservés sur votre PC.');
    }
  };

  const triggerToast = (msg: string) => {
    setExportNotification(msg);
    setTimeout(() => setExportNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {exportNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 size={22} />
          <span className="font-semibold text-sm">{exportNotification}</span>
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
                <h2 className="text-2xl font-bold text-white tracking-tight">Comportement Élèves & Dataset IA</h2>
                <p className="text-slate-400 text-sm">Entraînement & Fine-Tuning du futur modèle d'IA Levelmak Pro</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportJSONL}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Download size={18} />
              <span>Exporter .JSONL (PC Local)</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm transition-all"
            >
              <FileText size={18} />
              <span>Format JSON</span>
            </button>

            <button
              onClick={handleClearCloud}
              className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all"
              title="Vider la base cloud après avoir téléchargé sur votre ordinateur"
            >
              <Trash2 size={16} />
              <span>Vider Supabase</span>
            </button>

            <button
              onClick={loadData}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-all"
              title="Rafraîchir"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Interactions</span>
            <Layers size={18} className="text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{metrics.total}</div>
          <p className="text-xs text-slate-500 mt-1">Paires Prompt / Réponse capturées</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Validées (Fine-Tuning)</span>
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{metrics.approved}</div>
          <p className="text-xs text-slate-500 mt-1">{metrics.pending} en attente de curation</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Matières Couvertes</span>
            <BookOpen size={18} className="text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{metrics.subjectsCount}</div>
          <p className="text-xs text-slate-500 mt-1">Domaines d'apprentissage enregistrés</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Temps Moyen de Réflexion</span>
            <Clock size={18} className="text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-400">{metrics.avgTime}s</div>
          <p className="text-xs text-slate-500 mt-1">Par interaction avec le Coach IA</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par prompt, réponse ou élève..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Subject Filter */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300">
            <Filter size={15} className="text-slate-400" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Toutes les matières</option>
              {subjects.map(s => (
                <option key={s} value={s} className="bg-slate-900">{s}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les statuts</option>
              <option value="approved" className="bg-slate-900">Validés (Approuvés)</option>
              <option value="pending" className="bg-slate-900">En attente</option>
              <option value="rejected" className="bg-slate-900">Rejetés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dataset Table & List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={32} className="animate-spin text-indigo-500" />
            <p className="text-sm">Chargement des données de comportement des élèves...</p>
          </div>
        ) : filteredInteractions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Brain size={40} className="text-slate-600 mb-1" />
            <h4 className="text-base font-semibold text-slate-300">Aucune interaction trouvée</h4>
            <p className="text-sm text-slate-500 max-w-md">
              Les échanges des élèves avec le Coach IA apparaîtront ici automatiquement au fur et à mesure de leur utilisation.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredInteractions.map((item) => {
              const isExpanded = expandedId === item.id;
              const promptText = typeof item.prompt === 'string' ? item.prompt : (typeof item.prompt === 'object' ? JSON.stringify(item.prompt) : String(item.prompt || ''));
              const responseText = typeof item.response === 'string' ? item.response : (typeof item.response === 'object' ? JSON.stringify(item.response) : String(item.response || ''));

              return (
                <div 
                  key={item.id} 
                  className={`p-5 transition-colors hover:bg-slate-800/40 ${
                    item.status === 'approved' ? 'border-l-4 border-l-emerald-500' : 
                    item.status === 'rejected' ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-amber-500'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Left Meta Info */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold">
                        {String(item.subject || 'Général')}
                      </span>

                      <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium">
                        {String(item.gradeClass || 'Toutes Classes')}
                      </span>

                      <span className="text-xs text-slate-400 font-medium">
                        👤 {String(item.userName || 'Élève')}
                      </span>

                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(item.createdAt || Date.now()).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Right Curation Actions */}
                    <div className="flex items-center gap-2 self-end lg:self-auto">
                      {item.status !== 'approved' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'approved')}
                          className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          title="Valider pour l'entraînement IA"
                        >
                          <Check size={14} />
                          <span>Approuver</span>
                        </button>
                      )}

                      {item.status !== 'rejected' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'rejected')}
                          className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          title="Exclure du dataset"
                        >
                          <XCircle size={14} />
                          <span>Exclure</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-xs text-indigo-400 hover:underline font-medium ml-2"
                      >
                        {isExpanded ? 'Réduire' : 'Détails Echange'}
                      </button>
                    </div>
                  </div>

                  {/* Prompt & Response Preview */}
                  <div className="mt-3 space-y-2">
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide block mb-1">
                        💬 Question / Prompt Élève :
                      </span>
                      <p className="text-sm text-slate-200 font-mono whitespace-pre-wrap">
                        {isExpanded ? promptText : promptText.length > 220 ? promptText.substring(0, 220) + '...' : promptText}
                      </p>
                    </div>

                    {(isExpanded || responseText) && (
                      <div className="bg-slate-950/40 border border-indigo-900/30 rounded-xl p-3.5">
                        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide block mb-1">
                          🤖 Réponse Coach IA / Explication :
                        </span>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
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
