'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiFetch } from '../../../lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      await apiFetch('/v1/auth/reset-password-request', {
        method: 'POST',
        body: { email },
      });
      setMessage('If an account exists for this email, a reset link has been sent.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center text-xl font-semibold">Reset Password</h1>
      <p className="text-center text-xs text-neutral-500">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {message ? (
        <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/20 p-4 text-sm text-emerald-800 dark:text-emerald-300">
          {message}
          <div className="mt-4 text-center">
            <Link href="/sign-in" className="underline text-sm font-semibold">
              Return to sign in
            </Link>
          </div>
        </div>
      ) : (
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
          {error !== null && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isSubmitting ? 'Requesting reset…' : 'Send reset link'}
          </button>
        </form>
      )}

      {!message && (
        <Link href="/sign-in" className="text-center text-sm underline">
          Back to sign in
        </Link>
      )}
    </div>
  );
}
