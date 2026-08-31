/**
 * Inotum fork — shared identity verification for Inotum-specific API routes.
 *
 * Mirrors the check used by /api/settings: the client sends the identity it
 * claims (`x-settings-username` / `x-settings-server`) and we only accept it
 * when one of the session cookies (basic-auth session or Stalwart auth
 * context, across all account slots) carries exactly that identity.
 */
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { decryptSession } from '@/lib/auth/crypto';
import { sessionCookieName } from '@/lib/auth/session-cookie';
import { readStalwartAuthContextFromStore } from '@/lib/stalwart/auth-context';
import { MAX_ACCOUNT_SLOTS } from '@/lib/account-utils';

export interface InotumIdentity {
  username: string;
  serverUrl: string;
}

export function normalizeServerUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

async function verifyIdentity(username: string, serverUrl: string): Promise<boolean> {
  const cookieStore = await cookies();
  const normalized = normalizeServerUrl(serverUrl);

  for (let slot = 0; slot < MAX_ACCOUNT_SLOTS; slot++) {
    const token = cookieStore.get(sessionCookieName(slot))?.value;
    if (token) {
      const session = decryptSession(token);
      if (session && session.username === username && normalizeServerUrl(session.serverUrl) === normalized) {
        return true;
      }
    }
    const ctx = readStalwartAuthContextFromStore(cookieStore, slot);
    if (ctx && ctx.username === username && normalizeServerUrl(ctx.serverUrl) === normalized) {
      return true;
    }
  }
  return false;
}

/**
 * Read the claimed identity from the request headers and verify it against
 * the session cookies. Returns `null` when the headers are missing or the
 * claim does not match any signed-in slot.
 */
export async function requireInotumIdentity(request: NextRequest): Promise<InotumIdentity | null> {
  const username = request.headers.get('x-settings-username');
  const serverUrl = request.headers.get('x-settings-server');
  if (!username || !serverUrl) return null;
  if (!(await verifyIdentity(username, serverUrl))) return null;
  return { username, serverUrl: normalizeServerUrl(serverUrl) };
}
