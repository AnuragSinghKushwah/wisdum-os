'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';

interface WorkspaceDto {
  readonly id: string;
  readonly name: string;
  readonly settings: Record<string, any>;
}

const AUTOMATIONS = [
  { id: 'nightly-analysis', label: 'Nightly Repository Analysis', description: 'Scan connected GitHub repositories every night and extract new code concepts, patterns, and documentation gaps.', schedule: 'Every night at 2:00 AM', category: 'Knowledge', defaultEnabled: false },
  { id: 'conversation-summarization', label: 'Conversation Summarization', description: 'Automatically summarize imported AI conversations (Claude, ChatGPT) into structured knowledge notes.', schedule: 'When new conversations are ingested', category: 'Knowledge', defaultEnabled: false },
  { id: 'trend-analysis', label: 'Trend Analysis', description: 'Weekly scan of trending topics in your domain to match against your expertise and generate new opportunity ideas.', schedule: 'Every Monday at 9:00 AM', category: 'Intelligence', defaultEnabled: false },
  { id: 'knowledge-extraction', label: 'Knowledge Extraction', description: 'Extract concepts and relationships from all new knowledge assets and add them to the knowledge graph.', schedule: 'On ingestion', category: 'Intelligence', defaultEnabled: true },
  { id: 'idea-generation', label: 'Opportunity Generation', description: 'Automatically discover and propose content opportunities based on your recent knowledge activity.', schedule: 'Daily at 8:00 AM', category: 'Opportunities', defaultEnabled: true },
  { id: 'content-generation', label: 'Draft Pre-generation', description: 'Pre-generate first drafts for your top 3 daily opportunities so they are ready to review.', schedule: 'Daily at 9:00 AM (after Opportunity Generation)', category: 'Content', defaultEnabled: false },
  { id: 'seo-optimization', label: 'SEO Optimization', description: 'Automatically improve SEO metadata for all drafts before publishing.', schedule: 'Before each publish', category: 'Content', defaultEnabled: false },
  { id: 'publishing-schedule', label: 'Publishing Schedule', description: 'Publish approved drafts at optimal times based on your audience engagement data.', schedule: 'Configurable per content type', category: 'Publishing', defaultEnabled: false },
  { id: 'relationship-discovery', label: 'Relationship Discovery', description: 'Continuously discover new connections between knowledge nodes and surface cross-domain insights.', schedule: 'Every 6 hours', category: 'Intelligence', defaultEnabled: false },
  { id: 'knowledge-cleanup', label: 'Knowledge Cleanup', description: 'Detect and flag duplicate, outdated, or low-quality knowledge assets for review.', schedule: 'Weekly on Sunday', category: 'Knowledge', defaultEnabled: false },
];

export default function AutomationsPage() {
  const { session } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceDto | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (session === null) return;
    setIsLoading(true);
    setError(null);
    try {
      const workspaces = await apiFetch<readonly WorkspaceDto[]>('/v1/workspaces').catch(() => [] as readonly WorkspaceDto[]);
      if (workspaces.length > 0) {
        const active = workspaces[0];
        setWorkspace(active);

        // Derive enabled automations from settings
        const activeSet = new Set<string>();
        for (const item of AUTOMATIONS) {
          const settingKey = `automations.${item.id}`;
          const isSet = settingKey in active.settings;
          const isEnabled = isSet ? !!active.settings[settingKey] : item.defaultEnabled;
          if (isEnabled) {
            activeSet.add(item.id);
          }
        }
        setEnabled(activeSet);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load automations settings.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(id: string) {
    if (workspace === null) return;
    const settingKey = `automations.${id}`;
    const nextVal = !enabled.has(id);

    try {
      await apiFetch(`/v1/workspaces/${workspace.id}/settings`, {
        method: 'PUT',
        body: {
          key: settingKey,
          value: nextVal,
        },
      });

      setEnabled(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to save automation setting.');
    }
  }

  const categories = [...new Set(AUTOMATIONS.map(a => a.category))];

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <p className="text-sm text-neutral-500">Loading your automations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Panel */}
      <div className="border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Automations</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
          Configure background workflows that run while you sleep. Wisdum continuously works to discover opportunities, extract knowledge, and optimize content.
        </p>
      </div>

      {error !== null && (
        <div className="rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 p-4 text-sm font-medium text-rose-700 dark:text-rose-455 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {categories.map(category => (
        <div key={category} className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AUTOMATIONS.filter(a => a.category === category).map(automation => {
              const isSwitchedOn = enabled.has(automation.id);
              return (
                <div key={automation.id} className="flex items-start justify-between gap-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/30 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="space-y-1.5 flex-1">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">{automation.label}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{automation.description}</p>
                    <p className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">⏱ {automation.schedule}</p>
                  </div>
                  {/* Switch toggle styling */}
                  <button
                    onClick={() => void toggle(automation.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none cursor-pointer ${
                      isSwitchedOn ? 'bg-amber-500' : 'bg-neutral-200 dark:bg-neutral-800'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      isSwitchedOn ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
