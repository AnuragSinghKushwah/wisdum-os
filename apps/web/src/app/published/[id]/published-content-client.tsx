'use client';

import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';

interface PublishedContentDto {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly viewCount: number;
  readonly publishedAt: string;
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

      <p className="mt-4 border-y border-neutral-100 py-3 text-sm text-neutral-500 dark:border-neutral-800">
        {content.viewCount} {content.viewCount === 1 ? 'view' : 'views'}
      </p>

      <pre className="mt-8 whitespace-pre-wrap font-sans text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
        {content.body}
      </pre>
    </main>
  );
}
