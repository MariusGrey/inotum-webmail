import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  calfeedUrl,
  findCalfeedToken,
  isValidCalfeedToken,
  issueCalfeedToken,
  readCalfeedStore,
  revokeCalfeedTokens,
} from '../calfeeds';

describe('inotum calfeeds store', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'calfeeds-'));
    process.env.INOTUM_DATA_DIR = dir;
  });
  afterEach(async () => {
    delete process.env.INOTUM_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it('starts empty when the file does not exist', async () => {
    expect(await readCalfeedStore()).toEqual({});
    expect(await findCalfeedToken('a@inotum.io', 'https://mail.inotum.io')).toBeNull();
  });

  it('issues a 32-hex token and persists it', async () => {
    const { token } = await issueCalfeedToken('a@inotum.io', 'https://mail.inotum.io');
    expect(isValidCalfeedToken(token)).toBe(true);
    const raw = JSON.parse(await readFile(path.join(dir, 'calfeeds.json'), 'utf8'));
    expect(raw[token].username).toBe('a@inotum.io');
    const found = await findCalfeedToken('a@inotum.io', 'https://mail.inotum.io');
    expect(found?.token).toBe(token);
    expect(calfeedUrl('https://mail.inotum.io', token)).toBe(`https://mail.inotum.io/calfeed/${token}.ics`);
  });

  it('regenerating drops the previous token of the same account only', async () => {
    const a1 = await issueCalfeedToken('a@inotum.io', 'https://mail.inotum.io');
    const b = await issueCalfeedToken('b@inotum.it', 'https://mail.inotum.it');
    const a2 = await issueCalfeedToken('a@inotum.io', 'https://mail.inotum.io');
    const store = await readCalfeedStore();
    expect(Object.keys(store).sort()).toEqual([a2.token, b.token].sort());
    expect(a1.token).not.toBe(a2.token);
  });

  it('same username on a different server is a different account', async () => {
    await issueCalfeedToken('a@inotum.io', 'https://mail.inotum.io');
    await issueCalfeedToken('a@inotum.io', 'https://mail.inotum.it');
    expect(Object.keys(await readCalfeedStore())).toHaveLength(2);
  });

  it('revoke removes every token of the account', async () => {
    await issueCalfeedToken('a@inotum.io', 'https://mail.inotum.io');
    await issueCalfeedToken('b@inotum.io', 'https://mail.inotum.io');
    expect(await revokeCalfeedTokens('a@inotum.io', 'https://mail.inotum.io')).toBe(1);
    expect(await revokeCalfeedTokens('a@inotum.io', 'https://mail.inotum.io')).toBe(0);
    expect(Object.keys(await readCalfeedStore())).toHaveLength(1);
  });

  it('ignores malformed entries when reading', async () => {
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'calfeeds.json'), JSON.stringify({
      'not-a-token': { username: 'x', serverUrl: 'y' },
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': { username: 'ok@inotum.io', serverUrl: 'https://mail.inotum.io' },
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': { username: 42 },
    }));
    const store = await readCalfeedStore();
    expect(Object.keys(store)).toEqual(['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']);
  });
});
