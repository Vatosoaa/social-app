'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, User, Hash, FileText, Loader2, TrendingUp, X } from 'lucide-react';

interface SearchUser {
  id: number;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  followers_count: number;
  is_following: boolean;
}

interface SearchPost {
  id: number;
  content: string;
  author_name: string;
  author_avatar: string | null;
}

interface SearchResults {
  users: SearchUser[];
  posts: SearchPost[];
  hashtags: SearchPost[];
}

const TRENDING_HASHTAGS = ['nextjs', 'react', 'tailwindcss', 'webdev', 'inspiration', 'twinkly'];

function highlightMatch(text: string, query: string, highlightClass = "bg-violet-500/25 text-violet-300") {
  if (!query || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className={`${highlightClass} rounded px-0.5 not-italic`}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}

interface LiveSearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  variant?: 'default' | 'navbar' | 'sidebar';
}

export default function LiveSearchBar({ initialQuery = '', placeholder, variant = 'default' }: LiveSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isNavbar = variant === 'navbar';
  const isSidebar = variant === 'sidebar';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setResults({ users: [], posts: [], hashtags: [] });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(val.trim());
    }, 300);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (query.trim()) fetchResults(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  // Build flat list of navigatable items for keyboard nav
  const allItems: { href: string }[] = [
    ...(results?.users || []).map(u => ({ href: `/profile/${u.id}` })),
    ...(results?.posts || []).map(p => ({ href: `/search?q=${encodeURIComponent(query)}&tab=posts` })),
    ...(results?.hashtags || []).map(h => ({ href: `/search?q=${encodeURIComponent(query)}&tab=hashtags` })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && allItems[activeIndex]) {
        e.preventDefault();
        setIsOpen(false);
        router.push(allItems[activeIndex].href);
      } else {
        handleSubmit(e as any);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const hasResults = results && (results.users.length + results.posts.length + results.hashtags.length) > 0;
  const showDropdown = isOpen;

  let flatIdx = 0;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className={`absolute ${isNavbar || isSidebar ? 'left-3' : 'left-4'} flex items-center pointer-events-none`}>
          {isLoading ? (
            <Loader2 className={`h-4 w-4 ${isNavbar ? 'text-teal-400' : isSidebar ? 'text-blue-500' : 'text-violet-400'} animate-spin`} />
          ) : (
            <Search className={`h-3.5 w-3.5 ${isNavbar ? 'text-zinc-500' : isSidebar ? 'text-slate-400' : 'text-zinc-400'}`} />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || (isSidebar ? 'Rechercher...' : 'Rechercher sur Twinkly (membres, publications, #tags)...')}
          autoComplete="off"
          className={
            isSidebar
              ? "w-full pl-9 pr-8 h-9 bg-slate-100/70 border border-transparent hover:bg-slate-250/50 focus:bg-white focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-slate-800 placeholder:text-slate-450 text-xs transition-all duration-200 font-semibold"
              : isNavbar
                ? "w-full pl-9 pr-8 h-9 bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-900/80 rounded-full text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500/50 text-xs transition-all duration-200"
                : "w-full pl-11 pr-10 h-12 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 text-sm transition-all duration-200"
          }
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute ${isNavbar || isSidebar ? 'right-2.5 h-5 w-5' : 'right-3.5 h-6 w-6'} flex items-center justify-center rounded-full ${isSidebar ? 'bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'} transition-all`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className={`absolute top-[calc(100%+8px)] left-0 right-0 z-[9999] rounded-2xl border ${
          isSidebar
            ? 'border-slate-200 bg-white shadow-xl shadow-slate-200/50'
            : 'border-zinc-800 bg-zinc-950/98 shadow-2xl shadow-black/60'
        } backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>

          {/* Trending / Empty state when no query */}
          {!query && (
            <div className="p-4 space-y-3">
              <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
                isSidebar ? 'text-slate-400' : 'text-zinc-500'
              }`}>
                <TrendingUp className="h-3.5 w-3.5" />
                Hashtags populaires
              </div>
              <div className="flex flex-wrap gap-2">
                {TRENDING_HASHTAGS.map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent('#' + tag)}`}
                    onClick={() => setIsOpen(false)}
                    className={`px-3 py-1.5 text-xs rounded-xl border font-medium transition-all duration-200 ${
                      isSidebar
                        ? 'border-slate-100 hover:border-blue-500/30 bg-slate-50 hover:bg-blue-50/50 text-slate-650 hover:text-blue-600'
                        : 'border-zinc-800 hover:border-violet-600/50 bg-zinc-900/60 hover:bg-violet-600/10 text-violet-400 hover:text-violet-300'
                    }`}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Loading shimmer */}
          {query && isLoading && !results && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className={`h-9 w-9 rounded-full ${isSidebar ? 'bg-slate-100' : 'bg-zinc-800/60'}`} />
                  <div className="flex-1 space-y-1.5">
                    <div className={`h-3 rounded-full w-32 ${isSidebar ? 'bg-slate-100' : 'bg-zinc-800/60'}`} />
                    <div className={`h-2.5 rounded-full w-48 ${isSidebar ? 'bg-slate-100/70' : 'bg-zinc-800/40'}`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {query && !isLoading && results && (
            <>
              {!hasResults ? (
                <div className={`flex flex-col items-center justify-center py-8 text-center space-y-1 ${
                  isSidebar ? 'text-slate-500' : 'text-zinc-500'
                }`}>
                  <Search className={`h-6 w-6 mb-1 ${isSidebar ? 'text-slate-300' : 'text-zinc-705'}`} />
                  <p className="text-xs font-semibold">Aucun résultat pour "{query}"</p>
                  <p className={`text-[11px] ${isSidebar ? 'text-slate-400' : 'text-zinc-500'}`}>Essayez un autre mot-clé ou un hashtag</p>
                </div>
              ) : (
                <div className={`divide-y ${isSidebar ? 'divide-slate-100' : 'divide-zinc-800/50'}`}>

                  {/* Users Section */}
                  {results.users.length > 0 && (
                    <div className="p-3 space-y-1">
                      <p className={`text-[10px] font-bold uppercase tracking-wider px-2 pb-1 ${
                        isSidebar ? 'text-slate-400' : 'text-zinc-500'
                      }`}>
                        Membres
                      </p>
                      {results.users.map((user) => {
                        const idx = flatIdx++;
                        const isActive = activeIndex === idx;
                        return (
                          <Link
                            key={user.id}
                            href={`/profile/${user.id}`}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-155 group border ${
                              isActive
                                ? isSidebar
                                  ? 'bg-blue-50/50 border-blue-500/10'
                                  : 'bg-violet-600/15 border-violet-500/20'
                                : isSidebar
                                  ? 'border-transparent hover:bg-slate-50'
                                  : 'border-transparent hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className={`relative flex-shrink-0 h-9 w-9 rounded-full overflow-hidden border flex items-center justify-center transition-all ${
                              isSidebar
                                ? 'border-slate-200 bg-slate-50 group-hover:border-blue-500/30'
                                : 'border-zinc-800 bg-zinc-900 group-hover:border-violet-500/30'
                            }`}>
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <User className={`h-4 w-4 ${isSidebar ? 'text-slate-400' : 'text-zinc-500'}`} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold truncate transition-colors ${
                                isActive
                                  ? isSidebar
                                    ? 'text-blue-600'
                                    : 'text-violet-300'
                                  : isSidebar
                                    ? 'text-slate-700 group-hover:text-blue-600'
                                    : 'text-zinc-200 group-hover:text-violet-400'
                              }`}>
                                {highlightMatch(
                                  user.name || 'Utilisateur',
                                  query,
                                  isSidebar ? 'bg-blue-500/10 text-blue-600' : 'bg-violet-500/25 text-violet-300'
                                )}
                              </p>
                              <p className={`text-[10px] truncate mt-0.5 ${isSidebar ? 'text-slate-400' : 'text-zinc-500'}`}>
                                {user.bio || `${user.followers_count} abonnés`}
                              </p>
                            </div>
                            {user.is_following && (
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 border ${
                                isSidebar
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  : 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40'
                              }`}>
                                Suivi
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Posts Section */}
                  {results.posts.length > 0 && (
                    <div className="p-3 space-y-1">
                      <p className={`text-[10px] font-bold uppercase tracking-wider px-2 pb-1 ${
                        isSidebar ? 'text-slate-400' : 'text-zinc-500'
                      }`}>
                        Publications
                      </p>
                      {results.posts.map((post) => {
                        const idx = flatIdx++;
                        const isActive = activeIndex === idx;
                        return (
                          <Link
                            key={post.id}
                            href={`/search?q=${encodeURIComponent(query)}&tab=posts`}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-155 group border ${
                              isActive
                                ? isSidebar
                                  ? 'bg-blue-50/50 border-blue-500/10'
                                  : 'bg-violet-600/15 border-violet-500/20'
                                : isSidebar
                                  ? 'border-transparent hover:bg-slate-50'
                                  : 'border-transparent hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 border ${
                              isSidebar
                                ? 'bg-slate-50 border-slate-200'
                                : 'bg-zinc-900 border-zinc-800'
                            }`}>
                              <FileText className={`h-3.5 w-3.5 ${isSidebar ? 'text-slate-400' : 'text-zinc-550'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-semibold truncate transition-colors ${
                                isActive
                                  ? isSidebar
                                    ? 'text-blue-600'
                                    : 'text-violet-300'
                                  : isSidebar
                                    ? 'text-slate-700 group-hover:text-slate-900'
                                    : 'text-zinc-300 group-hover:text-zinc-100'
                              }`}>
                                {highlightMatch(
                                  post.content.length > 60 ? post.content.slice(0, 60) + '…' : post.content,
                                  query,
                                  isSidebar ? 'bg-blue-500/10 text-blue-600' : 'bg-violet-500/25 text-violet-300'
                                )}
                              </p>
                              <p className={`text-[10px] truncate mt-0.5 ${isSidebar ? 'text-slate-400' : 'text-zinc-500'}`}>
                                par {post.author_name}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Hashtags Section */}
                  {results.hashtags.length > 0 && (
                    <div className="p-3 space-y-1">
                      <p className={`text-[10px] font-bold uppercase tracking-wider px-2 pb-1 ${
                        isSidebar ? 'text-slate-400' : 'text-zinc-500'
                      }`}>
                        Hashtags
                      </p>
                      {results.hashtags.map((post) => {
                        const idx = flatIdx++;
                        const isActive = activeIndex === idx;
                        const hashtagMatch = post.content.match(/#\w+/g)?.[0] || '#' + query;
                        return (
                          <Link
                            key={post.id}
                            href={`/search?q=${encodeURIComponent(hashtagMatch)}&tab=hashtags`}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-155 group border ${
                              isActive
                                ? isSidebar
                                  ? 'bg-blue-50/50 border-blue-500/10'
                                  : 'bg-violet-600/15 border-violet-500/20'
                                : isSidebar
                                  ? 'border-transparent hover:bg-slate-50'
                                  : 'border-transparent hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 border ${
                              isSidebar
                                ? 'bg-blue-50 border-blue-100'
                                : 'bg-violet-900/30 border-violet-850/30'
                            }`}>
                              <Hash className={`h-3.5 w-3.5 ${isSidebar ? 'text-blue-500' : 'text-violet-400'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold truncate transition-colors ${
                                isActive
                                  ? isSidebar
                                    ? 'text-blue-600'
                                    : 'text-violet-300'
                                  : isSidebar
                                    ? 'text-blue-600 group-hover:text-blue-700'
                                    : 'text-violet-450 group-hover:text-violet-300'
                              }`}>
                                {hashtagMatch}
                              </p>
                              <p className={`text-[10px] truncate mt-0.5 ${isSidebar ? 'text-slate-400' : 'text-zinc-500'}`}>
                                {post.content.length > 50 ? post.content.slice(0, 50) + '…' : post.content}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Footer: "See all results" link */}
          {query && (hasResults || (!isLoading && results)) && (
            <div className={`border-t p-3 ${isSidebar ? 'border-slate-100' : 'border-zinc-800/60'}`}>
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-colors ${
                  isSidebar
                    ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50/50'
                    : 'text-violet-400 hover:text-violet-300 hover:bg-violet-600/10'
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                Voir tous les résultats pour "{query}"
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
