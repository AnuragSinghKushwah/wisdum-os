'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/api-client';

interface ContentDraftDto {
  readonly id: string;
  readonly opportunityId: string;
  readonly title: string;
  readonly body: string;
  readonly status: string;
  readonly updatedAt: string;
}

interface PublishResult {
  readonly publishedId: string;
  readonly slug: string;
}

export function DraftDetailClient({ id }: { id: string }) {
  const [draft, setDraft] = useState<ContentDraftDto | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState<PublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const found = await apiFetch<ContentDraftDto>(`/v1/drafts/${id}`);
      setDraft(found);
      setTitleDraft(found.title);
      setBodyDraft(found.body);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to load this draft.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await apiFetch(`/v1/drafts/${id}`, {
        method: 'PUT',
        body: { title: titleDraft, body: bodyDraft },
      });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to save this draft.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    setIsPublishing(true);
    setError(null);
    try {
      const result = await apiFetch<PublishResult>(`/v1/drafts/${id}/publish`, { method: 'POST' });
      setPublished(result);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to publish this draft.');
    } finally {
      setIsPublishing(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  if (draft === null) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Not found.'}</p>;
  }

  const isPublished = draft.status === 'published';

  return (
    <div>
      <h1 className="text-2xl font-semibold">Draft</h1>
      <p className="mt-1 font-mono text-xs text-neutral-500">{draft.id}</p>

      <label className="mt-4 flex flex-col gap-1 text-sm">
        Title
        <input
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          value={titleDraft}
          onChange={(event) => setTitleDraft(event.target.value)}
          disabled={isPublished}
        />
      </label>

      <label className="mt-4 flex flex-col gap-1 text-sm">
        Body (Markdown)
        <textarea
          className="min-h-96 rounded border border-neutral-300 px-3 py-2 font-mono text-sm dark:border-neutral-700"
          value={bodyDraft}
          onChange={(event) => setBodyDraft(event.target.value)}
          disabled={isPublished}
        />
      </label>

      {error !== null && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {published !== null && (
        <p className="mt-3 text-sm">
          Published:{' '}
          <Link href={`/published/${published.publishedId}`} className="underline" target="_blank">
            /published/{published.publishedId}
          </Link>
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={isSaving || isPublished}
          onClick={() => void handleSave()}
          className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          disabled={isPublishing || isPublished}
          onClick={() => void handlePublish()}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isPublished ? 'Published' : isPublishing ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
