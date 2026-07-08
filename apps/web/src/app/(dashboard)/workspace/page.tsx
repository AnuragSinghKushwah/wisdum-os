'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';

interface WorkspaceDto {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly memberCount: number;
  readonly createdAt: string;
}

export default function WorkspacePage() {
  const { session } = useAuth();
  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [workspace, setWorkspace] = useState<WorkspaceDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (session === null) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await apiFetch<{ workspaceId: string }>('/v1/workspaces', {
        method: 'POST',
        body: { organizationId, name, createdBy: session.userId },
      });
      setWorkspace(await apiFetch<WorkspaceDto>(`/v1/workspaces/${result.workspaceId}`));
      setName('');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to create workspace.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      setWorkspace(await apiFetch<WorkspaceDto>(`/v1/workspaces/${lookupId}`));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Workspace not found.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Workspace</h1>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-neutral-500">Create a workspace</h2>
        <p className="mt-1 text-xs text-neutral-500">
          There&apos;s no organization management UI yet — you need the ID of an existing
          organization, created directly in the database.
        </p>
        <form onSubmit={handleCreate} className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Organization ID
            <input
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              placeholder="e.g. af3da7a6-8cd5-4ab6-b217-41d45320a8a8"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Create
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-neutral-500">Look up a workspace</h2>
        <form onSubmit={handleLookup} className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Workspace ID
            <input
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              value={lookupId}
              onChange={(event) => setLookupId(event.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
          >
            Look up
          </button>
        </form>
      </section>

      {error !== null && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {workspace !== null && (
        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-neutral-500">Name</dt>
            <dd>{workspace.name}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Slug</dt>
            <dd>{workspace.slug}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Status</dt>
            <dd>{workspace.status}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Members</dt>
            <dd>{workspace.memberCount}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
