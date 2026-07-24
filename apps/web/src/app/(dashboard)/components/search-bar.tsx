'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';

interface SearchResult {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly score: number;
}

export function SearchBar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cmd+K or Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiFetch<readonly SearchResult[]>(`/v1/search?q=${encodeURIComponent(query)}`);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="w-full px-3 mb-4">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 w-full rounded-xl border border-neutral-250 dark:border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 bg-white/40 dark:bg-neutral-900/30 transition-all cursor-pointer hover:shadow-sm"
      >
        <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="flex-1 text-left font-semibold">Search workspace...</span>
        <kbd className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded px-1.5 py-0.5 text-neutral-400">⌘K</kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => { setIsOpen(false); setQuery(''); }}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl overflow-hidden flex flex-col text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
              <svg className="h-4 w-4 text-neutral-400 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Search knowledge, opportunities, drafts..."
                className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none font-medium"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-750 rounded px-1.5 py-0.5 text-neutral-500">esc</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {isSearching ? (
                <p className="text-xs text-neutral-400 px-4 py-6 text-center font-medium">Searching base...</p>
              ) : results.length === 0 && query.trim().length >= 2 ? (
                <p className="text-xs text-neutral-400 px-4 py-6 text-center font-medium">No matches found for "{query}"</p>
              ) : results.length === 0 ? (
                <p className="text-xs text-neutral-400 px-4 py-6 text-center font-medium">Type at least 2 characters to search...</p>
              ) : (
                <div className="space-y-1">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery('');
                        router.push(`/knowledge/${r.id}`);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left cursor-pointer"
                    >
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                        {r.type}
                      </span>
                      <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate flex-1">
                        {r.title}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        score: {Math.round(r.score * 100)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
