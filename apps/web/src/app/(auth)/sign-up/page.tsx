'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';

interface CreateUserResponse {
  readonly userId: string;
}

interface LoginResponse {
  readonly userId: string;
  readonly token: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [tenantId, setTenantId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch<CreateUserResponse>('/v1/users', {
        method: 'POST',
        tenantId,
        body: { email, displayName, password },
      });
      const result = await apiFetch<LoginResponse>('/v1/auth/login', {
        method: 'POST',
        tenantId,
        body: { email, password },
      });
      login({ token: result.token, userId: result.userId, tenantId });
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
        Tenant provisioning isn&apos;t built yet — you need the ID of an existing tenant, created
        directly in the database, to sign up.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Tenant ID
          <input
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            placeholder="e.g. af3da7a6-8cd5-4ab6-b217-41d45320a8a8"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700"
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <Link href="/sign-in" className="text-center text-sm underline">
        Already have an account? Sign in
      </Link>
    </div>
  );
}
