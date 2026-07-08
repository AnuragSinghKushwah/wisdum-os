'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../../lib/auth-context';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/knowledge', label: 'Knowledge' },
  { href: '/workspace', label: 'Workspace' },
  { href: '/plugins', label: 'Plugins' },
  { href: '/settings', label: 'Settings' },
] as const;

/** Dashboard shell: authenticated chrome (sidebar nav) every feature area nests inside. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && session === null) {
      router.replace('/sign-in');
    }
  }, [isLoading, session, router]);

  if (isLoading || session === null) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-neutral-200 p-4 dark:border-neutral-800">
        <div>
          <div className="mb-6 text-lg font-semibold">Wisdum</div>
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="truncate text-neutral-500" title={session.tenantId}>
            Tenant: {session.tenantId}
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/sign-in');
            }}
            className="rounded px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
