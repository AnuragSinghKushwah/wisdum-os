'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';

interface OpportunityDto {
  readonly id: string;
  readonly title: string;
  readonly rationale: string;
  readonly type: string;
  readonly status: string;
  readonly createdAt: string;
}

interface ReasoningResultDto {
  readonly conceptsFound: number;
  readonly insightsCreated: number;
  readonly opportunitiesCreated: number;
}

export default function OpportunitiesPage() {
  const [items, setItems] = useState<readonly OpportunityDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ReasoningResultDto | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFetch<readonly OpportunityDto[]>('/v1/opportunities');
      setItems(result);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to load opportunities.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRunReasoning() {
    setIsRunning(true);
    setError(null);
    try {
      const result = await apiFetch<ReasoningResultDto>('/v1/reasoning/run', { method: 'POST' });
      setLastResult(result);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to run reasoning pass.');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Opportunities</h1>
          <p className="mt-1 text-sm text-neutral-500">
            What valuable thing could you create next, based on what you&apos;ve captured?
          </p>
        </div>
        <button
          type="button"
          disabled={isRunning}
          onClick={() => void handleRunReasoning()}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isRunning ? 'Reasoning…' : 'Generate opportunities'}
        </button>
      </div>

      {lastResult !== null && (
        <p className="mt-3 text-sm text-neutral-500">
          Found {lastResult.conceptsFound} new concept(s), generated {lastResult.insightsCreated}{' '}
          insight(s) and {lastResult.opportunitiesCreated} opportunity(ies).
        </p>
      )}

      {error !== null && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No opportunities yet — create some knowledge with content, then press &quot;Generate
            opportunities&quot;.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 font-medium">Title</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100 dark:border-neutral-900">
                  <td className="py-2">
                    <Link href={`/opportunities/${item.id}`} className="underline">
                      {item.title}
                    </Link>
                  </td>
                  <td className="py-2">{item.type.replace(/_/g, ' ')}</td>
                  <td className="py-2">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
