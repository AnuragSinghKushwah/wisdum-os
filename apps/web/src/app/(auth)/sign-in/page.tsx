'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';

interface LoginResponse {
  readonly userId: string;
  readonly token: string;
}

/**
 * Matches the account the API creates when it runs with `WISDUM_DEV_SEED=true`.
 * The button is only rendered when the web app is built with
 * `NEXT_PUBLIC_WISDUM_DEV_SEED=true`, and it signs in through the normal login
 * endpoint like any other user.
 */
const DEV_SEED_ENABLED = process.env.NEXT_PUBLIC_WISDUM_DEV_SEED === 'true';
const DEV_CREDENTIALS = { email: 'dev@wisdum.local', password: 'wisdum-dev-password' } as const;

export default function SignInPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signIn(credentials: { email: string; password: string }) {
    setError(null);
    setIsSubmitting(true);
    try {
      // 1. Resolve tenant ID first by email
      const { tenantId } = await apiFetch<{ tenantId: string }>('/v1/auth/resolve-tenant', {
        method: 'POST',
        body: { email: credentials.email },
      });

      // 2. Perform authentic login
      const result = await apiFetch<LoginResponse>('/v1/auth/login', {
        method: 'POST',
        tenantId,
        body: credentials,
      });
      login({ token: result.token, userId: result.userId, tenantId });
      router.push('/dashboard');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to sign in. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn({ email, password });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center text-xl font-semibold">Sign in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 bg-transparent"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 bg-transparent"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error !== null && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 cursor-pointer"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
        {DEV_SEED_ENABLED && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void signIn(DEV_CREDENTIALS)}
            className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            ⚡ Quick Dev Sign In
          </button>
        )}
      </form>
      <div className="flex flex-col gap-2 items-center text-sm">
        <Link href="/forgot-password" className="underline text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
          Forgot your password?
        </Link>
        <Link href="/sign-up" className="underline">
          Need an account? Sign up
        </Link>
      </div>
    </div>
  );
}
