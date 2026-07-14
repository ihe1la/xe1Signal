import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  canAccessInternalEnvironment,
  INTERNAL_ENVIRONMENT_MODES,
  parseInternalEnvironmentMode,
} from '@/lib/internal-environment';

type PageProps = {
  searchParams: Promise<{ mode?: string | string[] }>;
};

const modeDescriptions = {
  strict: 'Current validation, authorization, and parser behavior.',
  compatibility: 'Compatibility fixtures for the immediately previous contract.',
  legacy: 'Historical fixtures kept for regression comparison only.',
} as const;

export default async function InternalEnvironmentPage({ searchParams }: PageProps) {
  const [session, requestHeaders, params] = await Promise.all([
    auth(),
    headers(),
    searchParams,
  ]);
  const requestHost =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');

  const allowed = canAccessInternalEnvironment({
    enabled: process.env.ENABLE_TEST_ENVIRONMENT === 'true',
    nodeEnv: process.env.NODE_ENV,
    allowedHosts: process.env.ALLOWED_TEST_HOSTS,
    requestHost,
    role: session?.user?.role,
  });

  if (!allowed) notFound();

  const mode = parseInternalEnvironmentMode(params.mode);

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Private test environment
          </p>
          <h1 className="text-3xl font-semibold">Signal Archive environment</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Isolated regression fixtures for authorized local testing. This surface is
            unavailable in production and does not weaken application security controls.
          </p>
        </header>

        <section aria-labelledby="mode-heading" className="space-y-4">
          <h2 id="mode-heading" className="text-sm font-medium">
            Behavior mode
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {INTERNAL_ENVIRONMENT_MODES.map((candidate) => (
              <Link
                key={candidate}
                href={`/internal/environment?mode=${candidate}`}
                aria-current={candidate === mode ? 'page' : undefined}
                className={`rounded-lg border p-4 transition-colors ${
                  candidate === mode
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-border bg-card hover:border-muted-foreground'
                }`}
              >
                <span className="block text-sm font-medium capitalize">{candidate}</span>
                <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                  {modeDescriptions[candidate]}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium capitalize">{mode} fixtures</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Access policy</dt>
              <dd className="mt-1">Owner, explicit flag, allowlisted host</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Security policy</dt>
              <dd className="mt-1">Production controls remain active</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
