import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center text-xl font-semibold">Create your account</h1>
      <p className="text-center text-sm text-neutral-500">
        Authentication is not wired up yet — this is a routing shell.
      </p>
      <Link href="/sign-in" className="text-center text-sm underline">
        Already have an account? Sign in
      </Link>
    </div>
  );
}
