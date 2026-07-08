'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';

interface PluginDto {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly displayName: string;
  readonly status: string;
  readonly capabilities: readonly string[];
  readonly installedAt: string;
}

export default function PluginsPage() {
  const [pluginName, setPluginName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [plugin, setPlugin] = useState<PluginDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleInstall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await apiFetch<{ pluginId: string }>('/v1/plugins', {
        method: 'POST',
        body: { pluginName, version, displayName, description },
      });
      setPlugin(await apiFetch<PluginDto>(`/v1/plugins/${result.pluginId}`));
      setPluginName('');
      setDisplayName('');
      setDescription('');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to install plugin.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      setPlugin(await apiFetch<PluginDto>(`/v1/plugins/${lookupId}`));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Plugin not found.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggle(action: 'enable' | 'disable') {
    if (plugin === null) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/v1/plugins/${plugin.id}/${action}`, { method: 'POST' });
      setPlugin(await apiFetch<PluginDto>(`/v1/plugins/${plugin.id}`));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : `Failed to ${action} plugin.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Plugins</h1>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-neutral-500">Install a plugin</h2>
        <form onSubmit={handleInstall} className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Plugin name
            <input
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              value={pluginName}
              onChange={(event) => setPluginName(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Version
            <input
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Display name
            <input
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Description
            <input
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Install
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-neutral-500">Look up a plugin</h2>
        <form onSubmit={handleLookup} className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Plugin ID
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

      {plugin !== null && (
        <div className="mt-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-neutral-500">Name</dt>
              <dd>{plugin.displayName}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Version</dt>
              <dd>{plugin.version}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Status</dt>
              <dd>{plugin.status}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Capabilities</dt>
              <dd>{plugin.capabilities.join(', ') || '—'}</dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void toggle('enable')}
              className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            >
              Enable
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void toggle('disable')}
              className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
            >
              Disable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
