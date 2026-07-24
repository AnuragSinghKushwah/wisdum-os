'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api-client';

interface SearchResultDto {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly score: number;
}

interface KnowledgeDto {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly visibility: 'public' | 'private' | 'internal';
  readonly status: 'draft' | 'published' | 'archived';
  readonly description?: string;
  readonly labels: readonly string[];
  readonly contentReference?: string;
  readonly createdAt: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'keyword' | 'semantic' | 'hybrid'>('hybrid');
  const [results, setResults] = useState<readonly SearchResultDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail drawer state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<KnowledgeDto | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Trigger search
  async function performSearch(searchQuery: string, searchMode: string) {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<readonly SearchResultDto[]>(
        `/v1/search?q=${encodeURIComponent(searchQuery)}&mode=${searchMode}`
      );
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search request failed.');
    } finally {
      setIsLoading(false);
    }
  }

  // Load details when an item is selected
  useEffect(() => {
    if (!selectedId) {
      setSelectedItem(null);
      return;
    }
    async function loadDetail() {
      setIsLoadingDetail(true);
      try {
        const data = await apiFetch<KnowledgeDto>(`/v1/knowledge/${selectedId}`);
        setSelectedItem(data);
      } catch (err) {
        console.error('Failed to load knowledge details', err);
      } finally {
        setIsLoadingDetail(false);
      }
    }
    void loadDetail();
  }, [selectedId]);

  // Handle submit action
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void performSearch(query, mode);
  }

  // Auto-trigger search when mode toggles
  function handleModeChange(newMode: 'keyword' | 'semantic' | 'hybrid') {
    setMode(newMode);
    if (query.trim()) {
      void performSearch(query, newMode);
    }
  }

  // Format type icons
  function getTypeIcon(type: string) {
    switch (type.toLowerCase()) {
      case 'concept':
        return '🧠';
      case 'document':
        return '📄';
      case 'conversation':
        return '💬';
      case 'article':
        return '📰';
      case 'blog_post':
        return '✍️';
      case 'webpage':
        return '🌐';
      default:
        return '💡';
    }
  }

  return (
    <div className="relative flex min-h-screen gap-6 max-w-6xl mx-auto">
      {/* Search Console Main Area */}
      <div className="flex-1 space-y-6">
        {/* Header Panel */}
        <div className="border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Cognitive Search</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Query your entire knowledge graph using keyword full-text search, pgvector semantic search, or unified hybrid scoring.
          </p>
        </div>

        {/* Console Search Bar */}
        <form onSubmit={handleSubmit} className="flex gap-2.5">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search concepts, sources, chat exports, or published drafts..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-250 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all shadow-inner"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800/60 pb-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Search Mode
          </span>
          <div className="flex gap-2 bg-neutral-100/70 dark:bg-neutral-900/60 p-1 rounded-xl">
            {(['keyword', 'semantic', 'hybrid'] as const).map((t) => {
              const isActive = mode === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleModeChange(t)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {error !== null && (
          <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-4 text-xs font-medium text-rose-700 dark:text-rose-455">
            ⚠️ {error}
          </div>
        )}

        {/* Results List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl border border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/20 animate-pulse" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 space-y-2">
              <span className="text-3xl block">🔎</span>
              <p className="text-xs font-semibold leading-relaxed">
                {query.trim() ? 'No matching knowledge assets found.' : 'Enter a query in the bar above to search across your workspace.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {results.map((hit) => {
                const scorePercent = Math.round(hit.score * 100);
                const isSelected = selectedId === hit.id;
                return (
                  <div
                    key={hit.id}
                    onClick={() => setSelectedId(hit.id)}
                    className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/5 dark:bg-amber-950/10'
                        : 'border-neutral-200/80 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/30'
                    }`}
                  >
                    <span className="text-2xl p-2 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl">
                      {getTypeIcon(hit.type)}
                    </span>
                    <div className="flex-1 space-y-1 minimum-w-0">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {hit.title}
                      </p>
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                        {hit.type}
                      </p>
                    </div>

                    {/* Match Score Badge */}
                    <div className="text-right shrink-0 space-y-0.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        scorePercent > 80
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : scorePercent > 50
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                      }`}>
                        {scorePercent}% Match
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Detail Drawer Panel */}
      {selectedId !== null && (
        <div className="w-80 shrink-0 border-l border-neutral-200/60 dark:border-neutral-800/60 pl-6 space-y-6 sticky top-6 self-start h-[calc(100vh-6rem)] overflow-y-auto animate-slide-in">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Asset Preview
            </h2>
            <button
              onClick={() => setSelectedId(null)}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-250 cursor-pointer text-sm"
            >
              ✕ Close
            </button>
          </div>

          {isLoadingDetail ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
              <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
              <div className="h-20 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          ) : selectedItem === null ? (
            <p className="text-xs text-neutral-400">Loading preview content...</p>
          ) : (
            <div className="space-y-5">
              {/* Title & Status */}
              <div className="space-y-2">
                <span className="text-3xl block">
                  {getTypeIcon(selectedItem.type)}
                </span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug">
                  {selectedItem.title}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-200 dark:border-neutral-750">
                    {selectedItem.status}
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    {selectedItem.visibility}
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Description
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-350 leading-relaxed bg-white/40 dark:bg-neutral-900/30 p-3 rounded-xl border border-neutral-200/50 dark:border-neutral-800/40">
                    {selectedItem.description}
                  </p>
                </div>
              )}

              {/* Labels/Tags */}
              {selectedItem.labels.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Labels
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedItem.labels.map((lbl) => (
                      <span
                        key={lbl}
                        className="text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg px-2 py-0.5"
                      >
                        #{lbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/60 text-[10px] space-y-1 text-neutral-450">
                <p>
                  <span className="font-semibold text-neutral-500">Asset ID:</span>{' '}
                  <span className="font-mono">{selectedItem.id}</span>
                </p>
                {selectedItem.contentReference && (
                  <p>
                    <span className="font-semibold text-neutral-500">Content Ref:</span>{' '}
                    <span className="font-mono">{selectedItem.contentReference}</span>
                  </p>
                )}
                <p>
                  <span className="font-semibold text-neutral-500">Captured:</span>{' '}
                  {new Date(selectedItem.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
