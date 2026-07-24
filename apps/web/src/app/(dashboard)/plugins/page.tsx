'use client';

import { useEffect, useState, useCallback } from 'react';
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

const PLUGIN_CATALOG = [
  { name: 'github', displayName: 'GitHub', icon: '🐙', description: 'Sync repositories, commits, PRs, and code discussions into your knowledge base.', category: 'Source', capabilities: ['repo_sync', 'commit_scan'] },
  { name: 'notion', displayName: 'Notion', icon: '📓', description: 'Import pages, databases, and workspace documents from Notion.', category: 'Source', capabilities: ['document_import'] },
  { name: 'slack', displayName: 'Slack', icon: '💬', description: 'Capture important Slack conversations and threads as knowledge.', category: 'Source', capabilities: ['chat_capture'] },
  { name: 'obsidian', displayName: 'Obsidian', icon: '🏠', description: 'Sync your Obsidian vault notes and links into your Wisdum knowledge graph.', category: 'Source', capabilities: ['vault_sync'] },
  { name: 'claude', displayName: 'Claude', icon: '🤖', description: 'Import conversation history from Claude AI into structured knowledge notes.', category: 'AI Tools', capabilities: ['chat_import'] },
  { name: 'chatgpt', displayName: 'ChatGPT', icon: '🧠', description: 'Import ChatGPT conversation history and organize it by topic.', category: 'AI Tools', capabilities: ['chat_import'] },
  { name: 'ghost', displayName: 'Ghost', icon: '👻', description: 'Publish drafts directly to your Ghost blog.', category: 'Publishing', capabilities: ['publish_post'] },
  { name: 'linkedin', displayName: 'LinkedIn', icon: '💼', description: 'Publish posts and articles directly to your LinkedIn profile.', category: 'Publishing', capabilities: ['publish_social'] },
  { name: 'twitter', displayName: 'Twitter/X', icon: '🐦', description: 'Publish threads and posts to Twitter/X from your drafts.', category: 'Publishing', capabilities: ['publish_social'] },
  { name: 'substack', displayName: 'Substack', icon: '📧', description: 'Publish newsletter issues directly to your Substack.', category: 'Publishing', capabilities: ['publish_post'] },
];

export default function PluginsPage() {
  const [installed, setInstalled] = useState<readonly PluginDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load installed plugins
  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<readonly PluginDto[]>('/v1/plugins');
      setInstalled(res);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load installed plugins.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Install a catalog plugin
  async function handleInstall(name: string, displayName: string, description: string, capabilities: string[]) {
    setIsSubmitting(name);
    setError(null);
    try {
      await apiFetch<{ pluginId: string }>('/v1/plugins', {
        method: 'POST',
        body: {
          pluginName: name,
          version: '1.0.0',
          displayName,
          description,
          capabilities,
        },
      });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to install plugin.');
    } finally {
      setIsSubmitting(null);
    }
  }

  // Toggle active/inactive plugin status
  async function handleToggle(pluginId: string, currentStatus: string) {
    setIsSubmitting(pluginId);
    setError(null);
    const action = currentStatus === 'active' ? 'disable' : 'enable';
    try {
      await apiFetch(`/v1/plugins/${pluginId}/${action}`, { method: 'POST' });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : `Failed to ${action} plugin.`);
    } finally {
      setIsSubmitting(null);
    }
  }

  const categories = [...new Set(PLUGIN_CATALOG.map((p) => p.category))];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Panel */}
      <div className="border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Plugin Marketplace</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
          Connect your knowledge sources and publishing destinations. Plugins extend what Wisdum can read and where it can publish.
        </p>
      </div>

      {error !== null && (
        <div className="rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 p-4 text-sm font-medium text-rose-700 dark:text-rose-455 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-neutral-400">Loading marketplace database...</p>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {category} Connectors
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLUGIN_CATALOG.filter((p) => p.category === category).map((plugin) => {
                  const installedRecord = installed.find((p) => p.name === plugin.name);
                  const isInstalled = installedRecord !== undefined;
                  const isActive = installedRecord?.status === 'active';

                  return (
                    <div
                      key={plugin.name}
                      className="flex items-start gap-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/30 p-5 shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-750 transition-all duration-200"
                    >
                      <span className="text-3xl p-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-xl">
                        {plugin.icon}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">
                            {plugin.displayName}
                          </p>
                          {isInstalled && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-750'
                              }`}
                            >
                              {installedRecord.status}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          {plugin.description}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {plugin.capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="text-[9px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded px-1.5 py-0.5 font-mono"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 flex flex-col gap-2">
                        {!isInstalled ? (
                          <button
                            onClick={() =>
                              void handleInstall(
                                plugin.name,
                                plugin.displayName,
                                plugin.description,
                                plugin.capabilities,
                              )
                            }
                            disabled={isSubmitting !== null}
                            className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 cursor-pointer transition-opacity"
                          >
                            {isSubmitting === plugin.name ? 'Installing…' : 'Install'}
                          </button>
                        ) : (
                          <button
                            onClick={() => void handleToggle(installedRecord.id, installedRecord.status)}
                            disabled={isSubmitting !== null}
                            className={`rounded-xl px-4 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                              isActive
                                ? 'border-neutral-250 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                                : 'bg-neutral-900 border-transparent text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-95'
                            }`}
                          >
                            {isSubmitting === installedRecord.id
                              ? 'Updating…'
                              : isActive
                              ? 'Disable'
                              : 'Enable'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
