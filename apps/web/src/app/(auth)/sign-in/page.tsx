import Link from 'next/link';

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center text-xl font-semibold">Sign in</h1>
      <p className="text-center text-sm text-neutral-500">
        Authentication is not wired up yet — this is a routing shell.
      </p>
      <Link href="/sign-up" className="text-center text-sm underline">
        Need an account? Sign up
      </Link>
    </div>
  );
}
