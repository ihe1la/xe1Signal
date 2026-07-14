import { describe, expect, it } from 'vitest';
import {
  canAccessInternalEnvironment,
  normalizeHostname,
  parseInternalEnvironmentMode,
} from './internal-environment';

const allowedRequest = {
  enabled: true,
  nodeEnv: 'development',
  allowedHosts: 'localhost,127.0.0.1',
  requestHost: 'localhost:3000',
  role: 'OWNER',
};

describe('internal environment access', () => {
  it('permits only an enabled, non-production, owner request on an allowed host', () => {
    expect(canAccessInternalEnvironment(allowedRequest)).toBe(true);
    expect(
      canAccessInternalEnvironment({ ...allowedRequest, enabled: false })
    ).toBe(false);
    expect(
      canAccessInternalEnvironment({ ...allowedRequest, nodeEnv: 'production' })
    ).toBe(false);
    expect(
      canAccessInternalEnvironment({ ...allowedRequest, role: 'ADMIN' })
    ).toBe(false);
    expect(
      canAccessInternalEnvironment({ ...allowedRequest, requestHost: 'example.com' })
    ).toBe(false);
  });

  it('normalizes hostnames without accepting malformed values', () => {
    expect(normalizeHostname('LOCALHOST:3000')).toBe('localhost');
    expect(normalizeHostname('[::1]:3000')).toBe('[::1]');
    expect(normalizeHostname('')).toBeNull();
  });

  it('defaults unknown modes to strict', () => {
    expect(parseInternalEnvironmentMode(undefined)).toBe('strict');
    expect(parseInternalEnvironmentMode('compatibility')).toBe('compatibility');
    expect(parseInternalEnvironmentMode('unexpected')).toBe('strict');
  });
});
