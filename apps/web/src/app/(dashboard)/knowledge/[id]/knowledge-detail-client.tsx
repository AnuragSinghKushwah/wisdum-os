'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { CONTENT_PLATFORMS } from '../../../../lib/content-formats';

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

interface PlatformResult {
  readonly platform: string;
  readonly opportunityId: string;
  readonly draftId?: string;
  readonly error?: string;
}

export function KnowledgeDetailClient({ id }: { id: string }) {
  const [asset, setAsset] = useState<KnowledgeDto | null>(null);
  const [document, setDocument] = useState<DocumentDto | null>(null);
  const [contentDraft, setContentDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [platforms, setPlatforms] = useState<ReadonlySet<string>>(new Set(['linkedin_post']));
  const [instructions, setInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [results, setResults] = useState<readonly PlatformResult[] | null>(null);

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

  function togglePlatform(value: string) {
    setPlatforms((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function generate() {
    setIsGenerating(true);
    setGenerateError(null);
    setResults(null);
    try {
      const response = await apiFetch<{ results: readonly PlatformResult[] }>(
        `/v1/knowledge/${id}/generate`,
        {
          method: 'POST',
          body: {
            platforms: [...platforms],
            ...(instructions.trim().length > 0 ? { instructions: instructions.trim() } : {}),
          },
        },
      );
      setResults(response.results);
    } catch (cause) {
      setGenerateError(cause instanceof ApiError ? cause.message : 'Failed to create content.');
    } finally {
      setIsGenerating(false);
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

  const hasContent = document !== null && document.content.trim().length > 0;
  const hasUnsavedChanges = document !== null && contentDraft !== document.content;

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

      <section className="mt-8 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">Create content from this source</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Wisdum writes one draft per platform from the text above, and only from it.
        </p>

        <fieldset className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <legend className="sr-only">Platforms</legend>
          {CONTENT_PLATFORMS.map((platform) => (
            <label
              key={platform.value}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={platforms.has(platform.value)}
                onChange={() => togglePlatform(platform.value)}
              />
              <span>
                <span className="font-medium">{platform.label}</span>
                <span className="block text-xs text-neutral-500">{platform.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="mt-4 flex flex-col gap-1 text-sm">
          Angle or audience (optional)
          <input
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
            value={instructions}
            maxLength={2000}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="e.g. aimed at engineering leads, practical and a little blunt"
          />
        </label>

        {hasUnsavedChanges && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            You have unsaved changes to the content. Save them first so the drafts use the latest
            text.
          </p>
        )}
        {!hasContent && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            Add some content above and save it before creating drafts.
          </p>
        )}

        <button
          type="button"
          disabled={isGenerating || platforms.size === 0 || !hasContent || hasUnsavedChanges}
          onClick={() => void generate()}
          className="mt-4 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isGenerating
            ? 'Writing drafts…'
            : `Create ${platforms.size} draft${platforms.size === 1 ? '' : 's'}`}
        </button>

        {generateError !== null && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {generateError}
          </p>
        )}

        {results !== null && (
          <ul className="mt-4 flex flex-col gap-2" aria-label="Created drafts">
            {results.map((result) => {
              const label =
                CONTENT_PLATFORMS.find((platform) => platform.value === result.platform)?.label ??
                result.platform;
              return (
                <li
                  key={result.opportunityId}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
                >
                  <span className="font-medium">{label}</span>
                  {result.draftId !== undefined ? (
                    <Link href={`/drafts/${result.draftId}`} className="font-semibold underline">
                      Open draft
                    </Link>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">
                      Failed: {result.error ?? 'unknown error'} —{' '}
                      <Link href={`/opportunities/${result.opportunityId}`} className="underline">
                        retry from the opportunity
                      </Link>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
