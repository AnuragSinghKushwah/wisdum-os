'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';

interface OnboardingResponse {
  readonly userId: string;
  readonly token: string;
  readonly tenantId: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [orgName, setOrgName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-derived slug from organization name
  const orgSlug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) {
      if (!orgName.trim()) {
        setError('Organization name is required');
        return;
      }
      setError(null);
      setStep(2);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await apiFetch<OnboardingResponse>('/v1/onboarding/setup', {
        method: 'POST',
        body: {
          orgName,
          orgSlug,
          displayName,
          email,
          password,
        },
      });
      login({ token: result.token, userId: result.userId, tenantId: result.tenantId });
      router.push('/dashboard');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to create your account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center text-xl font-semibold">Create your account</h1>
      <p className="text-center text-xs text-neutral-500">
        Step {step} of 2: {step === 1 ? 'About your Organization' : 'Create Admin Profile'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {step === 1 ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Organization Name
              <input
                className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 bg-transparent text-sm"
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                placeholder="e.g. Acme Corp"
                required
              />
            </label>
            <div className="text-[10px] text-neutral-400 font-mono">
              Slug: {orgSlug || 'acme-corp'}
            </div>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Your Name
              <input
                className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 bg-transparent text-sm"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. John Doe"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Email
              <input
                type="email"
                className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 bg-transparent text-sm"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="john@example.com"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Password
              <input
                type="password"
                className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 bg-transparent text-sm"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          </>
        )}

        {error !== null && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-2 justify-end mt-2">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {step === 1 ? 'Continue' : isSubmitting ? 'Registering…' : 'Complete Setup'}
          </button>
        </div>
      </form>

      <Link href="/sign-in" className="text-center text-sm underline mt-2">
        Already have an account? Sign in
      </Link>
    </div>
  );
}
