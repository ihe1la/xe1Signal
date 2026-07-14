export const INTERNAL_ENVIRONMENT_MODES = [
  'strict',
  'compatibility',
  'legacy',
] as const;

export type InternalEnvironmentMode =
  (typeof INTERNAL_ENVIRONMENT_MODES)[number];

type InternalEnvironmentAccess = {
  enabled: boolean;
  nodeEnv: string | undefined;
  allowedHosts: string | undefined;
  requestHost: string | null;
  role: string | undefined;
};

export function parseInternalEnvironmentMode(
  value: string | string[] | undefined
): InternalEnvironmentMode {
  const candidate = Array.isArray(value) ? value[0] : value;

  return INTERNAL_ENVIRONMENT_MODES.includes(
    candidate as InternalEnvironmentMode
  )
    ? (candidate as InternalEnvironmentMode)
    : 'strict';
}

export function normalizeHostname(host: string | null): string | null {
  if (!host) return null;

  try {
    return new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function canAccessInternalEnvironment({
  enabled,
  nodeEnv,
  allowedHosts,
  requestHost,
  role,
}: InternalEnvironmentAccess): boolean {
  if (!enabled || nodeEnv === 'production' || role !== 'OWNER') return false;

  const hostname = normalizeHostname(requestHost);
  if (!hostname) return false;

  const allowlist = (allowedHosts ?? '')
    .split(',')
    .map((host) => normalizeHostname(host.trim()))
    .filter((host): host is string => Boolean(host));

  return allowlist.includes(hostname);
}
