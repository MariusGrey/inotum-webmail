/**
 * Inotum fork — brand per dominio letto da Stalwart.
 *
 * L'amministratore assegna a un dominio il suo logo dalla console
 * (Management → Domains → campo "Logo" di x:Domain). Qui, per l'host da cui
 * arriva la richiesta (webmail.<dominio>), si cerca il dominio corrispondente
 * fra quelli di Stalwart e, se ha un logo, lo si usa per login, barra laterale,
 * favicon e icona PWA. Il resto del brand (nome, colori, link) continua a
 * venire da DOMAIN_BRANDING / APP_NAME: un valore esplicito li' vince sempre.
 *
 * Accesso: chiave API di sola lettura (permessi sysDomainGet/sysDomainQuery),
 * INOTUM_STALWART_API_KEY + INOTUM_STALWART_URL nell'ambiente. Senza chiave la
 * funzione e' spenta e tutto resta com'era. Cache 60 s, timeout 3 s, e in caso
 * di errore si continua con l'ultimo elenco buono: il brand non deve mai
 * rallentare o rompere la webmail.
 */
import type { DomainBrandingEntry } from '@/lib/admin/domain-branding';

export interface StalwartDomain {
  name: string;
  aliases: string[];
  logo: string | null;
}

const TTL_MS = 60_000;
const TIMEOUT_MS = 3_000;
let cache: { at: number; domains: StalwartDomain[] } | null = null;
let inflight: Promise<StalwartDomain[]> | null = null;

function normalizeHost(host: string | null): string {
  return (host ?? '').trim().toLowerCase().replace(/:\d+$/, '').replace(/\.+$/, '');
}

async function loadDomains(): Promise<StalwartDomain[]> {
  const url = (process.env.INOTUM_STALWART_URL || '').replace(/\/+$/, '');
  const key = process.env.INOTUM_STALWART_API_KEY || '';
  if (!url || !key) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/jmap/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        using: ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'],
        methodCalls: [['x:Domain/get', { ids: null, properties: ['name', 'aliases', 'logo', 'isEnabled'] }, '0']],
      }),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { methodResponses?: unknown[][] };
    const first = json.methodResponses?.[0];
    if (!first || first[0] !== 'x:Domain/get') throw new Error('risposta inattesa');
    const list = ((first[1] as { list?: Record<string, unknown>[] }).list ?? []);
    return list
      .filter((d) => d.isEnabled !== false && typeof d.name === 'string')
      .map((d) => ({
        name: (d.name as string).toLowerCase(),
        aliases: Object.keys((d.aliases as Record<string, unknown>) ?? {}).map((a) => a.toLowerCase()),
        logo: typeof d.logo === 'string' && d.logo.trim() ? d.logo.trim() : null,
      }));
  } finally {
    clearTimeout(timer);
  }
}

/** Elenco dei domini di Stalwart, con cache; mai un'eccezione verso il chiamante. */
export async function getStalwartDomains(): Promise<StalwartDomain[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.domains;
  if (!inflight) {
    inflight = loadDomains()
      .then((domains) => {
        cache = { at: Date.now(), domains };
        return domains;
      })
      .catch(() => cache?.domains ?? [])
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Il dominio (o alias) piu' specifico di cui `host` e' sottodominio, o null. */
export function matchStalwartDomain(host: string | null, domains: StalwartDomain[]): StalwartDomain | null {
  const h = normalizeHost(host);
  if (!h) return null;
  let best: StalwartDomain | null = null;
  let bestLen = -1;
  for (const d of domains) {
    for (const name of [d.name, ...d.aliases]) {
      if ((h === name || h.endsWith('.' + name)) && name.length > bestLen) {
        best = d;
        bestLen = name.length;
      }
    }
  }
  return best;
}

/** Override di brand derivati dal logo del dominio Stalwart che serve `host`. */
export function brandingFromDomain(domain: StalwartDomain | null): Partial<DomainBrandingEntry> {
  if (!domain?.logo) return {};
  const logo = domain.logo;
  return {
    faviconUrl: logo,
    pwaIconUrl: logo,
    appLogoLightUrl: logo,
    appLogoDarkUrl: logo,
    loginLogoLightUrl: logo,
    loginLogoDarkUrl: logo,
  };
}

/** Fonde due insiemi di override: un valore non vuoto in `explicit` vince su `base`. */
export function mergeBranding(
  base: Partial<DomainBrandingEntry>,
  explicit: Partial<DomainBrandingEntry>,
): Partial<DomainBrandingEntry> {
  const out: Partial<DomainBrandingEntry> = { ...base };
  for (const [k, v] of Object.entries(explicit)) {
    if (typeof v === 'string' && v.length > 0) (out as Record<string, string>)[k] = v;
  }
  return out;
}

/** Override completi per `host`: logo dal dominio Stalwart, poi DOMAIN_BRANDING (che vince). */
export async function stalwartDomainBranding(host: string | null): Promise<Partial<DomainBrandingEntry>> {
  return brandingFromDomain(matchStalwartDomain(host, await getStalwartDomains()));
}
