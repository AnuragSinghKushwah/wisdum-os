'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

interface PublishedContentDto {
  readonly id: string;
  readonly opportunityId: string;
  readonly slug: string;
  readonly title: string;
  readonly viewCount: number;
  readonly publishedAt: string;
  readonly likeCount: number;
  readonly commentCount: number;
  readonly shareCount: number;
  readonly ctr: number;
  readonly readTime: number;
  readonly conversions: number;
}

export default function PublishedPage() {
  const [items, setItems] = useState<readonly PublishedContentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await apiFetch<readonly PublishedContentDto[]>('/v1/published'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load published content.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Published Content</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
            Live content and its performance metrics — the Measure step of your knowledge loop.
          </p>
        </div>
      </div>

      {error !== null && (
        <div className="rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 p-4 text-sm font-medium text-rose-700 dark:text-rose-455 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4">Published Assets</h2>

        {isLoading ? (
          <p className="text-xs text-neutral-400">Loading published database...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">
            Nothing published yet. Return to the dashboard Opportunity Feed to create and publish content drafts.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 px-2 text-right font-semibold">Views</th>
                  <th className="pb-3 px-2 text-right font-semibold">Likes</th>
                  <th className="pb-3 px-2 text-right font-semibold">Comments</th>
                  <th className="pb-3 px-2 text-right font-semibold">Shares</th>
                  <th className="pb-3 px-2 text-right font-semibold">CTR</th>
                  <th className="pb-3 px-2 text-right font-semibold">Avg Read Time</th>
                  <th className="pb-3 px-2 text-right font-semibold">Conversions</th>
                  <th className="pb-3 pl-4 text-right font-semibold">Published</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900/60">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 transition-colors">
                    <td className="py-3.5 pr-4 font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                      <Link href={`/published/${item.id}`} className="hover:text-amber-600 dark:hover:text-amber-400 underline transition-colors" target="_blank">
                        {item.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono text-neutral-600 dark:text-neutral-400">{item.viewCount}</td>
                    <td className="py-3.5 px-2 text-right font-mono text-neutral-600 dark:text-neutral-400">{item.likeCount}</td>
                    <td className="py-3.5 px-2 text-right font-mono text-neutral-600 dark:text-neutral-400">{item.commentCount}</td>
                    <td className="py-3.5 px-2 text-right font-mono text-neutral-600 dark:text-neutral-400">{item.shareCount}</td>
                    <td className="py-3.5 px-2 text-right font-mono text-neutral-600 dark:text-neutral-400">{(item.ctr * 100).toFixed(2)}%</td>
                    <td className="py-3.5 px-2 text-right font-mono text-neutral-600 dark:text-neutral-400">{Math.floor(item.readTime / 60)}m {item.readTime % 60}s</td>
                    <td className="py-3.5 px-2 text-right font-mono text-neutral-600 dark:text-neutral-400">{item.conversions}</td>
                    <td className="py-3.5 pl-4 text-right text-xs text-neutral-400 font-mono">
                      {new Date(item.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
