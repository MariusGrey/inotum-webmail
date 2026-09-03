'use client';

/**
 * Inotum fork — Settings → "Configura la tua casella".
 *
 * Personal, pre-filled version of the public /client-setup guide: shows the
 * exact IMAP / SMTP / CalDAV / JMAP parameters for the signed-in account (host
 * derived from the JMAP server the session is connected to, so users of a second
 * domain see their own mail host), a QR code that opens the public guide on a phone with the
 * address pre-filled, and a shortcut to create an app password.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { Check, Copy, KeyRound, Smartphone, Mail, Send, CalendarDays, Globe } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { SettingsSection } from './settings-section';

interface Row {
  label: string;
  value: string;
}

function CopyField({ label, value }: Row) {
  const t = useTranslations('settings.inotum.mailbox_setup');
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* clipboard unavailable */ });
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-mono text-foreground truncate" title={value}>{value}</div>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`${t('copy')} ${label}`}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? t('copied') : t('copy')}
      </button>
    </div>
  );
}

function Block({ icon: Icon, title, rows }: { icon: typeof Mail; title: string; rows: Row[] }) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
      </div>
      <div className="space-y-2">
        {rows.map((r) => <CopyField key={r.label} label={r.label} value={r.value} />)}
      </div>
    </div>
  );
}

export function deriveMailHost(serverUrl: string | null, username: string | null): string {
  try {
    if (serverUrl) return new URL(serverUrl).hostname;
  } catch { /* fall through */ }
  const domain = username?.split('@')[1];
  if (domain) return `mail.${domain}`;
  // last resort: the host we were served from, webmail.<x> -> mail.<x>
  if (typeof window !== 'undefined') return window.location.hostname.replace(/^webmail\./, 'mail.');
  return '';
}

export function InotumMailboxSetup() {
  const t = useTranslations('settings.inotum.mailbox_setup');
  const { username, serverUrl, client } = useAuthStore();
  const address = useMemo(() => client?.getUsername() || username || '', [client, username]);
  const host = useMemo(() => deriveMailHost(serverUrl, address), [serverUrl, address]);
  const guideUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/client-setup?email=${encodeURIComponent(address)}`;
  }, [address]);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(guideUrl, { width: 180, margin: 1 })
      .then((url) => { if (!cancelled) setQr(url); })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [guideUrl]);

  const openAppPasswords = () => {
    window.dispatchEvent(new CustomEvent('settings-tab-change', { detail: 'security' }));
  };

  return (
    <SettingsSection title={t('title')} description={t('description')}>
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">{t('password_title')}</h4>
        </div>
        <p className="text-xs text-muted-foreground">{t('password_desc')}</p>
        <Button size="sm" onClick={openAppPasswords}>
          <KeyRound className="w-4 h-4 mr-1.5" /> {t('password_button')}
        </Button>
      </div>

      <Block
        icon={Mail}
        title={t('imap_title')}
        rows={[
          { label: t('server'), value: host },
          { label: t('port'), value: '993' },
          { label: t('security'), value: 'SSL/TLS' },
          { label: t('username'), value: address },
        ]}
      />
      <Block
        icon={Send}
        title={t('smtp_title')}
        rows={[
          { label: t('server'), value: host },
          { label: t('port'), value: `465 (SSL/TLS) · 587 (STARTTLS)` },
          { label: t('username'), value: address },
        ]}
      />
      <Block
        icon={CalendarDays}
        title={t('dav_title')}
        rows={[
          { label: t('dav_server'), value: `https://${host}` },
          { label: t('username'), value: address },
        ]}
      />
      <Block
        icon={Globe}
        title={t('jmap_title')}
        rows={[
          { label: t('jmap_url'), value: `https://${host}/.well-known/jmap` },
        ]}
      />

      <div className="rounded-lg border border-border p-4 flex flex-wrap items-center gap-4">
        {qr ? (
          <img src={qr} alt={t('qr_alt')} width={180} height={180} className="rounded-md bg-white p-1" />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">{t('qr_title')}</h4>
          </div>
          <p className="text-xs text-muted-foreground">{t('qr_desc')}</p>
          <a href={guideUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline break-all">
            {guideUrl}
          </a>
          <p className="text-xs text-muted-foreground pt-1">{t('autoconfig_note')}</p>
        </div>
      </div>
    </SettingsSection>
  );
}
