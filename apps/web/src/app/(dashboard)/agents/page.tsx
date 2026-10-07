'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api-client';

interface ReasoningResultDto {
  readonly conceptsFound: number;
  readonly insightsCreated: number;
  readonly opportunitiesCreated: number;
}

interface AgentTaskDto {
  readonly id: string;
  readonly tenantId: string;
  readonly agentType: 'writing' | 'publishing';
  readonly status: 'pending' | 'running' | 'completed' | 'failed';
  readonly payload: Record<string, unknown>;
  readonly result: Record<string, unknown> | null;
  readonly error: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const AGENTS = [
  { id: 'research', name: 'Research Agent', icon: '🔬', description: 'Scans your knowledge base and the web to synthesize research summaries and surface emerging topics related to your expertise.', status: 'available', capabilities: ['Web research', 'Knowledge synthesis', 'Trend detection'] },
  { id: 'writing', name: 'Writing Agent', icon: '✍️', description: 'Transforms your opportunity drafts into polished long-form content with proper structure, SEO optimization, and citations.', status: 'available', capabilities: ['Draft writing', 'SEO optimization', 'Citation generation'] },
  { id: 'publishing', name: 'Publishing Agent', icon: '🚀', description: 'Publishes your approved content to connected platforms: LinkedIn, Ghost, Medium, Substack.', status: 'coming_soon', capabilities: ['LinkedIn', 'Ghost', 'Medium', 'Substack'] },
  { id: 'engineering', name: 'Engineering Agent', icon: '⚙️', description: 'Analyzes your GitHub repositories and code conversations to surface architecture insights and documentation gaps.', status: 'coming_soon', capabilities: ['GitHub analysis', 'Code documentation', 'Architecture insights'] },
  { id: 'marketing', name: 'Marketing Agent', icon: '📣', description: 'Creates marketing campaigns and social content from your published pieces to maximize reach and engagement.', status: 'coming_soon', capabilities: ['Campaign creation', 'Social posts', 'A/B copy variants'] },
  { id: 'documentation', name: 'Documentation Agent', icon: '📂', description: 'Keeps your internal documentation up-to-date by detecting gaps and generating docs from code and conversations.', status: 'coming_soon', capabilities: ['Gap detection', 'Auto-documentation', 'Version tracking'] },
  { id: 'trading', name: 'Trading Agent', icon: '📊', description: 'Analyzes trading journals and market data to generate structured trading reports and pattern insights.', status: 'coming_soon', capabilities: ['Journal analysis', 'Pattern detection', 'Report generation'] },
  { id: 'review', name: 'Review Agent', icon: '🔍', description: 'Reviews all content before publishing for quality, factual accuracy, tone consistency, and brand alignment.', status: 'coming_soon', capabilities: ['Quality check', 'Fact verification', 'Tone analysis'] },
];

export default function AgentsPage() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ReasoningResultDto | null>(null);
  
  const [tasks, setTasks] = useState<readonly AgentTaskDto[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  async function loadTasks() {
    try {
      const result = await apiFetch<readonly AgentTaskDto[]>('/v1/agents/tasks');
      setTasks(result);
    } catch (cause) {
      console.error('Failed to load agent tasks', cause);
    } finally {
      setIsLoadingTasks(false);
    }
  }

  // Poll for tasks if any are in 'pending' or 'running' status
  useEffect(() => {
    void loadTasks();
    const timer = setInterval(() => {
      void loadTasks();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function handleActivate(agentId: string) {
    if (agentId === 'writing') {
      router.push('/opportunities');
      return;
    }

    if (agentId === 'research') {
      setIsRunning(true);
      setError(null);
      setLastResult(null);
      try {
        const result = await apiFetch<ReasoningResultDto>('/v1/reasoning/run', { method: 'POST' });
        setLastResult(result);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to run research pass.');
      } finally {
        setIsRunning(false);
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Panel */}
      <div className="border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Agents</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
          Specialist AI agents that reason over different knowledge domains. Each agent operates autonomously within its area of expertise.
        </p>
      </div>

      {lastResult !== null && (
        <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/20 p-4 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          🧠 Research Scan Complete: Synthesized {lastResult.conceptsFound} concepts, registered {lastResult.insightsCreated} insights, and proposed {lastResult.opportunitiesCreated} content opportunities.
        </div>
      )}

      {error !== null && (
        <div className="rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 p-4 text-sm font-medium text-rose-700 dark:text-rose-455 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {AGENTS.map((agent) => (
          <div key={agent.name} className={`relative rounded-2xl border p-6 space-y-4 transition-all ${
            agent.status === 'available'
              ? 'border-neutral-200/80 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/30 hover:shadow-md hover:-translate-y-0.5'
              : 'border-neutral-100 dark:border-neutral-900 bg-neutral-50/30 dark:bg-neutral-950/10 opacity-60'
          }`}>
            {agent.status === 'coming_soon' && (
              <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-full px-2 py-0.5">Soon</span>
            )}
            <div className="flex items-center gap-3">
              <span className="text-2xl">{agent.icon}</span>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">{agent.name}</h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{agent.description}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {agent.capabilities.map((cap) => (
                <span key={cap} className="text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full px-2 py-0.5 border border-neutral-200 dark:border-neutral-750">{cap}</span>
              ))}
            </div>
            {agent.status === 'available' && (
              <button
                disabled={isRunning && agent.id === 'research'}
                onClick={() => void handleActivate(agent.id)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-4 py-2 text-xs font-semibold shadow-sm hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
              >
                {isRunning && agent.id === 'research' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Synthesizing…
                  </>
                ) : (
                  'Activate Agent'
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Recent Autonomic Agent Tasks Executions */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Recent Task Executions
          </h2>
          <button 
            onClick={() => void loadTasks()} 
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-250 underline"
          >
            Refresh
          </button>
        </div>

        {isLoadingTasks ? (
          <p className="text-xs text-neutral-400">Loading execution feed...</p>
        ) : tasks.length === 0 ? (
          <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">
            No agent task executions found. Writing and publishing tasks scheduled inside the Opportunities or Drafts tabs will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 font-semibold">Scheduled At</th>
                  <th className="pb-3 font-semibold">Agent</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900/60">
                {tasks.map((task) => {
                  const isExpanded = expandedTask === task.id;
                  return (
                    <tr key={task.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 transition-colors">
                      <td className="py-3.5 pr-4 text-neutral-500 dark:text-neutral-400 text-xs">
                        {new Date(task.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 text-neutral-800 dark:text-neutral-200 font-semibold text-sm capitalize">
                        {task.agentType}
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          task.status === 'completed' 
                            ? 'bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' 
                            : task.status === 'failed' 
                              ? 'bg-rose-500/5 text-rose-700 dark:text-rose-455 border-rose-500/20' 
                              : 'bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                          className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          {isExpanded ? 'Hide Payload' : 'View Payload'}
                        </button>
                        {isExpanded && (
                          <div className="text-left mt-2 p-3 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-850 text-xs font-mono max-w-lg space-y-2 overflow-x-auto">
                            <div>
                              <span className="font-semibold text-neutral-400">Task ID:</span> {task.id}
                            </div>
                            <div>
                              <span className="font-semibold text-neutral-400">Payload:</span>{' '}
                              {JSON.stringify(task.payload)}
                            </div>
                            {task.result && (
                              <div>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Result:</span>{' '}
                                {JSON.stringify(task.result)}
                              </div>
                            )}
                            {task.error && (
                              <div className="text-rose-600 dark:text-rose-455">
                                <span className="font-semibold">Error:</span> {task.error}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
