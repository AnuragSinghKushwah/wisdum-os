'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/api-client';

interface OpportunityDto {
  readonly id: string;
  readonly insightId: string;
  readonly title: string;
  readonly rationale: string;
  readonly type: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function OpportunityDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<OpportunityDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOpportunity(await apiFetch<OpportunityDto>(`/v1/opportunities/${id}`));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to load this opportunity.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleGenerateDraft() {
    setIsGenerating(true);
    setError(null);
    try {
      const { draftId } = await apiFetch<{ draftId: string }>(`/v1/opportunities/${id}/draft`, {
        method: 'POST',
      });
      router.push(`/drafts/${draftId}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to generate a draft.');
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  if (opportunity === null) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Not found.'}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">{opportunity.title}</h1>
      <p className="mt-1 font-mono text-xs text-neutral-500">{opportunity.id}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-neutral-500">Status</dt>
          <dd>{opportunity.status}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Type</dt>
          <dd>{opportunity.type.replace(/_/g, ' ')}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm">
        <span className="text-neutral-500">Why: </span>
        {opportunity.rationale}
      </p>

      {error !== null && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-6">
        <button
          type="button"
          disabled={isGenerating || opportunity.status !== 'proposed'}
          onClick={() => void handleGenerateDraft()}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isGenerating ? 'Generating…' : 'Generate draft'}
        </button>
        {opportunity.status !== 'proposed' && (
          <p className="mt-2 text-xs text-neutral-500">
            This opportunity is already {opportunity.status}.
          </p>
        )}
      </div>
    </div>
  );
}
