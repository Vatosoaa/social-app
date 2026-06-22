'use client';

import React, { useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Crown, Shield, User, Send,
  Image as ImageIcon, Video, Loader2, MoreHorizontal,
  LogOut as LeaveIcon, MessageSquare, Calendar, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/components/providers/alert-provider';
import type { DbUser } from '@/lib/session';

interface GroupDetailClientProps {
  currentUser: DbUser;
  group: any;
  members: any[];
  initialPosts: any[];
}

export default function GroupDetailClient({
  currentUser,
  group,
  members,
  initialPosts,
}: GroupDetailClientProps) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isPending, startTransition] = useTransition();
  const [activeSection, setActiveSection] = useState<'posts' | 'members' | 'about'>('posts');
  const [postContent, setPostContent] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleJoinGroup = async () => {
    startTransition(async () => {
      try {
        const { joinGroup } = await import('@/app/actions/groups');
        const result = await joinGroup(group.id);
        if (result?.success) {
          showAlert(`Vous avez rejoint "${group.name}" ! 🎉`);
          router.refresh();
        } else {
          showAlert(result?.message || 'Erreur lors de la jointure.');
        }
      } catch {
        showAlert('Erreur réseau.');
      }
    });
  };

  const handleLeaveGroup = async () => {
    startTransition(async () => {
      try {
        const { leaveGroup } = await import('@/app/actions/groups');
        const result = await leaveGroup(group.id);
        if (result?.success) {
          showAlert(`Vous avez quitté "${group.name}".`);
          router.refresh();
        } else {
          showAlert(result?.message || 'Erreur.');
        }
      } catch {
        showAlert('Erreur réseau.');
      }
    });
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    startTransition(async () => {
      try {
        const { createGroupPost } = await import('@/app/actions/groups');
        const result = await createGroupPost(group.id, postContent.trim());
        if (result?.success) {
          setPostContent('');
          router.refresh();
        } else {
          showAlert(result?.message || 'Erreur lors de la publication.');
        }
      } catch {
        showAlert('Erreur réseau.');
      }
    });
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <Crown className="h-3 w-3 text-amber-500" />;
    if (role === 'moderator') return <Shield className="h-3 w-3 text-blue-500" />;
    return null;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return (
      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-md text-[8px] font-bold uppercase">Admin</span>
    );
    if (role === 'moderator') return (
      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[8px] font-bold uppercase">Mod</span>
    );
    return null;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = Date.now();
    const diff = now - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-[#f3f6f9] text-slate-800 font-sans antialiased">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Back navigation */}
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Retour à l&apos;accueil
        </Link>

        {/* Group Header Card */}
        <div className="bg-white border border-slate-200/60 rounded-[28px] overflow-hidden shadow-xs">
          {/* Cover */}
          <div className="h-40 md:h-52 bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 relative overflow-hidden">
            {group.cover_url && (
              <img src={group.cover_url} alt="" className="w-full h-full object-cover absolute inset-0" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            
            {/* Group icon floating */}
            <div className="absolute bottom-4 left-6 flex items-end gap-4">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-white shadow-lg flex items-center justify-center text-3xl md:text-4xl">
                {group.icon || '👥'}
              </div>
              <div className="pb-1">
                <h1 className="text-xl md:text-2xl font-black text-white drop-shadow-lg leading-tight">{group.name}</h1>
                <p className="text-[11px] text-white/80 font-medium mt-0.5 flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  {group.members_count} membres
                  <span className="text-white/50">•</span>
                  <Globe className="h-3 w-3" />
                  {group.is_public ? 'Public' : 'Privé'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions row */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <p className="text-xs text-slate-500 max-w-md leading-relaxed line-clamp-2">{group.description}</p>
            
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              {group.is_member ? (
                <>
                  {group.user_role && (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-bold">
                      ✓ Membre
                    </span>
                  )}
                  <button
                    onClick={handleLeaveGroup}
                    disabled={isPending}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5"
                  >
                    <LeaveIcon className="h-3 w-3" />
                    Quitter
                  </button>
                </>
              ) : (
                <Button
                  onClick={handleJoinGroup}
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rejoindre'}
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 flex items-center gap-1">
            {(['posts', 'members', 'about'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveSection(tab)}
                className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${
                  activeSection === tab
                    ? 'text-blue-600 border-blue-600'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                {tab === 'posts' && 'Publications'}
                {tab === 'members' && `Membres (${members.length})`}
                {tab === 'about' && 'À propos'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-200">

          {/* Posts Section */}
          {activeSection === 'posts' && (
            <div className="space-y-4">
              {/* Create post (only for members) */}
              {group.is_member && (
                <form onSubmit={handleCreatePost} className="bg-white border border-slate-200/60 rounded-[24px] p-4 shadow-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                      {currentUser.avatar_url ? (
                        <img src={currentUser.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <textarea
                      value={postContent}
                      onChange={e => setPostContent(e.target.value)}
                      placeholder={`Écrire quelque chose dans "${group.name}"...`}
                      rows={3}
                      maxLength={1000}
                      className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      type="submit"
                      disabled={isPending || !postContent.trim()}
                      className="h-9 px-5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-1.5">Publier <Send className="h-3 w-3" /></span>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* Posts list */}
              {!group.is_member ? (
                <div className="bg-white border border-slate-200/60 rounded-[24px] p-8 text-center space-y-3">
                  <Users className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-600">Rejoignez ce groupe pour voir les publications</p>
                  <p className="text-xs text-slate-400">Les publications sont réservées aux membres du groupe.</p>
                </div>
              ) : initialPosts.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-[24px] p-8 text-center space-y-3">
                  <MessageSquare className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-600">Aucune publication</p>
                  <p className="text-xs text-slate-400">Soyez le premier à publier dans ce groupe !</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {initialPosts.map(post => (
                    <div key={post.id} className="bg-white border border-slate-200/60 rounded-[24px] p-5 shadow-xs space-y-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                          {post.author_avatar ? (
                            <img src={post.author_avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800">{post.author_name}</p>
                          <p className="text-[10px] text-slate-400" suppressHydrationWarning>{formatDate(post.created_at)}</p>
                        </div>
                      </div>

                      {post.content && (
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      )}

                      {post.media_url && (
                        <div className="rounded-2xl overflow-hidden border border-slate-200">
                          {post.media_type === 'video' ? (
                            <video src={post.media_url} controls className="w-full max-h-80 object-cover bg-black" />
                          ) : (
                            <img src={post.media_url} alt="" className="w-full max-h-80 object-cover" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members Section */}
          {activeSection === 'members' && (
            <div className="bg-white border border-slate-200/60 rounded-[24px] p-5 shadow-xs">
              <div className="space-y-2">
                {members.map(member => (
                  <Link
                    key={member.id}
                    href={member.user_id === currentUser.id ? '/profile' : `/profile/${member.user_id}`}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0 group-hover:scale-105 transition-transform">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">{member.name}</p>
                          {getRoleIcon(member.role)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getRoleBadge(member.role)}
                          <span className="text-[9px] text-slate-400" suppressHydrationWarning>
                            Rejoint {formatDate(member.joined_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* About Section */}
          {activeSection === 'about' && (
            <div className="bg-white border border-slate-200/60 rounded-[24px] p-6 shadow-xs space-y-5">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800">À propos de ce groupe</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {group.description || 'Aucune description disponible.'}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{group.is_public ? 'Groupe public' : 'Groupe privé'}</p>
                    <p className="text-[10px] text-slate-400">
                      {group.is_public ? 'Tout le monde peut rejoindre ce groupe.' : 'Une approbation est nécessaire pour rejoindre.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Users className="h-4 w-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{group.members_count} membres</p>
                    <p className="text-[10px] text-slate-400">Communauté active</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Créé le</p>
                    <p className="text-[10px] text-slate-400" suppressHydrationWarning>
                      {new Date(group.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {group.creator_name && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Crown className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Créé par</p>
                      <p className="text-[10px] text-slate-400">{group.creator_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
