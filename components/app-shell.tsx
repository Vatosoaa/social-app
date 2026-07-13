'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Home as HomeIcon, Users, MessageSquare, Bookmark, User,
  LogOut, Bell, Clapperboard, Radio
} from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { getFriends } from '@/app/actions/friends';
import { useAlert } from '@/components/providers/alert-provider';
import type { DbUser } from '@/lib/session';
import LiveSearchBar from '@/components/live-search-bar';


// Brand icons
const FigmaIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 0C29.4934 0 38 8.50659 38 19C38 24.3168 35.7925 29.1173 32.2227 32.5539C28.8471 35.8078 24.1611 38 19 38C8.50659 38 0 29.4934 0 19C0 8.50659 8.50659 0 19 0Z" fill="#F24E1E"/>
    <path d="M19 19C19 29.4934 27.5066 38 38 38C38 43.3168 35.7925 48.1173 32.2227 51.5539C28.8471 54.8078 24.1611 57 19 57C8.50659 57 0 48.4934 0 38C0 32.6832 2.2075 27.8827 5.77734 24.4461C9.15286 21.1922 13.8389 19 19 19Z" fill="#A259FF"/>
    <path d="M0 19C0 8.50659 8.50659 0 19 0V38C8.50659 38 0 29.4934 0 19Z" fill="#F24E1E"/>
    <path d="M19 38C19 27.5066 10.4934 19 0 19V38C0 48.4934 8.50659 57 19 57V38Z" fill="#1ABCFE"/>
    <path d="M38 19C38 8.50659 29.4934 0 19 0V38C29.4934 38 38 29.4934 38 19Z" fill="#FF7262"/>
    <path d="M38 38C38 27.5066 29.4934 19 19 19V38C29.4934 38 38 47.4934 38 38Z" fill="#0ACF83"/>
  </svg>
);

const SketchIcon = () => (
  <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 9.5L12 22L22 9.5L12 2Z" />
  </svg>
);

interface AppShellProps {
  currentUser: DbUser;
  children: React.ReactNode;
  /** Optional right sidebar content */
  rightSidebar?: React.ReactNode;
  /** Pre-fetched friends list from server — skips the client-side fetch if provided */
  initialFriendsList?: any[];
}

const GROUPS = [
  { id: 1, name: 'Figma Community', icon: <FigmaIcon /> },
  { id: 2, name: 'Sketch Community', icon: <SketchIcon /> },
];

export default function AppShell({ currentUser, children, rightSidebar, initialFriendsList }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { showAlert } = useAlert();
  const [isPending, startTransition] = useTransition();

  const [friendsList, setFriendsList] = useState<any[]>(initialFriendsList ?? []);

  useEffect(() => {
    // Only fetch if no initial list was passed from the server
    if (initialFriendsList !== undefined) return;
    async function loadFriends() {
      if (currentUser) {
        try {
          const list = await getFriends();
          setFriendsList(list);
        } catch (error) {
          console.error('Failed to load friends in sidebar:', error);
        }
      }
    }
    loadFriends();
  }, [currentUser, initialFriendsList]);

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
      router.push('/login');
    });
  };

  const NAV_TABS = [
    { id: 'home', icon: HomeIcon, href: '/' },
    { id: 'reels', icon: Clapperboard, href: '/reels' },
    { id: 'live', icon: Radio, href: '/live' },
    { id: 'messages', icon: MessageSquare, href: '/messages' },
    { id: 'profile', icon: User, href: '/profile' },
    { id: 'network', icon: Users, href: '/?tab=network' },
    { id: 'favorites', icon: Bookmark, href: '/?filter=favorites' },
  ];

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const filterParam = searchParams.get('filter');

  // Determine active tab from current pathname and query params
  const getActiveTab = (id: string, href: string) => {
    if (id === 'messages') return pathname === '/messages';
    if (id === 'profile') return pathname.startsWith('/profile');
    if (id === 'reels') return pathname === '/reels';
    if (id === 'live') return pathname === '/live';
    if (id === 'home') return pathname === '/' && !tabParam && !filterParam;
    if (id === 'network') return pathname === '/' && tabParam === 'network';
    if (id === 'favorites') return pathname === '/' && filterParam === 'favorites';
    return false;
  };

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#F0FDF4] text-[#14532D] font-sans antialiased flex flex-col pb-16 md:pb-0">

      {/* Outer container */}
      <div className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 h-full flex flex-col md:overflow-hidden">

        {/* Mobile top header */}
        <header className="flex md:hidden items-center justify-between bg-white/85 backdrop-blur-md border border-green-100/50 rounded-2xl px-4 py-2.5 mb-4 shadow-sm shadow-green-100/30">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white font-black text-lg shadow-sm shadow-green-500/25">T</div>
            <span className="text-xs font-bold tracking-tight text-[#14532D]">Twinkly</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/profile" className="h-8 w-8 rounded-full overflow-hidden border-2 border-white ring-2 ring-green-100/80 hover:ring-[#22C55E]/60 flex-shrink-0 shadow-sm transition-all duration-300">
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-green-50 flex items-center justify-center text-[#16A34A]">
                  <User className="h-4 w-4" />
                </div>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-[#16A34A] hover:text-white bg-green-50 hover:bg-rose-500 rounded-full transition-all duration-300 active:scale-95 flex items-center justify-center shadow-sm"
              title="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[260px_1fr_310px] gap-6 flex-1 items-stretch md:overflow-hidden">

          {/* LEFT SIDEBAR — fixed */}
          <aside className="hidden md:flex flex-col bg-white/80 backdrop-blur-md border border-green-100/50 rounded-[32px] p-6 space-y-7 shadow-sm shadow-green-100/30 hover:shadow-md hover:border-green-100/60 transition-all duration-300 md:h-full overflow-y-auto scrollbar-hide">
            {/* Logo */}
            <div className="flex items-center gap-3 pl-1">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white font-black text-xl shadow-md shadow-green-500/20 select-none">
                T
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-[#14532D] tracking-tight leading-none">Twinkly</span>
                <span className="text-[9px] text-[#86EFAC] font-bold mt-0.5 uppercase tracking-wider">Social app</span>
              </div>
            </div>

            {/* Search */}
            <LiveSearchBar variant="sidebar" placeholder="Rechercher..." />

            {/* Groups */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-[#86EFAC] uppercase tracking-widest pl-1 select-none">YOUR GROUP</p>
              <div className="space-y-1">
                {GROUPS.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-green-50 cursor-pointer transition-all duration-200 group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-6 w-6 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 text-xs border border-green-100/40">
                        {group.icon}
                      </span>
                      <span className="text-xs font-semibold text-[#14532D]/70 group-hover:text-[#14532D] transition-colors truncate">{group.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Friends */}
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between pl-1 pr-1 select-none">
                <p className="text-[10px] font-bold text-[#86EFAC] uppercase tracking-widest">FRIENDS</p>
                <Link href="/?tab=network" className="text-[9px] font-bold text-[#16A34A] bg-green-50 hover:bg-green-100 px-1.5 py-0.5 rounded-md transition-colors">
                  Ajouter
                </Link>
              </div>
              <div className="space-y-1 overflow-y-auto scrollbar-hide flex-1 pr-1">
                {friendsList.map(friend => (
                  <Link key={friend.id} href={friend.id === currentUser.id ? '/profile' : `/profile/${friend.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-green-50 cursor-pointer transition-all duration-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative h-7 w-7 rounded-full overflow-hidden bg-green-50 flex-shrink-0 border border-green-100/40">
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-green-50 flex items-center justify-center text-green-300">
                              <User className="h-3.5 w-3.5" />
                            </div>
                          )}
                          {friend.is_online && (
                            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-[#14532D]/80 truncate">{friend.name}</span>
                      </div>
                      <span className="text-[9px] text-[#86EFAC] font-medium">
                        {friend.is_online ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> : friend.time}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* CENTER — scrollable content */}
          <main className="flex flex-col space-y-0 min-w-0 flex-grow md:h-full md:overflow-y-auto scrollbar-hide md:pb-10">

            {/* Top Desktop Nav Tabs */}
            <div className="hidden md:block w-full sticky top-0 z-30 bg-[#F0FDF4]/90 backdrop-blur-md py-3 -mt-0 mb-2">
              <div className="flex items-center justify-center bg-white/80 backdrop-blur-md border border-green-100/50 rounded-2xl p-1.5 max-w-[420px] mx-auto w-full shadow-sm shadow-green-100/30 hover:shadow-md hover:border-green-100/60 transition-all duration-300">
                {NAV_TABS.map(tab => {
                  const isActive = getActiveTab(tab.id, tab.href);
                  return (
                    <Link key={tab.id} href={tab.href} className="flex-1">
                      <button
                        type="button"
                        className={`w-full py-2.5 rounded-xl flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-[#22C55E] text-white shadow-md shadow-green-500/20'
                            : 'text-[#86EFAC] hover:text-[#16A34A] hover:bg-green-50'
                        }`}
                      >
                        <tab.icon className="h-[18px] w-[18px]" />
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Page content */}
            {children}

          </main>

          {/* RIGHT SIDEBAR — always visible on desktop (lg) */}
          <aside className="hidden lg:flex flex-col space-y-6 md:h-full overflow-y-auto scrollbar-hide">

            {/* User header row */}
            <div className="flex items-center justify-between bg-white/80 backdrop-blur-md border border-green-100/50 rounded-full p-2 pl-4 shadow-sm shadow-green-100/30 hover:shadow-md hover:shadow-green-100/40 hover:border-green-100/60 transition-all duration-300">
              <button
                type="button"
                className="relative p-2.5 text-[#16A34A] hover:text-white bg-green-50/60 hover:bg-[#22C55E] rounded-full transition-all duration-300 active:scale-95 flex items-center justify-center shadow-sm"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f43f5e]/40 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-1 ring-white"></span>
                </span>
              </button>
              <div className="flex items-center gap-2.5">
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 pl-3.5 pr-1.5 py-1 rounded-full border border-transparent hover:border-green-100/40 hover:bg-green-50/50 transition-all duration-300 group cursor-pointer"
                >
                  <span className="text-xs font-bold text-[#14532D]/90 group-hover:text-[#16A34A] transition-colors tracking-wide">
                    {currentUser.name}
                  </span>
                  <div className="h-[34px] w-[34px] rounded-full overflow-hidden border-2 border-white ring-2 ring-green-100 group-hover:ring-[#22C55E]/50 group-hover:scale-102 transition-all duration-300 flex-shrink-0 shadow-sm">
                    {currentUser.avatar_url ? (
                      <img src={currentUser.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-green-50 flex items-center justify-center text-[#16A34A]">
                        <User className="h-4.5 w-4.5" />
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2.5 text-[#16A34A] hover:text-white bg-green-50/60 hover:bg-rose-500 rounded-full transition-all duration-300 active:scale-95 flex items-center justify-center shadow-sm"
                  title="Se déconnecter"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Injected right sidebar content */}
            {rightSidebar}

          </aside>


        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-green-100 py-2.5 px-6 flex items-center justify-between z-40 shadow-lg">
        {NAV_TABS.slice(0, 5).map(tab => {
          const isActive = getActiveTab(tab.id, tab.href);
          return (
            <Link key={tab.id} href={tab.href}>
              <button type="button" className={`p-2 rounded-xl transition-all ${isActive ? 'text-[#22C55E] bg-green-50' : 'text-[#86EFAC]'}`}>
                <tab.icon className="h-5 w-5" />
              </button>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
