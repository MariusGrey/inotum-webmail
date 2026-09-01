import { describe, expect, it } from 'vitest';
import { findServerByHostname } from '../jmap-servers';

const SERVERS = [
  { id: 'io', domains: ['inotum.io'] },
  { id: 'it', domains: ['inotum.it'] },
  { id: 'com', domains: ['inotum.com'] },
];

describe('findServerByHostname', () => {
  it('riconosce il prefisso webmail.', () => {
    expect(findServerByHostname(SERVERS, 'webmail.inotum.it')?.id).toBe('it');
    expect(findServerByHostname(SERVERS, 'webmail.inotum.com')?.id).toBe('com');
  });

  it('riconosce anche mail. e posta. e il dominio nudo', () => {
    expect(findServerByHostname(SERVERS, 'mail.inotum.io')?.id).toBe('io');
    expect(findServerByHostname(SERVERS, 'posta.inotum.io')?.id).toBe('io');
    expect(findServerByHostname(SERVERS, 'inotum.com')?.id).toBe('com');
  });

  it('ignora maiuscole, punto finale e porta', () => {
    expect(findServerByHostname(SERVERS, 'WebMail.Inotum.IT.')?.id).toBe('it');
    expect(findServerByHostname(SERVERS, 'webmail.inotum.it:3000')?.id).toBe('it');
  });

  it('non inventa un server quando l_host non corrisponde', () => {
    expect(findServerByHostname(SERVERS, 'webmail.altrodominio.tld')).toBeNull();
    expect(findServerByHostname(SERVERS, '')).toBeNull();
    expect(findServerByHostname(SERVERS, null)).toBeNull();
    expect(findServerByHostname(SERVERS, 'inotum.io.malefico.tld')).toBeNull();
  });

  it('non confonde un sottodominio diverso da un prefisso di servizio', () => {
    expect(findServerByHostname(SERVERS, 'altro.inotum.io')).toBeNull();
  });
});
