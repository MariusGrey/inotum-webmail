/**
 * Inotum fork — /api/inotum/calfeed
 *
 * Lets a signed-in user manage the secret iCalendar link of their own
 * calendars (used for "Inotum → Google Calendar").
 *
 *   GET    → { feed: { url, createdAt } | null }
 *   POST   → creates or regenerates the link → { feed }
 *   DELETE → revokes the link → { revoked: n }
 *
 * Identity is claimed via the same headers as settings sync
 * (x-settings-username / x-settings-server) and verified against the session
 * cookies, so a user can only ever touch their own link.
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireInotumIdentity } from '@/lib/inotum/identity';
import { calfeedUrl, findCalfeedToken, issueCalfeedToken, revokeCalfeedTokens } from '@/lib/inotum/calfeeds';

export const dynamic = 'force-dynamic';

function fail(error: unknown, what: string) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const code = (error as NodeJS.ErrnoException).code;
  logger.error(`Inotum calfeed ${what} error`, { error: message, code });
  const status = code === 'EACCES' || code === 'EPERM' || code === 'EROFS' ? 500 : code === 'ENOSPC' ? 507 : 500;
  return NextResponse.json({ error: `Calfeed ${what} failed: ${message}` }, { status });
}

export async function GET(request: NextRequest) {
  const id = await requireInotumIdentity(request);
  if (!id) return NextResponse.json({ error: 'Identity mismatch' }, { status: 403 });
  try {
    const found = await findCalfeedToken(id.username, id.serverUrl);
    return NextResponse.json({
      feed: found ? { url: calfeedUrl(id.serverUrl, found.token), createdAt: found.entry.createdAt } : null,
    });
  } catch (error) {
    return fail(error, 'read');
  }
}

export async function POST(request: NextRequest) {
  const id = await requireInotumIdentity(request);
  if (!id) return NextResponse.json({ error: 'Identity mismatch' }, { status: 403 });
  try {
    const { token, entry } = await issueCalfeedToken(id.username, id.serverUrl);
    logger.info('Inotum calfeed issued', { username: id.username });
    return NextResponse.json({ feed: { url: calfeedUrl(id.serverUrl, token), createdAt: entry.createdAt } });
  } catch (error) {
    return fail(error, 'create');
  }
}

export async function DELETE(request: NextRequest) {
  const id = await requireInotumIdentity(request);
  if (!id) return NextResponse.json({ error: 'Identity mismatch' }, { status: 403 });
  try {
    const revoked = await revokeCalfeedTokens(id.username, id.serverUrl);
    logger.info('Inotum calfeed revoked', { username: id.username, revoked });
    return NextResponse.json({ revoked });
  } catch (error) {
    return fail(error, 'revoke');
  }
}
