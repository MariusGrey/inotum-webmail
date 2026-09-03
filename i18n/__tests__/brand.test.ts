import { describe, expect, it } from 'vitest';
import { applyBrand, brandText, hasBrandTokens } from '../brand';
import en from '../../locales/en/common.json';
import itCatalog from '../../locales/it/common.json';

describe('brand tokens (Inotum fork)', () => {
  it('replaces __APP__ and __BRAND__ with the runtime names', () => {
    expect(brandText('Welcome to __APP__', { app: 'Acme Mail', brand: 'Acme' })).toBe('Welcome to Acme Mail');
    expect(brandText('__BRAND__ → Google Calendar', { app: 'Acme Mail', brand: 'Acme' })).toBe('Acme → Google Calendar');
    expect(brandText('Open __BRAND__ (__APP__)', { app: 'Acme Mail', brand: 'Acme' })).toBe('Open Acme (Acme Mail)');
  });

  it('falls back to the app name when no short brand is set', () => {
    expect(brandText('__BRAND__ tools', { app: 'Acme Mail' })).toBe('Acme Mail tools');
    expect(brandText('__APP__', { app: '' })).toBe('Webmail');
  });

  it('is idempotent and leaves text without tokens untouched', () => {
    const once = applyBrand({ a: '__APP__', b: { c: 'plain', d: ['__BRAND__ x'] } }, { app: 'Acme Mail', brand: 'Acme' });
    expect(once).toEqual({ a: 'Acme Mail', b: { c: 'plain', d: ['Acme x'] } });
    expect(applyBrand(once, { app: 'Other', brand: 'O' })).toEqual(once);
  });

  it('catalogs carry tokens, never a hardcoded brand', () => {
    for (const catalog of [en, itCatalog]) {
      expect(hasBrandTokens(catalog)).toBe(true);
      expect(JSON.stringify(catalog)).not.toContain('Inotum');
      // only the strings about real Bulwark services (push relay, mobile app) may name Bulwark
      const keep = ['settings.notifications.push.', 'settings.security.link_device.'];
      const stray: string[] = [];
      const walk = (node: unknown, path: string) => {
        if (typeof node === 'string') {
          if (node.includes('Bulwark') && !keep.some((k) => path.startsWith(k))) stray.push(path);
        } else if (node && typeof node === 'object') {
          for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, path ? `${path}.${k}` : k);
        }
      };
      walk(catalog, '');
      expect(stray).toEqual([]);
      expect(hasBrandTokens(applyBrand(catalog, { app: 'Acme Mail', brand: 'Acme' }))).toBe(false);
    }
  });
});
