import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        404
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        Page not found
      </h1>
      <p className="mt-4 text-slate-600">
        The page you were looking for doesn't exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
      >
        Back to home
      </Link>
    </main>
  );
}
