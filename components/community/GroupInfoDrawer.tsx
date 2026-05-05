import React, { useState, useEffect } from 'react';
import { X, Users, Crown, ShieldAlert, LogOut, Trash2, UserMinus, ShieldCheck, Image as ImageIcon, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, Conversation, UserPresence } from '../../services/communityService';

interface GroupInfoDrawerProps {
    conversation: Conversation;
    currentUser: any;
    onClose: () => void;
    onLeave: () => void;
}

const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({ conversation, currentUser, onClose, onLeave }) => {
    const [members, setMembers] = useState<UserPresence[]>([]);
    const [loading, setLoading] = useState(true);
    const isAdmin = conversation.groupAdmin === currentUser.id;
    const isModerator = conversation.groupModerators?.includes(currentUser.id) || isAdmin;

    useEffect(() => {
        const fetchMembers = async () => {
            setLoading(true);
            try {
                // Pour simplifier, on récupère les présences des participants
                const memberData = await Promise.all(
                    conversation.participants.map(id => 
                        new Promise<UserPresence | null>(resolve => {
                            chatService.listenToUserPresence(id, resolve);
                        })
                    )
                );
                setMembers(memberData.filter(m => m !== null) as UserPresence[]);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchMembers();
    }, [conversation.participants]);

    const handlePromote = async (userId: string) => {
        if (!isAdmin) return;
        await chatService.updateMemberRole(conversation.id, userId, 'moderator');
        alert('Membre promu modérateur !');
    };

    const handleDemote = async (userId: string) => {
        if (!isAdmin) return;
        await chatService.updateMemberRole(conversation.id, userId, 'member');
        alert('Droits de modérateur retirés.');
    };

    const handleKick = async (userId: string) => {
        if (!isModerator) return;
        if (confirm('Voulez-vous vraiment exclure ce membre ?')) {
            await chatService.kickMember(conversation.id, userId);
        }
    };

    const handleDissolve = async () => {
        if (!isAdmin) return;
        if (confirm('Êtes-vous sûr de vouloir dissoudre ce groupe ? Cette action est irréversible.')) {
            await chatService.dissolveGroup(conversation.id);
            onLeave();
        }
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 right-0 w-full sm:w-80 bg-[#0f172a]/95  border-l border-white/10 z-[300] flex flex-col shadow-2xl"
        >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white">
                        {conversation.isGroup ? <Users size={20} /> : <FileText size={20} />}
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white">{conversation.isGroup ? 'Infos du groupe' : 'Infos du contact'}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            {conversation.isGroup ? `${conversation.participants.length} membres` : 'Discussion directe'}
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* Group/Contact Details */}
                <div className="text-center space-y-4">
                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-blue-600 to-purple-700 mx-auto flex items-center justify-center text-white text-3xl font-black shadow-2xl relative overflow-hidden">
                        {conversation.isGroup ? (
                            conversation.groupName?.[0]
                        ) : (
                            members.find(m => m.userId !== currentUser.id)?.avatar ? (
                                <img src={members.find(m => m.userId !== currentUser.id)?.avatar} className="w-full h-full object-cover" alt="" />
                            ) : members.find(m => m.userId !== currentUser.id)?.name[0]
                        )}
                        {isAdmin && conversation.isGroup && (
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-600 border-4 border-[#0f172a] flex items-center justify-center">
                                <Crown size={14} className="text-white" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white px-4">
                            {conversation.isGroup ? conversation.groupName : members.find(m => m.userId !== currentUser.id)?.name || 'Chargement...'}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            {conversation.isGroup ? `Créé par ${isAdmin ? 'vous' : 'un Administrateur'}` : 'Contact personnel'}
                        </p>
                    </div>
                </div>

                {/* Media Section Shortcut */}
                <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center gap-2 hover:bg-white/[0.05] transition-all group">
                        <ImageIcon size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Photos</span>
                    </button>
                    <button className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center gap-2 hover:bg-white/[0.05] transition-all group">
                        <FileText size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documents</span>
                    </button>
                </div>

                {/* Member List - Only for groups */}
                {conversation.isGroup && (
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Membres du groupe</h4>
                        <div className="space-y-2">
                            {members.map(member => {
                                const memberIsAdmin = conversation.groupAdmin === member.userId;
                                const memberIsMod = conversation.groupModerators?.includes(member.userId);
                                
                                return (
                                    <motion.div 
                                        key={member.userId}
                                        layout
                                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.03] transition-all group/item"
                                    >
                                        <div className="relative shrink-0">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-white text-sm">
                                                {member.name[0]}
                                            </div>
                                            {member.status === 'online' && (
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f172a]" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-black text-white truncate">{member.name}</p>
                                                {memberIsAdmin && <Crown size={12} className="text-yellow-500" />}
                                                {memberIsMod && !memberIsAdmin && <ShieldCheck size={12} className="text-blue-400" />}
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                {memberIsAdmin ? 'Administrateur' : memberIsMod ? 'Modérateur' : 'Membre'}
                                            </p>
                                        </div>

                                        {/* Admin Actions */}
                                        {isAdmin && member.userId !== currentUser.id && (
                                            <div className="hidden group-hover/item:flex items-center gap-1">
                                                {!memberIsMod ? (
                                                    <button onClick={() => handlePromote(member.userId)} title="Promouvoir" className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all">
                                                        <ShieldCheck size={16} />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleDemote(member.userId)} title="Rétrograder" className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all">
                                                        <ShieldAlert size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleKick(member.userId)} title="Exclure" className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                                                    <UserMinus size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Danger Zone */}
            <div className="p-6 border-t border-white/5 space-y-3">
                <button 
                    onClick={() => { 
                        if (conversation.isGroup) {
                            if (confirm('Quitter ce groupe ?')) onLeave();
                        } else {
                            if (confirm('Supprimer cette discussion ?')) {
                                chatService.deleteConversation(conversation.id, currentUser.id).then(() => onLeave());
                                onClose();
                            }
                        }
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <LogOut size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">
                            {conversation.isGroup ? 'Quitter le groupe' : 'Supprimer la discussion'}
                        </span>
                    </div>
                    <ChevronRight size={16} className="opacity-30 group-hover:opacity-100" />
                </button>

                {isAdmin && conversation.isGroup && (
                    <button 
                        onClick={handleDissolve}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/20 text-red-500 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <Trash2 size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">Dissoudre le groupe</span>
                        </div>
                        <ChevronRight size={16} className="opacity-30 group-hover:opacity-100" />
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default GroupInfoDrawer;
