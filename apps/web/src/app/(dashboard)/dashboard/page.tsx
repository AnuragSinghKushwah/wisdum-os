'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

interface OpportunityDto {
  readonly id: string;
  readonly title: string;
  readonly rationale: string;
  readonly type: string;
  readonly status: string;
  readonly createdAt: string;
  readonly sourceKnowledgeIds?: readonly string[];
  readonly sourceKnowledgeTitles?: readonly string[];
  readonly confidenceScore?: number;
}

interface ContentDraftDto {
  readonly id: string;
  readonly opportunityId: string;
}

interface ReasoningResultDto {
  readonly conceptsFound: number;
  readonly insightsCreated: number;
  readonly opportunitiesCreated: number;
}

interface DashboardStats {
  readonly knowledgeCount: number;
  readonly opportunityCount: number;
  readonly draftCount: number;
  readonly publishedCount: number;
}

type TabType = 'all' | 'proposed' | 'drafted' | 'published';

// Color map for opportunity types to render premium badges
const TYPE_COLORS: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  blog_post: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/30', label: 'Blog Post', icon: '✍️' },
  linkedin_post: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/30', label: 'LinkedIn Post', icon: '💼' },
  newsletter: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-300 border-cyan-200/50 dark:border-cyan-800/30', label: 'Newsletter', icon: '📧' },
  youtube_script: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300 border-red-200/50 dark:border-red-800/30', label: 'YouTube Script', icon: '🎥' },
  course_module: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/30', label: 'Course Module', icon: '🎓' },
  book_chapter: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-800/30', label: 'Book Chapter', icon: '📖' },
  architecture_document: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-300 border-teal-200/50 dark:border-teal-800/30', label: 'Architecture Doc', icon: '🏗️' },
  research_paper: { bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-300 border-rose-200/50 dark:border-rose-800/30', label: 'Research Paper', icon: '🔬' },
  podcast_outline: { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300 border-violet-200/50 dark:border-violet-800/30', label: 'Podcast Outline', icon: '🎙️' },
  trading_report: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300 border-green-200/50 dark:border-green-800/30', label: 'Trading Report', icon: '📊' },
  internal_documentation: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/30', label: 'Internal Docs', icon: '📂' },
  product_specification: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-300 border-orange-200/50 dark:border-orange-800/30', label: 'Product Spec', icon: '📋' },
  marketing_campaign: { bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-700 dark:text-pink-300 border-pink-200/50 dark:border-pink-800/30', label: 'Marketing Campaign', icon: '📣' },
  sales_content: { bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-700 dark:text-sky-300 border-sky-200/50 dark:border-sky-800/30', label: 'Sales Content', icon: '💰' },
};

export default function DashboardPage() {
  const router = useRouter();

  const [opportunities, setOpportunities] = useState<readonly OpportunityDto[]>([]);
  const [draftMap, setDraftMap] = useState<Record<string, string>>({}); // opportunityId -> draftId
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningReasoning, setIsRunningReasoning] = useState(false);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasoningResult, setReasoningResult] = useState<ReasoningResultDto | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Suggest Content Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState('youtube_script');
  const [modalRationale, setModalRationale] = useState('');
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [modalValidationError, setModalValidationError] = useState<string | null>(null);

  async function handleCreateOpportunityManual() {
    if (!modalTitle.trim() || !modalRationale.trim()) {
      setModalValidationError('Please fill in both Title and Rationale.');
      return;
    }
    setModalValidationError(null);
    setIsSubmittingModal(true);
    setError(null);
    try {
      await apiFetch('/v1/opportunities', {
        method: 'POST',
        body: {
          title: modalTitle,
          type: modalType,
          rationale: modalRationale,
        },
      });
      setModalTitle('');
      setModalRationale('');
      setIsModalOpen(false);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to suggest content.');
    } finally {
      setIsSubmittingModal(false);
    }
  }

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Parallel fetch for opportunities, existing drafts and dashboard stats
      const [opps, drafts, fetchedStats] = await Promise.all([
        apiFetch<readonly OpportunityDto[]>('/v1/opportunities'),
        apiFetch<readonly ContentDraftDto[]>('/v1/drafts').catch(() => [] as readonly ContentDraftDto[]),
        apiFetch<DashboardStats>('/v1/dashboard/stats').catch(() => null),
      ]);

      setStats(fetchedStats);

      // Sort opportunities by confidenceScore (descending, highest first)
      const sortedOpps = [...opps].sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0));
      setOpportunities(sortedOpps);
      
      const mapping: Record<string, string> = {};
      for (const draft of drafts) {
        mapping[draft.opportunityId] = draft.id;
      }
      setDraftMap(mapping);

      // ✨ Auto-trigger reasoning scan if opportunities are empty
      if (opps.length === 0) {
        setIsRunningReasoning(true);
        try {
          const result = await apiFetch<ReasoningResultDto>('/v1/reasoning/run', { method: 'POST' });
          setReasoningResult(result);
          
          // Refetch fresh opportunities and stats after auto reasoning pass
          const [freshOpps, freshStats] = await Promise.all([
            apiFetch<readonly OpportunityDto[]>('/v1/opportunities'),
            apiFetch<DashboardStats>('/v1/dashboard/stats').catch(() => null),
          ]);
          setStats(freshStats);
          const sortedFresh = [...freshOpps].sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0));
          setOpportunities(sortedFresh);
        } catch {
          // Silent fail to not block normal dashboard load
        } finally {
          setIsRunningReasoning(false);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load Opportunity Feed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleRunReasoning() {
    setIsRunningReasoning(true);
    setError(null);
    setReasoningResult(null);
    try {
      const result = await apiFetch<ReasoningResultDto>('/v1/reasoning/run', { method: 'POST' });
      setReasoningResult(result);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to run reasoning pass.');
    } finally {
      setIsRunningReasoning(false);
    }
  }

  async function handleCreateDraft(opportunityId: string) {
    setDraftingId(opportunityId);
    setError(null);
    try {
      const { draftId } = await apiFetch<{ draftId: string }>(`/v1/opportunities/${opportunityId}/draft`, {
        method: 'POST',
      });
      router.push(`/drafts/${draftId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to create content draft.');
      setDraftingId(null);
    }
  }

  const filteredOpportunities = opportunities.filter((item) => {
    if (activeTab === 'all') return true;
    return item.status === activeTab;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            Opportunity Feed
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
            Continuous background analysis of your knowledge base. Transform raw insights and datasets into structured assets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-750 px-5 py-2.5 text-sm font-semibold text-neutral-850 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all cursor-pointer hover:-translate-y-0.5 shadow-sm bg-white dark:bg-neutral-900"
          >
            <span>💡</span>
            <span>Suggest Content</span>
          </button>

          <button
            type="button"
            disabled={isRunningReasoning}
            onClick={() => void handleRunReasoning()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:opacity-50 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            {isRunningReasoning ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Scanning Base…
              </>
            ) : (
              <>
                <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Scan & Reason
              </>
            )}
          </button>
        </div>
      </div>

      {stats !== null && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Knowledge Assets', value: stats.knowledgeCount, icon: '🧠', href: '/knowledge' },
            { label: 'Opportunities', value: stats.opportunityCount, icon: '💡', href: '/opportunities' },
            { label: 'Drafts', value: stats.draftCount, icon: '📝', href: '/drafts' },
            { label: 'Published', value: stats.publishedCount, icon: '✅', href: '/published' },
          ].map(stat => (
            <a key={stat.label} href={stat.href}
              className="flex flex-col gap-1 rounded-2xl border border-neutral-200/85 bg-white/50 dark:border-neutral-800 bg-white/40 dark:bg-neutral-950/20 p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <span className="text-lg">{stat.icon}</span>
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">{stat.value}</span>
              <span className="text-xs font-semibold text-neutral-400">{stat.label}</span>
            </a>
          ))}
        </div>
      )}

      {/* Results banner */}
      {reasoningResult !== null && (
        <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/20 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in shadow-sm shadow-emerald-500/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Reasoning Pass Completed</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Identified {reasoningResult.conceptsFound} concept nodes and registered {reasoningResult.insightsCreated} knowledge insights.
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/20">
            +{reasoningResult.opportunitiesCreated} Opportunities Discovered
          </div>
        </div>
      )}

      {error !== null && (
        <div className="rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 p-4 text-sm font-medium text-rose-700 dark:text-rose-450 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Feed Filters */}
      <div className="flex items-center border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
        <nav className="flex space-x-2" aria-label="Tabs">
          {(['all', 'proposed', 'drafted', 'published'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-1.5 px-4 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-neutral-100 dark:border-neutral-100 dark:text-neutral-950 shadow-sm'
                    : 'border-neutral-200/70 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 bg-transparent hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Opportunities Feed Container */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse border border-neutral-200/70 dark:border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/4"></div>
              <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4"></div>
              <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-5/6"></div>
            </div>
          ))}
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white/40 dark:bg-neutral-950/20">
          <span className="text-4xl">💡</span>
          <h3 className="mt-4 text-base font-bold text-neutral-950 dark:text-white">No opportunities found</h3>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
            {activeTab === 'all'
              ? 'Wisdum needs source material. Add references, articles, or repository content in the Knowledge tab, then run a Scan to discover opportunities.'
              : `No opportunities are currently matching the "${activeTab}" status.`}
          </p>
          {activeTab === 'all' && (
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/knowledge"
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors shadow-sm"
              >
                Go to Knowledge
              </Link>
              <button
                onClick={() => void handleRunReasoning()}
                disabled={isRunningReasoning}
                className="rounded-xl border border-neutral-250 dark:border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                Scan Base
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredOpportunities.map((item) => {
            const config = TYPE_COLORS[item.type] || {
              bg: 'bg-neutral-50 dark:bg-neutral-950/30',
              text: 'text-neutral-700 dark:text-neutral-300 border-neutral-200/50 dark:border-neutral-800/30',
              label: item.type.replace(/_/g, ' '),
              icon: '📄',
            };

            const isProposed = item.status === 'proposed';
            const isDrafted = item.status === 'drafted';
            const isPublished = item.status === 'published';
            const draftId = draftMap[item.id];

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white/50 dark:bg-neutral-900/30 backdrop-blur-sm p-6 shadow-sm hover:shadow-md hover:border-neutral-300/80 dark:border-neutral-800/80 hover:dark:border-neutral-750 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="space-y-4">
                  {/* Badge Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold border uppercase tracking-wider ${config.bg} ${config.text}`}>
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </span>
                      {isProposed && (
                        <span className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          item.confidenceScore !== undefined
                            ? item.confidenceScore >= 0.8
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                              : item.confidenceScore >= 0.5
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-750'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {item.confidenceScore !== undefined
                            ? item.confidenceScore >= 0.8
                              ? '🔥 High'
                              : item.confidenceScore >= 0.5
                              ? '💡 Medium'
                              : '🌱 Low'
                            : '🔥 High'}{' '}
                          Confidence
                          {item.confidenceScore !== undefined && (
                            <span className="ml-1 text-[9px] font-mono opacity-60">
                              {Math.round(item.confidenceScore * 100)}%
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-neutral-400">
                      {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold leading-snug text-neutral-900 dark:text-white group-hover:text-neutral-950 dark:group-hover:text-white transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                      <span className="font-bold text-neutral-800 dark:text-neutral-200">Why this works:</span> {item.rationale}
                    </p>

                    {/* Source Knowledge Attribution */}
                    {item.sourceKnowledgeTitles && item.sourceKnowledgeTitles.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-neutral-100/50 dark:border-neutral-900/30">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">From:</span>
                        {item.sourceKnowledgeTitles.slice(0, 3).map((title, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800/80">
                            📎 {title}
                          </span>
                        ))}
                        {item.sourceKnowledgeTitles.length > 3 && (
                          <span className="text-[10px] text-neutral-400">+{item.sourceKnowledgeTitles.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Footer */}
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 dark:border-neutral-800/70 pt-4 gap-4">
                  <div className="text-xs font-mono text-neutral-400">
                    ID: {item.id.slice(0, 8)}…
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isProposed && (
                      <button
                        type="button"
                        disabled={draftingId !== null}
                        onClick={() => void handleCreateDraft(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 px-4 py-2 text-xs font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer hover:-translate-y-0.5"
                      >
                        {draftingId === item.id ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Drafting…
                          </>
                        ) : (
                          <>
                            <span>✨</span>
                            <span>Draft Content</span>
                          </>
                        )}
                      </button>
                    )}

                    {isDrafted && draftId && (
                      <Link
                        href={`/drafts/${draftId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900/50 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-all shadow-sm hover:border-neutral-350 dark:hover:border-neutral-700"
                      >
                        <span>📝</span>
                        <span>Edit Draft</span>
                      </Link>
                    )}

                    {isPublished && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <span>✅</span>
                        <span>Published</span>
                      </span>
                    )}

                    <Link
                      href={`/opportunities/${item.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 bg-white/40 dark:bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all hover:border-neutral-350 dark:hover:border-neutral-700"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Suggest Content Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950/95 animate-fade-in flex flex-col gap-4 text-left">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">💡 Propose Content Idea</h3>
                <p className="text-xs text-neutral-500 mt-1">Directly suggest a content outline opportunity into your active engine feed.</p>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setModalValidationError(null); }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-2">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Title
                <input
                  type="text"
                  placeholder="e.g. Scaling PostgreSQL with Vector Indexing"
                  className="rounded-xl border border-neutral-350 dark:border-neutral-750 bg-transparent px-3.5 py-2 text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Content Format / Type
                <select
                  className="rounded-xl border border-neutral-350 dark:border-neutral-750 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-850 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={modalType}
                  onChange={(e) => setModalType(e.target.value)}
                >
                  <option value="youtube_script">🎥 YouTube Video Script</option>
                  <option value="podcast_outline">🎙️ Podcast Outline</option>
                  <option value="blog_post">✍️ Blog Post</option>
                  <option value="newsletter">📧 Newsletter</option>
                  <option value="linkedin_post">💼 LinkedIn Slide Post</option>
                  <option value="marketing_campaign">📣 Marketing Campaign</option>
                  <option value="architecture_document">🏗️ Architecture Document</option>
                  <option value="course_module">🎓 Educational Course Module</option>
                  <option value="sales_content">💰 Sales Marketing Content</option>
                  <option value="book_chapter">📖 Book Chapter</option>
                  <option value="research_paper">🔬 Research Paper</option>
                  <option value="trading_report">📊 Trading Report</option>
                  <option value="internal_documentation">📂 Internal Documentation</option>
                  <option value="product_specification">📋 Product Specification</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Why this works (Rationale)
                <textarea
                  placeholder="e.g. Ingested notes show Postgres is a recurring concept mention under database operations. This video details how to shard vectors cleanly."
                  className="rounded-xl border border-neutral-350 dark:border-neutral-750 bg-transparent px-3.5 py-2 text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 min-h-24 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
                  value={modalRationale}
                  onChange={(e) => setModalRationale(e.target.value)}
                />
              </label>
            </div>

            {modalValidationError && (
              <div className="rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 p-3 text-xs font-medium text-rose-700 dark:text-rose-455">
                ⚠️ {modalValidationError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setModalValidationError(null); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-250 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingModal || modalValidationError !== null}
                onClick={() => void handleCreateOpportunityManual()}
                className="px-4.5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isSubmittingModal ? 'Adding...' : 'Add Suggestion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
