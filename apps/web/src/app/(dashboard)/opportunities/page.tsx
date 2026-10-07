'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

interface OpportunityDto {
  readonly id: string;
  readonly title: string;
  readonly rationale: string;
  readonly type: string;
  readonly status: string;
  readonly createdAt: string;
}

interface ReasoningResultDto {
  readonly conceptsFound: number;
  readonly insightsCreated: number;
  readonly opportunitiesCreated: number;
}

export default function OpportunitiesPage() {
  const [items, setItems] = useState<readonly OpportunityDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ReasoningResultDto | null>(null);

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
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to suggest content.');
    } finally {
      setIsSubmittingModal(false);
    }
  }

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFetch<readonly OpportunityDto[]>('/v1/opportunities');
      setItems(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load opportunities.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRunReasoning() {
    setIsRunning(true);
    setError(null);
    try {
      const result = await apiFetch<ReasoningResultDto>('/v1/reasoning/run', { method: 'POST' });
      setLastResult(result);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to run reasoning pass.');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Opportunities</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
            Discover concrete content drafts that Wisdum recommends creating next based on your captured knowledge concepts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-750 px-5 py-2.5 text-xs font-semibold text-neutral-850 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all cursor-pointer hover:-translate-y-0.5 shadow-sm bg-white dark:bg-neutral-900"
          >
            <span>💡</span>
            <span>Suggest Content</span>
          </button>

          <button
            type="button"
            disabled={isRunning}
          onClick={() => void handleRunReasoning()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
        >
          {isRunning ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Reasoning…
            </>
          ) : (
            'Generate opportunities'
          )}
        </button>
      </div>
    </div>

      {lastResult !== null && (
        <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/20 p-4 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          🧠 Scan Complete: Discovered {lastResult.conceptsFound} concepts, registered {lastResult.insightsCreated} insights, and proposed {lastResult.opportunitiesCreated} content opportunities.
        </div>
      )}

      {error !== null && (
        <div className="rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 p-4 text-sm font-medium text-rose-700 dark:text-rose-455 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Product Bible §13 Categorized Opportunity Feed */}
      {isLoading ? (
        <p className="text-xs text-neutral-400">Loading active feed...</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-8 text-center">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No opportunities proposed yet.</p>
          <p className="text-xs text-neutral-500 leading-relaxed mt-1 max-w-md mx-auto">
            Ingest raw notes, repository commits, or links inside the Knowledge tab, then click &quot;Generate opportunities&quot; to populate your Product Bible §13 feed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: High Confidence / Active Opportunities */}
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-6 dark:border-amber-500/10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🔥</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                High Confidence Opportunities
              </h2>
            </div>
            <OpportunityCategoryTable items={items.slice(0, 3)} />
          </div>

          {/* Section 2: Social & Publishing Opportunities */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📝</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Social & Publishing Content Opportunities
              </h2>
            </div>
            <OpportunityCategoryTable
              items={items.filter((i) =>
                ['blog_post', 'linkedin_post', 'newsletter', 'marketing_campaign', 'sales_content'].includes(i.type),
              )}
            />
          </div>

          {/* Section 3: Engineering & Repository Opportunities */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🛠️</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Engineering & Architecture Opportunities
              </h2>
            </div>
            <OpportunityCategoryTable
              items={items.filter((i) =>
                ['architecture_document', 'internal_documentation', 'product_specification'].includes(i.type),
              )}
            />
          </div>

          {/* Section 4: Education, Media & Research Opportunities */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📚</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Education, Media & Research Opportunities
              </h2>
            </div>
            <OpportunityCategoryTable
              items={items.filter((i) =>
                ['youtube_script', 'podcast_outline', 'course_module', 'book_chapter', 'research_paper', 'trading_report'].includes(i.type),
              )}
            />
          </div>
        </div>
      )}
      {/* Suggest Content Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950/95 animate-fade-in flex flex-col gap-4 text-left">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">💡 Propose Content Idea</h3>
                <p className="text-xs text-neutral-500 mt-1">Directly suggest a content outline opportunity into your active feed.</p>
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

function OpportunityCategoryTable({ items }: { readonly items: readonly OpportunityDto[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-neutral-400 italic">No opportunities in this category yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-neutral-200/80 dark:border-neutral-800/80 text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
            <th className="pb-2.5 font-semibold">Title</th>
            <th className="pb-2.5 font-semibold">Format</th>
            <th className="pb-2.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900/60">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 transition-colors">
              <td className="py-3 pr-4 font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                <Link
                  href={`/opportunities/${item.id}`}
                  className="hover:text-amber-600 dark:hover:text-amber-400 underline transition-colors"
                >
                  {item.title}
                </Link>
              </td>
              <td className="py-3 text-neutral-500 dark:text-neutral-400 font-mono capitalize text-xs">
                {item.type.replace(/_/g, ' ')}
              </td>
              <td className="py-3">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-750">
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
