import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#07080c] px-6 text-center text-zinc-100">
      <section>
        <p className="font-mono text-[10px] uppercase tracking-[.28em] text-violet-300">Signal lost</p>
        <h1 className="mt-4 font-mono text-3xl">You’re offline.</h1>
        <p className="mt-4 max-w-sm font-mono text-[11px] leading-6 text-zinc-400">
          Reconnect to reach your archive. Private pages and signals are never stored in the offline cache.
        </p>
        <Link
          href="/"
          className="mt-7 inline-block rounded-lg border border-white/15 px-6 py-3 font-mono text-[10px] text-zinc-200"
        >
          Try again
        </Link>
      </section>
    </main>
  );
}
