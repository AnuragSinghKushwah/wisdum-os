'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';

interface ContentDraftDto {
  readonly id: string;
  readonly opportunityId: string;
  readonly title: string;
  readonly status: string;
  readonly updatedAt: string;
}

export default function DraftsPage() {
  const [items, setItems] = useState<readonly ContentDraftDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await apiFetch<readonly ContentDraftDto[]>('/v1/drafts'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load drafts.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Content Drafts</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
          Review, refine, and preview your dynamically generated content drafts prior to publication.
        </p>
      </div>

      {error !== null && (
        <div className="rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 p-4 text-sm font-medium text-rose-700 dark:text-rose-455 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Drafts Grid List */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4">Pending Drafts</h2>

        {isLoading ? (
          <p className="text-xs text-neutral-400">Loading active database...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">
            No drafts generated yet. Return to the dashboard Opportunity Feed to create content drafts from recommendations.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900/60">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 transition-colors">
                    <td className="py-3.5 pr-4 font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                      <Link href={`/drafts/${item.id}`} className="hover:text-amber-600 dark:hover:text-amber-400 underline transition-colors">
                        {item.title}
                      </Link>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-450 border border-amber-500/20">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-neutral-500 dark:text-neutral-400 font-mono text-sm">
                      {new Date(item.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
