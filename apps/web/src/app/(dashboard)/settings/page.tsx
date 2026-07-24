'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { apiFetch } from '../../../lib/api-client';

interface ApiKeyDto {
  readonly id: string;
  readonly label: string;
  readonly status: 'active' | 'revoked';
  readonly expiresAt?: string;
  readonly createdAt: string;
}

export default function SettingsPage() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'api' | 'ai' | 'notifications'>('profile');

  // API Keys states
  const [apiKeys, setApiKeys] = useState<readonly ApiKeyDto[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Load API keys from server
  const loadApiKeys = useCallback(async () => {
    setIsLoadingKeys(true);
    setKeyError(null);
    try {
      const res = await apiFetch<readonly ApiKeyDto[]>('/v1/identity/api-keys');
      setApiKeys(res);
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setIsLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'api') {
      void loadApiKeys();
    }
  }, [activeTab, loadApiKeys]);

  // Create API key
  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyLabel.trim()) return;

    setIsCreatingKey(true);
    setKeyError(null);
    setGeneratedKey(null);
    try {
      const res = await apiFetch<{ apiKeyId: string; plaintextKey: string }>('/v1/identity/api-keys', {
        method: 'POST',
        body: { label: newKeyLabel },
      });
      setGeneratedKey(res.plaintextKey);
      setNewKeyLabel('');
      await loadApiKeys();
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setIsCreatingKey(false);
    }
  }

  // Revoke API key
  async function handleRevokeKey(id: string) {
    setRevokingId(id);
    setKeyError(null);
    try {
      await apiFetch(`/v1/identity/api-keys/${id}`, { method: 'DELETE' });
      await loadApiKeys();
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Failed to revoke API key');
    } finally {
      setRevokingId(null);
    }
  }

  // Nice tenant/username initials
  const tenantInitial = session?.tenantId.charAt(0).toUpperCase() || 'T';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Panel */}
      <div className="border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Manage your account preferences, system settings, connected accounts, and AI behaviors.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
        <nav className="flex space-x-2" aria-label="Tabs">
          {(['profile', 'api', 'ai', 'notifications'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-1.5 px-4 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-neutral-100 dark:border-neutral-100 dark:text-neutral-950 shadow-sm'
                    : 'border-neutral-200/70 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 bg-transparent hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Panel */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-6 shadow-sm">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">Account Info</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Identity context metadata for the active user session.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">User ID</span>
                <p className="mt-1 text-xs font-mono text-neutral-800 dark:text-neutral-200 break-all">{session?.userId}</p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tenant ID</span>
                <p className="mt-1 text-xs font-mono text-neutral-800 dark:text-neutral-200 break-all">{session?.tenantId}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-neutral-950 dark:text-white">API Keys</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Credentials to authenticate external integrations or CLI scripts.</p>
              </div>
            </div>

            {keyError !== null && (
              <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-4 text-xs font-medium text-rose-700 dark:text-rose-400">
                ⚠️ {keyError}
              </div>
            )}

            {/* Plaintext Key Warning Display */}
            {generatedKey !== null && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-5 space-y-3 shadow-sm shadow-amber-500/5">
                <div className="flex items-start gap-2.5">
                  <span className="text-base">🔑</span>
                  <div>
                    <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400">Copy your personal API key</h3>
                    <p className="mt-1 text-[11px] text-neutral-500 leading-relaxed">
                      For security reasons, this key will not be shown again. Save it immediately.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/80 dark:bg-neutral-900 p-2.5 rounded-lg border border-amber-250 dark:border-amber-900/55 font-mono text-xs text-neutral-800 dark:text-neutral-200 select-all break-all shadow-inner">
                  {generatedKey}
                </div>
                <button
                  onClick={() => setGeneratedKey(null)}
                  className="text-[10px] font-bold text-amber-800 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  I have copied the key
                </button>
              </div>
            )}

            {/* Creation Form */}
            <form onSubmit={handleCreateKey} className="flex gap-2.5 items-end max-w-md border-b border-neutral-100 dark:border-neutral-800/80 pb-6">
              <label className="flex-1 flex flex-col gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                New Key Label
                <input
                  type="text"
                  placeholder="e.g. CLI Scraper Script"
                  className="rounded-xl border border-neutral-250 dark:border-neutral-800 px-3.5 py-2 bg-white dark:bg-neutral-900 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  disabled={isCreatingKey}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isCreatingKey || !newKeyLabel.trim()}
                className="rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 px-4 py-2.5 text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer h-[38px] shrink-0"
              >
                {isCreatingKey ? 'Creating…' : 'Create Key'}
              </button>
            </form>

            {/* API Keys Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Active Keys</h3>
              
              {isLoadingKeys ? (
                <p className="text-xs text-neutral-400">Loading credentials list...</p>
              ) : apiKeys.length === 0 ? (
                <p className="text-xs text-neutral-500 leading-relaxed">
                  No programmatic API credentials configured yet. Create a key above to interact with Wisdum programmatically.
                </p>
              ) : (
                <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/50 dark:bg-neutral-900/30 border-b border-neutral-200/60 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Label</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Created</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900/60 bg-white/20 dark:bg-transparent">
                      {apiKeys.map((key) => (
                        <tr key={key.id} className="hover:bg-neutral-50/20 dark:hover:bg-neutral-900/10 transition-colors">
                          <td className="p-3 font-semibold text-neutral-850 dark:text-neutral-200">{key.label}</td>
                          <td className="p-3">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                              key.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                            }`}>
                              {key.status}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-neutral-500">
                            {new Date(key.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="p-3 text-center">
                            {key.status === 'active' && (
                              <button
                                onClick={() => void handleRevokeKey(key.id)}
                                disabled={revokingId !== null}
                                className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50 cursor-pointer"
                              >
                                {revokingId === key.id ? 'Revoking…' : 'Revoke'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">AI Preferences</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Override system default reasoning models and concept confidence levels.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Reasoning LLM Provider
                <select className="rounded-xl border border-neutral-250/70 dark:border-neutral-800 px-3 py-2 bg-white dark:bg-neutral-900 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all">
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                  <option value="gemini">Gemini (Gemini 1.5 Pro)</option>
                  <option value="local">Ollama / Local LLM</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Concept Confidence Cutoff
                <select className="rounded-xl border border-neutral-250/70 dark:border-neutral-800 px-3 py-2 bg-white dark:bg-neutral-900 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all">
                  <option value="0.8">High Confidence Only (≥80%)</option>
                  <option value="0.5">Standard Confidence (≥50%)</option>
                  <option value="0.3">Exploratory / Low Confidence (≥30%)</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">Notification preferences</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Configure how and when Wisdum alerts you about discovered opportunities.</p>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Weekly Opportunity Digest', desc: 'Email digest summarizing the top content opportunities discovered during the week.' },
                { label: 'Immediate Agent Action Required', desc: 'Alert when a publishing agent needs manual authorization or preview validation.' },
                { label: 'System Integration Alert', desc: 'Notify on connector failures or processing errors in the knowledge pipeline.' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-neutral-900 dark:text-white">{item.label}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{item.desc}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-neutral-350 dark:border-neutral-750 text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
