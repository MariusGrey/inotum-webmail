import { headers } from 'next/headers';
import { configManager } from '@/lib/admin/config-manager';
import { matchDomainBranding, parseDomainBranding, pickRequestHost } from '@/lib/admin/domain-branding';
import type { BrandNames } from './brand';

/**
 * Inotum fork — resolves the brand names for the current request on the server,
 * with the same precedence as /api/config: per-host DOMAIN_BRANDING override,
 * then admin/env value (APP_NAME, LOGIN_COMPANY_NAME), then build-time default.
 */
export async function resolveBrandNames(): Promise<BrandNames> {
  await configManager.ensureLoaded();
  let host: string | null = null;
  try {
    host = pickRequestHost(await headers());
  } catch {
    // headers() is unavailable outside a request (e.g. static generation)
  }
  const overrides = matchDomainBranding(host, parseDomainBranding(configManager.get<unknown>('domainBranding', [])));
  const pick = (key: 'appName' | 'loginCompanyName', fallback: string): string => {
    const o = overrides[key];
    if (typeof o === 'string' && o.length > 0) return o;
    return configManager.get<string>(key, fallback);
  };
  const app = pick('appName', '') || process.env.NEXT_PUBLIC_APP_NAME || 'Webmail';
  const brand = pick('loginCompanyName', '') || app;
  return { app, brand };
}
