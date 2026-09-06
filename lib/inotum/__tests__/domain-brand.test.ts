import { describe, expect, it } from 'vitest';
import { brandingFromDomain, matchStalwartDomain, mergeBranding, type StalwartDomain } from '../domain-brand';

const domains: StalwartDomain[] = [
  { name: 'inotum.io', aliases: [], logo: null },
  { name: 'impactotraining.com', aliases: ['impacto.example'], logo: 'https://webmail.impactotraining.com/branding/site/domini/impactotraining.com/logo.svg' },
  { name: 'sub.inotum.io', aliases: [], logo: 'https://x/sub.svg' },
];

describe('brand per dominio da Stalwart', () => {
  it('trova il dominio piu specifico per l host', () => {
    expect(matchStalwartDomain('webmail.impactotraining.com', domains)?.name).toBe('impactotraining.com');
    expect(matchStalwartDomain('WEBMAIL.Inotum.io.', domains)?.name).toBe('inotum.io');
    expect(matchStalwartDomain('webmail.sub.inotum.io', domains)?.name).toBe('sub.inotum.io');
    expect(matchStalwartDomain('webmail.impacto.example:3000', domains)?.name).toBe('impactotraining.com');
    expect(matchStalwartDomain('webmail.altro.org', domains)).toBeNull();
    expect(matchStalwartDomain(null, domains)).toBeNull();
  });

  it('senza logo non cambia nulla; con logo imposta loghi, favicon e icona PWA', () => {
    expect(brandingFromDomain(domains[0])).toEqual({});
    const b = brandingFromDomain(domains[1]);
    expect(Object.keys(b).sort()).toEqual(['appLogoDarkUrl', 'appLogoLightUrl', 'faviconUrl', 'loginLogoDarkUrl', 'loginLogoLightUrl', 'pwaIconUrl']);
    expect(b.faviconUrl).toBe(domains[1].logo);
  });

  it('DOMAIN_BRANDING esplicito vince, i vuoti no', () => {
    const merged = mergeBranding(brandingFromDomain(domains[1]), { appName: 'Impacto Training Mail', loginLogoLightUrl: '/altro.svg', faviconUrl: '' });
    expect(merged.appName).toBe('Impacto Training Mail');
    expect(merged.loginLogoLightUrl).toBe('/altro.svg');
    expect(merged.faviconUrl).toBe(domains[1].logo);
  });
});
