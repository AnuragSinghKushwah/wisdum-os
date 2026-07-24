'use client';

import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';

interface PublishedContentDto {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly viewCount: number;
  readonly publishedAt: string;
  readonly likeCount: number;
  readonly commentCount: number;
  readonly shareCount: number;
  readonly ctr: number;
  readonly readTime: number;
  readonly conversions: number;
}

/** Public, unauthenticated view — the Publishing Engine's output (Product Bible §10-11). */
export function PublishedContentClient({ id }: { id: string }) {
  const [content, setContent] = useState<PublishedContentDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PublishedContentDto>(`/v1/published/${id}`)
      .then(setContent)
      .catch((cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : 'This page could not be found.');
      });
  }, [id]);

  if (error !== null) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </main>
    );
  }

  if (content === null) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-neutral-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{content.title}</h1>
      <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
        Published on {new Date(content.publishedAt).toLocaleDateString()}
      </p>

      {/* Premium Stats Grid */}
      <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-4 border-y border-neutral-100 dark:border-neutral-800 py-4 text-center">
        <div>
          <span className="block text-xl font-bold font-mono text-neutral-800 dark:text-neutral-200">{content.viewCount}</span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">Views</span>
        </div>
        <div>
          <span className="block text-xl font-bold font-mono text-neutral-800 dark:text-neutral-200">{content.likeCount}</span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">Likes</span>
        </div>
        <div>
          <span className="block text-xl font-bold font-mono text-neutral-800 dark:text-neutral-200">{content.commentCount}</span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">Comments</span>
        </div>
        <div>
          <span className="block text-xl font-bold font-mono text-neutral-800 dark:text-neutral-200">{content.shareCount}</span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">Shares</span>
        </div>
        <div>
          <span className="block text-xl font-bold font-mono text-neutral-800 dark:text-neutral-200">{(content.ctr * 100).toFixed(2)}%</span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">CTR</span>
        </div>
        <div>
          <span className="block text-xl font-bold font-mono text-neutral-800 dark:text-neutral-200">
            {Math.floor(content.readTime / 60)}m {content.readTime % 60}s
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">Read Time</span>
        </div>
      </div>

      <pre className="mt-8 whitespace-pre-wrap font-sans text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
        {content.body}
      </pre>
    </main>
  );
}
