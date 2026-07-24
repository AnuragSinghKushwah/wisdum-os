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

export default function SignInPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      // 1. Resolve tenant ID first by email
      const { tenantId } = await apiFetch<{ tenantId: string }>('/v1/auth/resolve-tenant', {
        method: 'POST',
        body: { email },
      });

      // 2. Perform authentic login
      const result = await apiFetch<LoginResponse>('/v1/auth/login', {
        method: 'POST',
        tenantId,
        body: { email, password },
      });
      login({ token: result.token, userId: result.userId, tenantId });
      router.push('/dashboard');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to sign in. Try again.');
    } finally {
      setIsSubmitting(false);
    }
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
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
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
