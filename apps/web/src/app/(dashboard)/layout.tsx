'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { SearchBar } from './components/search-bar';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/opportunities', label: 'Opportunities', icon: 'lightbulb' },
  { href: '/drafts', label: 'Drafts', icon: 'document' },
  { href: '/published', label: 'Published', icon: 'globe' },
  { href: '/knowledge', label: 'Knowledge', icon: 'database' },
  { href: '/workspace', label: 'Workspace', icon: 'users' },
  { href: '/plugins', label: 'Plugins', icon: 'cpu' },
  { href: '/agents', label: 'Agents', icon: 'agent' },
  { href: '/automations', label: 'Automations', icon: 'clock' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
] as const;

// Inline SVG Icon Renderer
function Icon({ type }: { type: string }) {
  const baseClass = "h-4 w-4 stroke-current";
  if (type === 'dashboard') {
    return (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    );
  }
  if (type === 'lightbulb') {
    return (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    );
  }
  if (type === 'document') {
    return (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  if (type === 'globe') {
    return (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    );
  }
  if (type === 'database') {
    return (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    );
  }
  if (type === 'users') {
    return (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  if (type === 'cpu') {
    return (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    );
  }
  if (type === 'agent') {
    return (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15m-6.75-12a24.301 24.301 0 00-4.5 0" />
      </svg>
    );
  }
  if (type === 'clock') {
    return (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  return (
    <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading, logout } = useAuth();
  const [aiMode, setAiMode] = useState<'live' | 'mock' | null>(null);
  const [aiProblem, setAiProblem] = useState<string | null>(null);

  const signedIn = session !== null;
  useEffect(() => {
    if (!signedIn) return;
    apiFetch<{ ai: { mode: 'live' | 'mock'; check?: { status: string; message?: string } } }>(
      '/v1/system/capabilities',
    )
      .then((capabilities) => {
        setAiMode(capabilities.ai.mode);
        const check = capabilities.ai.check;
        setAiProblem(check?.status === 'failed' ? (check.message ?? 'The AI provider check failed.') : null);
      })
      .catch(() => setAiMode(null));
  }, [signedIn]);

  useEffect(() => {
    if (!isLoading && session === null) {
      router.replace('/sign-in');
    }
  }, [isLoading, session, router]);

  if (isLoading || session === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-sm font-semibold text-neutral-500">
        <svg className="animate-spin h-5 w-5 text-neutral-600 dark:text-neutral-400 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Loading Wisdum OS…
      </div>
    );
  }

  // Get first letter of tenant for a nice initials logo
  const tenantInitial = session.tenantId.charAt(0).toUpperCase() || 'T';

  return (
    <div className="flex min-h-screen bg-neutral-50/30 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      
      {/* Sidebar Navigation */}
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-6">
        <div>
          {/* Logo Brand Header */}
          <div className="flex items-center gap-2.5 mb-8">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 text-white font-extrabold text-sm shadow-md">
              W
            </span>
            <div className="text-base font-bold tracking-tight text-neutral-900 dark:text-white flex items-center">
              Wisdum
              <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* Global Cmd+K Search */}
          <SearchBar />

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border-l-2 border-amber-500 shadow-sm shadow-amber-500/5'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <Icon type={link.icon} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="flex flex-col gap-4 border-t border-neutral-150 dark:border-neutral-800 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-300">
              {tenantInitial}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">Active Tenant</p>
              <p className="text-[10px] font-mono text-neutral-400 truncate" title={session.tenantId}>
                {session.tenantId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/sign-in');
            }}
            className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:bg-neutral-50 dark:hover:bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 transition-colors shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Feature Area */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        {aiMode === 'live' && aiProblem !== null && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
          >
            <strong>The AI provider is not working.</strong> {aiProblem} Creating content will fail until this is
            fixed.
          </div>
        )}
        {aiMode === 'mock' && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <strong>Demo mode.</strong> No AI provider is configured, so opportunities and drafts shown
            by automatic reasoning are sample text, not based on your sources, and “Create content from
            this source” is disabled. Set <code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code>,{' '}
            <code>GEMINI_API_KEY</code> or <code>OLLAMA_HOST</code> in <code>.env</code> and restart the
            API.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
