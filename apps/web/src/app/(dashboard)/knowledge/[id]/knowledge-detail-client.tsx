'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/api-client';

interface KnowledgeContentReferenceDto {
  readonly reference: string;
  readonly mimeType: string | null;
}

interface KnowledgeDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly type: string;
  readonly status: string;
  readonly visibility: string;
  readonly version: number;
  readonly labels: readonly string[];
  readonly contentReferences: readonly KnowledgeContentReferenceDto[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface DocumentDto {
  readonly id: string;
  readonly content: string;
}

export function KnowledgeDetailClient({ id }: { id: string }) {
  const [asset, setAsset] = useState<KnowledgeDto | null>(null);
  const [document, setDocument] = useState<DocumentDto | null>(null);
  const [contentDraft, setContentDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const found = await apiFetch<KnowledgeDto>(`/v1/knowledge/${id}`);
      setAsset(found);
      const contentRef = found.contentReferences[0];
      if (contentRef !== undefined) {
        const doc = await apiFetch<DocumentDto>(`/v1/documents/${contentRef.reference}`);
        setDocument(doc);
        setContentDraft(doc.content);
      } else {
        setDocument(null);
        setContentDraft('');
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to load this asset.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveContent() {
    setIsSavingContent(true);
    setError(null);
    try {
      if (document !== null) {
        await apiFetch(`/v1/documents/${document.id}/content`, {
          method: 'PUT',
          body: { content: contentDraft, encoding: 'utf-8' },
        });
      } else {
        const { documentId } = await apiFetch<{ documentId: string }>('/v1/documents', {
          method: 'POST',
          body: { content: contentDraft, mimeType: 'text/plain', encoding: 'utf-8' },
        });
        await apiFetch(`/v1/knowledge/${id}/content`, {
          method: 'POST',
          body: { reference: documentId, mimeType: 'text/plain' },
        });
      }
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to save content.');
    } finally {
      setIsSavingContent(false);
    }
  }

  async function transition(action: 'publish' | 'archive') {
    setIsMutating(true);
    setError(null);
    try {
      await apiFetch(`/v1/knowledge/${id}/${action}`, { method: 'POST' });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : `Failed to ${action} this asset.`);
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  if (asset === null) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Not found.'}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">{asset.title}</h1>
      <p className="mt-1 font-mono text-xs text-neutral-500">{asset.id}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-neutral-500">Status</dt>
          <dd>{asset.status}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Type</dt>
          <dd>{asset.type}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Visibility</dt>
          <dd>{asset.visibility}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Version</dt>
          <dd>{asset.version}</dd>
        </div>
      </dl>

      {asset.description.length > 0 && <p className="mt-4 text-sm">{asset.description}</p>}

      <div className="mt-6">
        <label className="flex flex-col gap-1 text-sm">
          Content
          <textarea
            className="min-h-64 rounded border border-neutral-300 px-3 py-2 font-mono text-sm dark:border-neutral-700"
            value={contentDraft}
            onChange={(event) => setContentDraft(event.target.value)}
            placeholder="No content yet — write something and save."
          />
        </label>
        <button
          type="button"
          disabled={isSavingContent}
          onClick={() => void saveContent()}
          className="mt-2 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isSavingContent ? 'Saving…' : 'Save content'}
        </button>
      </div>

      {error !== null && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          disabled={isMutating}
          onClick={() => void transition('publish')}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Publish
        </button>
        <button
          type="button"
          disabled={isMutating}
          onClick={() => void transition('archive')}
          className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
        >
          Archive
        </button>
      </div>
    </div>
  );
}
