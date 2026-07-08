'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';

interface KnowledgeDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: string;
  readonly type: string;
  readonly visibility: string;
  readonly updatedAt: string;
}

const KNOWLEDGE_TYPES = [
  'note',
  'document',
  'webpage',
  'repository',
  'pdf',
  'markdown',
  'image',
  'video',
  'audio',
  'dataset',
  'conversation',
] as const;

const VISIBILITIES = ['private', 'workspace', 'public'] as const;

export default function KnowledgePage() {
  const [items, setItems] = useState<readonly KnowledgeDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<(typeof KNOWLEDGE_TYPES)[number]>('note');
  const [visibility, setVisibility] = useState<(typeof VISIBILITIES)[number]>('private');
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFetch<readonly KnowledgeDto[]>('/v1/knowledge');
      setItems(result);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to load knowledge assets.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      await apiFetch('/v1/knowledge', {
        method: 'POST',
        body: { title, type, visibility, sourceKind: 'manual' },
      });
      setTitle('');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to create knowledge asset.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Knowledge</h1>

      <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
            value={type}
            onChange={(event) => setType(event.target.value as (typeof KNOWLEDGE_TYPES)[number])}
          >
            {KNOWLEDGE_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Visibility
          <select
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as (typeof VISIBILITIES)[number])}
          >
            {VISIBILITIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={isCreating}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isCreating ? 'Creating…' : 'Create'}
        </button>
      </form>

      {error !== null && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-500">No knowledge assets yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 font-medium">Title</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Visibility</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100 dark:border-neutral-900">
                  <td className="py-2">
                    <Link href={`/knowledge/${item.id}`} className="underline">
                      {item.title}
                    </Link>
                  </td>
                  <td className="py-2">{item.type}</td>
                  <td className="py-2">{item.status}</td>
                  <td className="py-2">{item.visibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
