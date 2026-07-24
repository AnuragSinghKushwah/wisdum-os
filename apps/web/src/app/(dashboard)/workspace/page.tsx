'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceDto[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDto | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load workspaces for this tenant
  const load = useCallback(async () => {
    if (session === null) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all workspaces linked to this tenant
      const result = await apiFetch<readonly WorkspaceDto[]>('/v1/workspaces').catch(() => [] as readonly WorkspaceDto[]);
      setWorkspaces(result);
      if (result.length > 0) {
        setActiveWorkspace(result[0]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load workspace.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRenameWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeWorkspace === null) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/v1/workspaces/${activeWorkspace.id}`, {
        method: 'PUT',
        body: { name },
      });
      setName('');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to rename workspace.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Workspace</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
            Manage your collaborative spaces, team members, and resource constraints.
          </p>
        </div>
      </div>

      {error !== null && (
        <div className="rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 p-4 text-sm font-medium text-rose-700 dark:text-rose-455 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Active Workspace Info */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4">Active Workspace Context</h2>

        {isLoading ? (
          <p className="text-xs text-neutral-400">Loading workspace context...</p>
        ) : activeWorkspace === null ? (
          <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">No active workspace detected for this session.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Name</span>
              <p className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{activeWorkspace.name}</p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Slug</span>
              <p className="mt-1 text-xs font-mono text-neutral-800 dark:text-neutral-200 break-all">{activeWorkspace.slug}</p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Status</span>
              <p className="mt-1 text-xs font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold">{activeWorkspace.status}</p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Members count</span>
              <p className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{activeWorkspace.memberCount} members</p>
            </div>
          </div>
        )}
      </div>

      {activeWorkspace !== null && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rename Form */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4">Rename Workspace</h3>
            <form onSubmit={handleRenameWorkspace} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                New Name
                <input
                  className="rounded-xl border border-neutral-250/70 dark:border-neutral-800 px-3 py-2 bg-transparent text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={activeWorkspace.name}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="self-end rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {isSubmitting ? 'Renaming…' : 'Rename'}
              </button>
            </form>
          </div>

          {/* Members / Invites */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Workspace Members</h3>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-900/60 max-h-[150px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between py-2 text-xs font-semibold">
                <span className="text-neutral-700 dark:text-neutral-300">Default Administrator</span>
                <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider text-[9px] font-bold">Owner</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
