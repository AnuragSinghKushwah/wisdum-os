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
      <h1 className="text-3xl font-semibold">{content.title}</h1>
      <p className="mt-2 text-xs text-neutral-500">
        Published {new Date(content.publishedAt).toLocaleDateString()} · {content.viewCount} view
        {content.viewCount === 1 ? '' : 's'}
      </p>
      <pre className="mt-6 whitespace-pre-wrap font-sans text-base leading-relaxed">
        {content.body}
      </pre>
    </main>
  );
}
