import React, { useState } from 'react';
import { Search, MoreVertical, Shield, Ban, Trash2, CheckCircle, XCircle, Filter, ChevronDown, User, UserX, Lock, Unlock, Mail, Phone, Calendar, GraduationCap, Award, Zap, Printer, Bell } from 'lucide-react';
import { AdminUserAnalytics, UserAnalytics } from '../../types';
import { deleteUser, suspendUser, blockUser, unblockUser, sanctionUser, deleteUserContentAndResetPoints, sendUserNotification, sendBulkNotification } from '../../services/adminService';
import { Gavel, AlertTriangle } from 'lucide-react';

const NOTIFICATION_TEMPLATES = [
    { id: 'custom', label: 'Message personnalisé...', title: '', message: '' },
    { 
        id: 'plagiarism', 
        label: 'Avertissement Plagiat', 
        title: 'Avertissement pour Plagiat', 
        message: 'Notre système a détecté du plagiat dans vos récents écrits. Merci de soumettre uniquement des textes originaux sous peine de suspension.' 
    },
    { 
        id: 'inappropriate', 
        label: 'Contenu inapproprié', 
        title: 'Contenu signalé', 
        message: 'Certains de vos écrits ont été signalés comme inappropriés. Merci de respecter notre charte communautaire.' 
    },
    { 
        id: 'tasks', 
        label: 'Travaux à faire', 
        title: 'Devoirs et Travaux en attente', 
        message: 'Tu as des exercices et des activités pédagogiques en attente. Ne laisse pas ton streak expirer !' 
    },
    { 
        id: 'congratulations', 
        label: 'Félicitations', 
        title: 'Félicitations', 
        message: 'Excellent travail sur Levelmak ! Tes efforts portent leurs fruits. Continue ainsi pour briller dans le classement !' 
    }
];
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useStore } from '../../hooks/useStore';

interface UserManagementProps {
    users: UserAnalytics[];
    onRefresh: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onRefresh }) => {
    const { user: currentUser } = useStore();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.email === '611@levelmak.app' || (currentUser as any)?.isAdmin === true;

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'blocked'>('all');
    const [filterRole, setFilterRole] = useState<'all' | 'student' | 'teacher'>('all');
    const [selectedUser, setSelectedUser] = useState<UserAnalytics | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'suspend' | 'block' | 'activate' | 'sanction' | 'reset_all' | null; userId: string | null }>({ type: null, userId: null });
    const [sanctionType, setSanctionType] = useState<'deduct_xp' | 'deduct_coins' | 'warning'>('warning');
    const [sanctionAmount, setSanctionAmount] = useState(0);
    const [loading, setLoading] = useState(false);

    // Notification sending state
    const [notifTitle, setNotifTitle] = useState('');
    const [notifMessage, setNotifMessage] = useState('');
    const [notifSending, setNotifSending] = useState(false);

    // Bulk actions state
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [bulkNotifOpen, setBulkNotifOpen] = useState(false);
    const [bulkTitle, setBulkTitle] = useState('');
    const [bulkMessage, setBulkMessage] = useState('');
    const [bulkSending, setBulkSending] = useState(false);

    const handleSendBulkNotif = async () => {
        if (selectedUserIds.length === 0 || !bulkTitle || !bulkMessage) return;
        setBulkSending(true);
        try {
            await sendBulkNotification(selectedUserIds, bulkTitle, bulkMessage);
            alert(`Notification groupée envoyée à ${selectedUserIds.length} utilisateurs !`);
            setBulkTitle('');
            setBulkMessage('');
            setSelectedUserIds([]);
            setBulkNotifOpen(false);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'envoi groupé de la notification");
        } finally {
            setBulkSending(false);
        }
    };

    const handleSendNotif = async () => {
        if (!selectedUser || !notifTitle || !notifMessage) return;
        setNotifSending(true);
        try {
            await sendUserNotification(selectedUser.userId, notifTitle, notifMessage);
            alert("Notification envoyée avec succès !");
            setNotifTitle('');
            setNotifMessage('');
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'envoi de la notification");
        } finally {
            setNotifSending(false);
        }
    };

    const isSuperAdminUser = (user: AdminUserAnalytics) => {
        const e = (user.email || '').toLowerCase();
        const u = (user.userName || '').toLowerCase();
        const id = (user.userId || '').toLowerCase();
        return e === 'levelmak611@gmail.com' ||
               e === '611@levelmak.app' ||
               u === 'levelmak611' ||
               id === '61100000-0000-4000-a000-000000000611' ||
               id === 'admin_levelmak611_id' ||
               id === 'levelmak611' ||
               (user as any).role === 'admin';
    };

    const filteredUsers = users.filter(user => {
        if (isSuperAdminUser(user)) return false; // Hide super admin account from regular user list

        const uName = user.userName || '';
        const uEmail = user.email || '';
        const uPhone = user.phoneNumber || '';
        const matchesSearch = uName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            uEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            uPhone.includes(searchTerm);
        const isBlocked = user.status === 'blocked' || (user as any).isBlocked === true;
        const isSuspended = user.status === 'suspended' || (user as any).isSuspended === true;
        const isActive = !isBlocked && !isSuspended;

        const matchesStatus = filterStatus === 'all' || 
                            (filterStatus === 'blocked' && isBlocked) ||
                            (filterStatus === 'suspended' && isSuspended) ||
                            (filterStatus === 'active' && isActive);
        const matchesRole = filterRole === 'all' || 
                            (filterRole === 'teacher' && (user as any).role === 'teacher') ||
                            (filterRole === 'student' && (user as any).role !== 'teacher');
        return matchesSearch && matchesStatus && matchesRole;
    });

    const handleAction = async (type: 'delete' | 'suspend' | 'block' | 'activate' | 'sanction' | 'reset_all', userId: string) => {
        const targetUser = users.find(u => u.userId === userId);
        if (targetUser && isSuperAdminUser(targetUser)) {
            alert("Action interdite : Le compte Administrateur Principal ne peut pas être modifié ou supprimé !");
            return;
        }
        setLoading(true);
        try {
            if (type === 'delete') await deleteUser(userId);
            else if (type === 'suspend') await suspendUser(userId);
            else if (type === 'block') await blockUser(userId);
            else if (type === 'activate') await unblockUser(userId);
            else if (type === 'sanction') await sanctionUser(userId, sanctionType, sanctionAmount);
            else if (type === 'reset_all') await deleteUserContentAndResetPoints(userId);

            onRefresh();
            setConfirmAction({ type: null, userId: null });
        } catch (error: any) {
            console.error(`Error performing ${type}:`, error);
            alert(error.message || `Erreur lors de l'action ${type}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        if (filteredUsers.length === 0) {
            alert('Pas de données à imprimer');
            return;
        }

        if ((window as any).Capacitor?.getPlatform() === 'web' || !(window as any).Capacitor?.getPlatform()) {
            window.print();
            return;
        }
        setLoading(true);
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            try { doc.addImage('/tmab_logo.png', 'PNG', 14, 5, 25, 25); } catch (e) {
                doc.setFontSize(24);
                doc.setTextColor(59, 130, 246);
                doc.text("TMAB", 14, 20);
            }
            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59);
            doc.text(`UTILISATEURS`, 45, 18);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Filtre: ${filterStatus.toUpperCase()}`, 45, 24);
            doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, 45, 30);
            
            const tableData = filteredUsers.map(user => [
                user.userName,
                user.email,
                user.education || 'N/A',
                `Niv ${user.level} (${user.xp} XP)`,
                user.status
            ]);
            autoTable(doc, {
                startY: 40,
                head: [['Nom', 'Email', 'Classe', 'Progression', 'Statut']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] }
            });
            const pdfArray = doc.output('arraybuffer');
            const uint8 = new Uint8Array(pdfArray);
            let binary = "";
            for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
            const base64Data = btoa(binary);
            const filename = `utilisateurs_${Date.now()}.pdf`;
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
            });
            await Share.share({ url: result.uri, dialogTitle: 'Partager / Imprimer PDF' });
        } catch(e) {
            console.error(e);
            alert('Erreur lors de la création du PDF');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:hidden">
                <StatCard label="Élèves" value={users.filter(u => (u as any).role !== 'teacher').length} color="blue" />
                <StatCard label="Enseignants" value={users.filter(u => (u as any).role === 'teacher').length} color="purple" />
                <StatCard label="Actifs" value={users.filter(u => u.status !== 'blocked' && u.status !== 'suspended' && !(u as any).isBlocked && !(u as any).isSuspended).length} color="green" />
                <StatCard label="Suspendus" value={users.filter(u => u.status === 'suspended' || (u as any).isSuspended === true).length} color="orange" />
                <StatCard label="Bloqués" value={users.filter(u => u.status === 'blocked' || (u as any).isBlocked === true).length} color="red" />
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm print:hidden">
                <div className="relative w-full lg:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-400"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center">
                    {/* Role Filter */}
                    <div className="flex bg-black/20 p-1 rounded-xl w-full sm:w-auto">
                        {([
                            { id: 'all', label: 'Tous Rôles' },
                            { id: 'student', label: 'Élèves' },
                            { id: 'teacher', label: 'Enseignants' }
                        ] as const).map((r) => (
                            <button
                                key={r.id}
                                onClick={() => setFilterRole(r.id)}
                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterRole === r.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Status Filter */}
                    <div className="flex bg-black/20 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                        {(['all', 'active', 'suspended', 'blocked'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterStatus === status
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {status === 'all' ? 'Statuts' : status === 'active' ? 'Actifs' : status === 'suspended' ? 'Suspendus' : 'Bloqués'}
                            </button>
                        ))}
                        <button
                            onClick={handlePrint}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center disabled:opacity-50"
                            title="Imprimer"
                        >
                            <Printer size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-black/20 border-b border-slate-200 dark:border-white/10">
                                <th className="px-4 py-4 text-center w-12">
                                    <input 
                                        type="checkbox"
                                        checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedUserIds(filteredUsers.map(u => u.userId));
                                            } else {
                                                setSelectedUserIds([]);
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-blue-600 focus:ring-0 outline-none cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider min-w-[250px]">Utilisateur</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">Rôle</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">Niveau & XP</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">Statut</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">Activité</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredUsers.map((user) => (
                                <tr key={user.userId} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                    <td className="px-4 py-4 text-center">
                                        <input 
                                            type="checkbox"
                                            checked={selectedUserIds.includes(user.userId)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedUserIds(prev => [...prev, user.userId]);
                                                } else {
                                                    setSelectedUserIds(prev => prev.filter(id => id !== user.userId));
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-blue-600 focus:ring-0 outline-none cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black shadow-md">
                                                {(user.userName || 'Utilisateur').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.userName || 'Utilisateur'}</p>
                                                <p className="text-[10px] text-slate-500">{user.email || 'N/A'}</p>
                                                {user.phoneNumber && <p className="text-[10px] text-slate-500 font-bold">{user.phoneNumber}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${(user as any).role === 'teacher'
                                            ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                                            : 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                                        }`}>
                                            {(user as any).role === 'teacher' ? 'Enseignant' : 'Élève'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Award size={14} className="text-yellow-500" />
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">Lvl {user.level}</span>
                                            </div>
                                            <div className="w-24 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }}></div>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{user.xp} XP total</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${user.status === 'suspended' || (user as any).isSuspended
                                            ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20'
                                            : user.status === 'blocked' || (user as any).isBlocked
                                                ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                                : 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20'
                                            }`}>
                                            {user.status === 'suspended' || (user as any).isSuspended ? 'Suspendu' : user.status === 'blocked' || (user as any).isBlocked ? 'Bloqué' : 'Actif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-slate-900 dark:text-white font-medium">{new Date(user.lastActive).toLocaleDateString('fr-FR')}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Dernière activité</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all"
                                                title="Détails"
                                            >
                                                <Shield size={16} />
                                            </button>

                                            {isAdmin && (
                                                <>
                                                    {user.status !== 'suspended' && user.status !== 'blocked' && !(user as any).isSuspended && !(user as any).isBlocked ? (
                                                        <>
                                                            <button
                                                                onClick={() => setConfirmAction({ type: 'suspend', userId: user.userId })}
                                                                className="p-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg transition-all"
                                                                title="Suspendre"
                                                            >
                                                                <Ban size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmAction({ type: 'block', userId: user.userId })}
                                                                className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-all"
                                                                title="Bloquer"
                                                            >
                                                                <Lock size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmAction({ type: 'sanction', userId: user.userId })}
                                                                className="p-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition-all"
                                                                title="Sanctionner"
                                                            >
                                                                <Gavel size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmAction({ type: 'activate', userId: user.userId })}
                                                            className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all"
                                                            title="Réactiver"
                                                        >
                                                            <Unlock size={16} />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => setConfirmAction({ type: 'delete', userId: user.userId })}
                                                        className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-20 text-slate-600">
                        <UserX size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-bold">Aucun utilisateur trouvé</p>
                        <p className="text-sm">Essayez d'ajuster vos critères de recherche</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto flex items-start justify-center p-4 md:py-8" onClick={() => setSelectedUser(null)}>
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 md:space-y-8 animate-in zoom-in-95 duration-300 my-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl sm:text-4xl text-white font-black shadow-2xl shrink-0">
                                {(selectedUser.userName || 'Utilisateur').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 w-full">
                                <h3 className="text-2xl sm:text-3xl font-black text-white break-words">{selectedUser.userName || 'Utilisateur'}</h3>
                                <p className="text-slate-400 flex items-center justify-center sm:justify-start gap-2 mt-1 truncate">
                                    <Mail size={14} className="shrink-0" /> <span className="truncate">{selectedUser.email || 'N/A'}</span>
                                </p>
                                <p className="text-slate-400 flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                                    <Phone size={14} className="shrink-0" /> {selectedUser.phoneNumber || 'Non renseigné'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                            <DetailItem icon={<Calendar />} label="Âge" value={selectedUser.ageRange || 'N/A'} />
                            <DetailItem icon={<User />} label="Genre" value={selectedUser.gender || 'N/A'} />
                            <DetailItem icon={<GraduationCap />} label="Classe" value={selectedUser.education || 'N/A'} />
                            <DetailItem icon={<Award />} label="Niveau" value={`Niveau ${selectedUser.level}`} />
                            <DetailItem icon={<Zap />} label="XP" value={`${selectedUser.xp} XP`} />
                            <DetailItem icon={<CheckCircle />} label="Quiz" value={`${selectedUser.quizzesCompleted} complétés`} />
                        </div>

                        {/* Custom Notification form */}
                        <div className="pt-6 border-t border-white/5 space-y-4">
                            <h4 className="text-sm font-black text-slate-300 uppercase tracking-wider">Envoyer une Notification Personnalisée</h4>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Modèle de notification</label>
                                    <select
                                        onChange={(e) => {
                                            const template = NOTIFICATION_TEMPLATES.find(t => t.id === e.target.value);
                                            if (template && template.id !== 'custom') {
                                                setNotifTitle(template.title);
                                                setNotifMessage(template.message);
                                            } else {
                                                setNotifTitle('');
                                                setNotifMessage('');
                                            }
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"
                                    >
                                        {NOTIFICATION_TEMPLATES.map(t => (
                                            <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Titre de la notification (ex: Félicitations !)"
                                    value={notifTitle}
                                    onChange={(e) => setNotifTitle(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50"
                                />
                                <textarea
                                    placeholder="Message à envoyer..."
                                    value={notifMessage}
                                    onChange={(e) => setNotifMessage(e.target.value)}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 resize-none"
                                />
                                <button
                                    onClick={handleSendNotif}
                                    disabled={notifSending || !notifTitle || !notifMessage}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
                                >
                                    {notifSending ? "Envoi..." : "Envoyer la notification"}
                                </button>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 flex gap-4 flex-wrap">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="flex-1 min-w-[120px] py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black transition-all"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={() => {
                                    setConfirmAction({ type: 'reset_all', userId: selectedUser.userId });
                                    setSelectedUser(null);
                                }}
                                className="flex-1 min-w-[120px] py-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 rounded-2xl font-black transition-all"
                            >
                                Sanction Totale
                            </button>
                            <button
                                onClick={() => {
                                    setConfirmAction({ type: 'suspend', userId: selectedUser.userId });
                                    setSelectedUser(null);
                                }}
                                className="flex-1 min-w-[120px] py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-orange-600/20"
                            >
                                Suspendre
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Confirmation Modal */}
            {confirmAction.type && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-6">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                            confirmAction.type === 'delete' || confirmAction.type === 'reset_all' ? 'bg-red-500/20 text-red-500' : 
                            confirmAction.type === 'sanction' ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-orange-500/20 text-orange-500'
                        }`}>
                            {confirmAction.type === 'delete' ? <Trash2 size={40} /> : 
                             confirmAction.type === 'activate' ? <Unlock size={40} /> : 
                             confirmAction.type === 'sanction' || confirmAction.type === 'reset_all' ? <Gavel size={40} /> :
                             <Ban size={40} />}
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-white">
                                {confirmAction.type === 'sanction' ? 'Appliquer une sanction' : 
                                 confirmAction.type === 'reset_all' ? 'Sanction Totale (Vider & Réinitialiser)' : 'Êtes-vous sûr ?'}
                            </h4>
                            <p className="text-slate-400 text-sm mt-2">
                                {confirmAction.type === 'activate' ? "Cette action rendra l'accès complet à l'utilisateur immédiatement." : 
                                 confirmAction.type === 'sanction' ? "Choisissez la sanction à appliquer à cet utilisateur." :
                                 confirmAction.type === 'reset_all' ? "Attention : cela va supprimer TOUT le contenu généré par l'élève (commentaires, avis, histoires/messages, activités) et remettre ses XP et LevelCoins à 0." :
                                 "Cette action sur l'utilisateur est irréversible et affectera son accès à la plateforme."}
                            </p>
                        </div>

                        {confirmAction.type === 'sanction' && (
                            <div className="space-y-4 text-left">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Type de sanction</label>
                                    <select 
                                        value={sanctionType}
                                        onChange={(e) => setSanctionType(e.target.value as any)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none"
                                    >
                                        <option value="warning" className="bg-slate-900 text-white">Avertissement</option>
                                        <option value="deduct_xp" className="bg-slate-900 text-white">Retirer des XP</option>
                                        <option value="deduct_coins" className="bg-slate-900 text-white">Retirer des LevelCoins</option>
                                    </select>
                                </div>
                                {sanctionType !== 'warning' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Montant</label>
                                        <input 
                                            type="number"
                                            value={sanctionAmount}
                                            onChange={(e) => setSanctionAmount(parseInt(e.target.value) || 0)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none"
                                            placeholder="Ex: 50"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmAction({ type: null, userId: null })}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleAction(confirmAction.type!, confirmAction.userId!)}
                                disabled={loading}
                                className={`flex-1 py-3 text-white rounded-xl font-bold transition-all ${
                                    confirmAction.type === 'delete' || confirmAction.type === 'reset_all' ? 'bg-red-600 hover:bg-red-700' :
                                    confirmAction.type === 'activate' ? 'bg-green-600 hover:bg-green-700' :
                                    confirmAction.type === 'sanction' ? 'bg-yellow-600 hover:bg-yellow-700 shadow-lg shadow-yellow-600/20' :
                                    'bg-orange-600 hover:bg-orange-700'
                                }`}
                            >
                                {loading ? '...' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Actions Floating Bar */}
            {selectedUserIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/15 px-6 py-4 rounded-2xl shadow-2xl z-40 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-300">
                    <span className="text-sm font-bold text-white">
                        {selectedUserIds.length} utilisateur{selectedUserIds.length > 1 ? 's' : ''} sélectionné{selectedUserIds.length > 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setBulkTitle('');
                                setBulkMessage('');
                                setBulkNotifOpen(true);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <Bell size={14} /> Envoyer notification
                        </button>
                        <button
                            onClick={() => setSelectedUserIds([])}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all"
                        >
                            Désélectionner
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Notification Modal */}
            {bulkNotifOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto flex items-start justify-center p-4 md:py-8" onClick={() => setBulkNotifOpen(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 my-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg">
                                <Bell size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">Envoi Groupé de Notification</h3>
                                <p className="text-slate-400 text-xs mt-0.5">Envoi à {selectedUserIds.length} utilisateurs sélectionnés</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Modèle de notification</label>
                                <select
                                    onChange={(e) => {
                                        const template = NOTIFICATION_TEMPLATES.find(t => t.id === e.target.value);
                                        if (template && template.id !== 'custom') {
                                            setBulkTitle(template.title);
                                            setBulkMessage(template.message);
                                        } else {
                                            setBulkTitle('');
                                            setBulkMessage('');
                                        }
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"
                                >
                                    {NOTIFICATION_TEMPLATES.map(t => (
                                        <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Titre</label>
                                <input
                                    type="text"
                                    placeholder="Titre de la notification"
                                    value={bulkTitle}
                                    onChange={(e) => setBulkTitle(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Message</label>
                                <textarea
                                    placeholder="Message à envoyer..."
                                    value={bulkMessage}
                                    onChange={(e) => setBulkMessage(e.target.value)}
                                    rows={4}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/5">
                            <button
                                onClick={() => setBulkNotifOpen(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all text-xs uppercase"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSendBulkNotif}
                                disabled={bulkSending || !bulkTitle || !bulkMessage}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all text-xs uppercase shadow-lg shadow-blue-600/20"
                            >
                                {bulkSending ? "Envoi..." : "Confirmer l'envoi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-components
const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 shadow-sm',
        purple: 'bg-purple-50 dark:bg-purple-600/10 border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400 shadow-sm',
        green: 'bg-emerald-50 dark:bg-green-600/10 border-emerald-200 dark:border-green-500/20 text-emerald-700 dark:text-green-400 shadow-sm',
        orange: 'bg-orange-50 dark:bg-orange-600/10 border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 shadow-sm',
        red: 'bg-red-50 dark:bg-red-600/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 shadow-sm'
    };
    return (
        <div className={`${colors[color]} border rounded-2xl p-6 backdrop-blur-xl transition-all`}>
            <p className="text-3xl font-black tracking-tighter">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-90 text-current">{label}</p>
        </div>
    );
};

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <span className="scale-75 origin-left">{icon}</span>
            <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-slate-900 dark:text-white font-bold">{value}</p>
    </div>
);

export default UserManagement;
