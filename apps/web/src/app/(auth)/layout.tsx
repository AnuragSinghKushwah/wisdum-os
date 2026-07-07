import type { ReactNode } from 'react';

/** Authentication shell: centered, unauthenticated chrome — no dashboard nav. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 p-8 dark:border-neutral-800">
        <div className="mb-6 text-center text-lg font-semibold">Wisdum</div>
        {children}
      </div>
    </div>
  );
}
