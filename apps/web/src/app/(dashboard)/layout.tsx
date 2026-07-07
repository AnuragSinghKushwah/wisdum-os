import Link from 'next/link';
import type { ReactNode } from 'react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/knowledge', label: 'Knowledge' },
  { href: '/workspace', label: 'Workspace' },
  { href: '/plugins', label: 'Plugins' },
  { href: '/settings', label: 'Settings' },
] as const;

/** Dashboard shell: authenticated chrome (sidebar nav) every feature area nests inside. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-neutral-200 p-4 dark:border-neutral-800">
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
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
