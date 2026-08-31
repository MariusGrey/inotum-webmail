'use client';

/**
 * Inotum fork — Settings → Calendario → "Google Calendar".
 *
 * Two directions, both without leaving the webmail:
 *   • Inotum → Google: the user creates a secret link (calfeed) that the host
 *     exports every 30 minutes; a one-click button opens Google Calendar with
 *     the link pre-filled ("Add calendar from URL").
 *   • Google → Inotum: opens the built-in iCal subscription dialog, with a
 *     short reminder of where to find the "secret address in iCal format".
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, ExternalLink, Link2, Loader2, RefreshCw, Trash2, CalendarPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from '@/lib/browser-navigation';
import { toast } from '@/stores/toast-store';
import { Button } from '@/components/ui/button';
import { ICalSubscriptionModal } from '@/components/calendar/ical-subscription-modal';
import { SettingsSection } from './settings-section';

interface Feed {
  url: string;
  createdAt: string;
}

const GOOGLE_SETTINGS_URL = 'https://calendar.google.com/calendar/u/0/r/settings';
const GOOGLE_ADD_BY_URL = 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl';

function googleOneClickUrl(feedUrl: string): string {
  // Google Calendar accepts an external iCal URL as `cid` and opens the
  // "add calendar" confirmation with it pre-filled.
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;
}

export function InotumGoogleCalendarSettings() {
  const t = useTranslations('settings.inotum.google_calendar');
  const { username, serverUrl, client } = useAuthStore();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);

  const headers = useCallback((): Record<string, string> => ({
    'x-settings-username': username ?? '',
    'x-settings-server': serverUrl ?? '',
  }), [username, serverUrl]);

  const load = useCallback(async () => {
    if (!username || !serverUrl) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/api/inotum/calfeed', { headers: headers() });
      if (res.ok) {
        const body = await res.json();
        setFeed(body.feed ?? null);
      } else {
        setFeed(null);
      }
    } catch {
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }, [username, serverUrl, headers]);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const res = await apiFetch('/api/inotum/calfeed', { method: 'POST', headers: headers() });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      setFeed(body.feed);
      toast.success(feed ? t('regenerated') : t('created'));
    } catch {
      toast.error(t('error'));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm(t('revoke_confirm'))) return;
    setBusy(true);
    try {
      const res = await apiFetch('/api/inotum/calfeed', { method: 'DELETE', headers: headers() });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setFeed(null);
      toast.success(t('revoked'));
    } catch {
      toast.error(t('error'));
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    if (!feed) return;
    navigator.clipboard.writeText(feed.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error(t('error')));
  };

  return (
    <SettingsSection title={t('title')} description={t('description')}>
      {/* Inotum → Google */}
      <div className="rounded-lg border border-border p-4 space-y-3" data-testid="inotum-calfeed">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-foreground">{t('to_google_title')}</h4>
        </div>
        <p className="text-xs text-muted-foreground">{t('to_google_desc')}</p>

        {loading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('loading')}
          </div>
        ) : feed ? (
          <div className="space-y-3">
            <div className="flex rounded-lg">
              <input
                type="text"
                readOnly
                value={feed.url}
                aria-label={t('link_label')}
                className="py-2 px-3 block w-full bg-background border border-border border-e-transparent rounded-s-lg text-sm text-foreground focus:z-10 focus:border-ring focus:ring-ring"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={copy}
                className="h-[38px] px-3 shrink-0 inline-flex items-center gap-1.5 rounded-e-lg border border-border bg-muted text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? t('copied') : t('copy')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={googleOneClickUrl(feed.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <CalendarPlus className="w-4 h-4" /> {t('add_to_google')}
              </a>
              <a
                href={GOOGLE_ADD_BY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <ExternalLink className="w-4 h-4" /> {t('add_manually')}
              </a>
              <Button size="sm" variant="ghost" onClick={create} disabled={busy}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> {t('regenerate')}
              </Button>
              <Button size="sm" variant="ghost" onClick={revoke} disabled={busy} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-1.5" /> {t('revoke')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('secret_warning')}</p>
            <p className="text-xs text-muted-foreground">{t('refresh_note')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Button size="sm" onClick={create} disabled={busy || !username}>
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Link2 className="w-4 h-4 mr-1.5" />}
              {t('create')}
            </Button>
            <p className="text-xs text-muted-foreground">{t('create_hint')}</p>
          </div>
        )}
      </div>

      {/* Google → Inotum */}
      <div className="rounded-lg border border-border p-4 space-y-3" data-testid="inotum-google-subscribe">
        <div className="flex items-center gap-2">
          <CalendarPlus className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-foreground">{t('from_google_title')}</h4>
        </div>
        <p className="text-xs text-muted-foreground">{t('from_google_desc')}</p>
        <ol className="list-decimal ps-5 text-xs text-muted-foreground space-y-1">
          <li>
            {t('from_google_step1')}{' '}
            <a href={GOOGLE_SETTINGS_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {t('open_google_settings')}
            </a>
          </li>
          <li>{t('from_google_step2')}</li>
          <li>{t('from_google_step3')}</li>
        </ol>
        <Button size="sm" variant="outline" onClick={() => setShowSubscribe(true)} disabled={!client}>
          <CalendarPlus className="w-4 h-4 mr-1.5" /> {t('subscribe_button')}
        </Button>
      </div>

      {showSubscribe && client && (
        <ICalSubscriptionModal
          client={client}
          initialName={t('google_calendar_name')}
          onClose={() => setShowSubscribe(false)}
        />
      )}
    </SettingsSection>
  );
}
