/**
 * Inotum fork — brand at runtime.
 *
 * The locale catalogs never contain a product name: they carry the tokens
 * `__APP__` (the product, e.g. "Inotum Mail") and `__BRAND__` (the short/company
 * name, e.g. "Inotum"). `applyBrand` fills them in with the values the instance
 * exposes at runtime (APP_NAME, LOGIN_COMPANY_NAME, per-host DOMAIN_BRANDING),
 * so the same image serves any brand and an upstream merge never touches it.
 *
 * Pure and synchronous: safe on the server (request config, layout) and on the
 * client (lazy-loaded catalogs). Idempotent: text without tokens is returned as-is.
 */

export const APP_TOKEN = '__APP__';
export const BRAND_TOKEN = '__BRAND__';

export interface BrandNames {
  /** Product name shown to users (APP_NAME). */
  app: string;
  /** Short/company name (LOGIN_COMPANY_NAME); falls back to `app`. */
  brand?: string;
}

const TOKEN_RE = /__(?:APP|BRAND)__/g;

export function brandText(text: string, names: BrandNames): string {
  if (!text.includes('__')) return text;
  const app = names.app || 'Webmail';
  const brand = names.brand || app;
  return text.replace(TOKEN_RE, (m) => (m === APP_TOKEN ? app : brand));
}

export function applyBrand<T>(messages: T, names: BrandNames): T {
  if (typeof messages === 'string') return brandText(messages, names) as unknown as T;
  if (Array.isArray(messages)) return messages.map((v) => applyBrand(v, names)) as unknown as T;
  if (messages && typeof messages === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(messages as Record<string, unknown>)) out[k] = applyBrand(v, names);
    return out as T;
  }
  return messages;
}

/** True when a catalog still carries unresolved tokens (used by tests and the provider). */
export function hasBrandTokens(messages: unknown): boolean {
  if (typeof messages === 'string') return TOKEN_RE.test(messages) && ((TOKEN_RE.lastIndex = 0), true);
  if (Array.isArray(messages)) return messages.some(hasBrandTokens);
  if (messages && typeof messages === 'object') return Object.values(messages as Record<string, unknown>).some(hasBrandTokens);
  return false;
}
