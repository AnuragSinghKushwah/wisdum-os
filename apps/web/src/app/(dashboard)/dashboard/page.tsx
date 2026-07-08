'use client';

import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';

export default function DashboardPage() {
  const { session } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-neutral-500">
        Signed in as <span className="font-mono">{session?.userId}</span> in tenant{' '}
        <span className="font-mono">{session?.tenantId}</span>.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/knowledge"
          className="rounded border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
        >
          <div className="font-medium">Knowledge</div>
          <div className="mt-1 text-sm text-neutral-500">Browse and create knowledge assets.</div>
        </Link>
        <Link
          href="/workspace"
          className="rounded border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
        >
          <div className="font-medium">Workspace</div>
          <div className="mt-1 text-sm text-neutral-500">Create workspaces and add members.</div>
        </Link>
        <Link
          href="/plugins"
          className="rounded border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
        >
          <div className="font-medium">Plugins</div>
          <div className="mt-1 text-sm text-neutral-500">Install and manage plugins.</div>
        </Link>
      </div>
    </div>
  );
}
