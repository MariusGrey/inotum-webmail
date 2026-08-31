/**
 * Inotum fork — server-side store of "calfeed" tokens.
 *
 * A calfeed is a secret, read-only iCalendar export of a user's Inotum
 * calendars, published by the host cron job (ops/gcal-export.py) at
 * `https://mail.<domain>/calfeed/<token>.ics` so it can be subscribed from
 * Google Calendar ("Add calendar from URL").
 *
 * This module only manages the token ↔ account mapping. The mapping lives in a
 * single JSON file (default `<cwd>/data/inotum/calfeeds.json`, override with
 * INOTUM_DATA_DIR) that the host cron reads to know which accounts to export.
 * Tokens are 128-bit random values encoded as 32 hex chars.
 */
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface CalfeedEntry {
  /** JMAP login name (full e-mail address). */
  username: string;
  /** JMAP server the account belongs to (normalized, no trailing slash). */
  serverUrl: string;
  /** ISO timestamp of creation / last regeneration. */
  createdAt: string;
}

export type CalfeedStore = Record<string, CalfeedEntry>;

const TOKEN_RE = /^[a-f0-9]{32}$/;

export function getInotumDataDir(): string {
  return process.env.INOTUM_DATA_DIR || path.join(process.cwd(), 'data', 'inotum');
}

function storePath(): string {
  return path.join(getInotumDataDir(), 'calfeeds.json');
}

export function isValidCalfeedToken(token: string): boolean {
  return TOKEN_RE.test(token);
}

export async function readCalfeedStore(): Promise<CalfeedStore> {
  try {
    const raw = await readFile(storePath(), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: CalfeedStore = {};
    for (const [token, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!isValidCalfeedToken(token) || !value || typeof value !== 'object') continue;
      const v = value as Record<string, unknown>;
      if (typeof v.username !== 'string' || typeof v.serverUrl !== 'string') continue;
      out[token] = {
        username: v.username,
        serverUrl: v.serverUrl,
        createdAt: typeof v.createdAt === 'string' ? v.createdAt : new Date(0).toISOString(),
      };
    }
    return out;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

async function writeCalfeedStore(store: CalfeedStore): Promise<void> {
  const dir = getInotumDataDir();
  await mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.calfeeds.${process.pid}.${Date.now()}.tmp`);
  await writeFile(tmp, JSON.stringify(store, null, 2) + '\n', { mode: 0o640 });
  await rename(tmp, storePath());
}

function sameAccount(entry: CalfeedEntry, username: string, serverUrl: string): boolean {
  return entry.username === username && entry.serverUrl === serverUrl;
}

/** Return the token currently assigned to an account, if any. */
export async function findCalfeedToken(username: string, serverUrl: string): Promise<{ token: string; entry: CalfeedEntry } | null> {
  const store = await readCalfeedStore();
  for (const [token, entry] of Object.entries(store)) {
    if (sameAccount(entry, username, serverUrl)) return { token, entry };
  }
  return null;
}

/**
 * Create (or regenerate) the token for an account. Any previous token for the
 * same account is dropped, so an old leaked link stops working immediately —
 * the host cron removes the stale .ics on its next run.
 */
export async function issueCalfeedToken(username: string, serverUrl: string): Promise<{ token: string; entry: CalfeedEntry }> {
  const store = await readCalfeedStore();
  for (const [token, entry] of Object.entries(store)) {
    if (sameAccount(entry, username, serverUrl)) delete store[token];
  }
  let token = randomBytes(16).toString('hex');
  while (store[token]) token = randomBytes(16).toString('hex');
  const entry: CalfeedEntry = { username, serverUrl, createdAt: new Date().toISOString() };
  store[token] = entry;
  await writeCalfeedStore(store);
  return { token, entry };
}

/** Revoke every token of an account. Returns how many were removed. */
export async function revokeCalfeedTokens(username: string, serverUrl: string): Promise<number> {
  const store = await readCalfeedStore();
  let removed = 0;
  for (const [token, entry] of Object.entries(store)) {
    if (sameAccount(entry, username, serverUrl)) {
      delete store[token];
      removed++;
    }
  }
  if (removed > 0) await writeCalfeedStore(store);
  return removed;
}

/** Public URL of a feed: the .ics is served by Caddy on the mail host. */
export function calfeedUrl(serverUrl: string, token: string): string {
  return `${serverUrl}/calfeed/${token}.ics`;
}
