/**
 * Inotum fork — punto unico per gli override di brand per host:
 * DOMAIN_BRANDING (env/admin) sopra il logo del dominio letto da Stalwart.
 */
import { configManager } from '@/lib/admin/config-manager';
import { matchDomainBranding, parseDomainBranding, type DomainBrandingEntry } from '@/lib/admin/domain-branding';
import { mergeBranding, stalwartDomainBranding } from './domain-brand';

export async function resolveDomainOverrides(host: string | null): Promise<Partial<DomainBrandingEntry>> {
  const explicit = matchDomainBranding(host, parseDomainBranding(configManager.get<unknown>('domainBranding', [])));
  return mergeBranding(await stalwartDomainBranding(host), explicit);
}
