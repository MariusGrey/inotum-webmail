#!/usr/bin/env python3
"""
Inotum fork — locale patch.

1. Rebrands the product name in the UI strings (Bulwark → Inotum) for every
   locale, except the strings that talk about *real* Bulwark products the
   fork still relies on (the hosted push relay and the Bulwark mobile app).
2. Adds the Inotum-specific strings (settings.inotum.*, settings.tabs.inotum_setup,
   tour.inotum_*) to `en` and `it`; every other locale falls back to English
   through i18n/merge-messages.ts.

Idempotent: safe to run again after an upstream merge.
"""
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'locales')

REBRAND_PREFIXES = (
    'protocol_handlers.',
    'common.rate_limited_',
    'demo_welcome.title',
    'settings.advanced.about.title',
)
KEEP_BULWARK = (
    'settings.notifications.push.',     # hosted Bulwark push relay
    'settings.security.link_device.',   # Bulwark Mail mobile app
)

EXTRA = {
    'en': {
        'settings': {
            'tabs': {'inotum_setup': 'Set up your mailbox'},
            'inotum': {
                'google_calendar': {
                    'title': 'Google Calendar',
                    'description': 'See your Inotum events in Google Calendar and your Google events in Inotum, in read-only mode, without installing anything.',
                    'to_google_title': 'Inotum → Google Calendar',
                    'to_google_desc': 'Create a secret link to your Inotum calendars and add it to Google Calendar. Google refreshes it on its own (it can take up to 12–24 hours).',
                    'loading': 'Loading…',
                    'link_label': 'Secret calendar link',
                    'create': 'Create my calendar link',
                    'create_hint': 'The link is private: anyone who has it can read your calendar. You can regenerate or revoke it at any time.',
                    'created': 'Calendar link created',
                    'regenerated': 'Calendar link regenerated — the old one no longer works',
                    'regenerate': 'Regenerate',
                    'revoke': 'Revoke',
                    'revoke_confirm': 'Revoke the link? Google Calendar will stop receiving your Inotum events.',
                    'revoked': 'Calendar link revoked',
                    'copy': 'Copy',
                    'copied': 'Copied',
                    'add_to_google': 'Add to Google Calendar',
                    'add_manually': 'Add manually (from URL)',
                    'secret_warning': 'Keep this link secret: it gives read access to your calendar.',
                    'refresh_note': 'The link is refreshed every 30 minutes. New links may take a few minutes before they show data.',
                    'from_google_title': 'Google Calendar → Inotum',
                    'from_google_desc': 'Subscribe to your Google calendar from Inotum. Events stay editable on Google only.',
                    'from_google_step1': 'Open Google Calendar settings and pick the calendar to share.',
                    'open_google_settings': 'Open Google Calendar settings',
                    'from_google_step2': 'Scroll to “Integrate calendar” and copy the “Secret address in iCal format” (ends with .ics).',
                    'from_google_step3': 'Paste it in the subscription dialog below.',
                    'subscribe_button': 'Add Google calendar (from URL)',
                    'google_calendar_name': 'Google Calendar',
                    'error': 'Something went wrong. Please try again.',
                },
                'mailbox_setup': {
                    'title': 'Set up your mailbox',
                    'description': 'Everything you need to use this address in Outlook, Apple Mail, Thunderbird or on your phone.',
                    'password_title': 'Use an app password',
                    'password_desc': 'Do not type your main password into mail apps: create a dedicated app password (you can revoke it any time) and use it in the app.',
                    'password_button': 'Create an app password',
                    'imap_title': 'Incoming mail (IMAP)',
                    'smtp_title': 'Outgoing mail (SMTP)',
                    'dav_title': 'Calendar and contacts (CalDAV / CardDAV)',
                    'jmap_title': 'JMAP',
                    'server': 'Server',
                    'port': 'Port',
                    'security': 'Security',
                    'username': 'Username',
                    'dav_server': 'Server address',
                    'jmap_url': 'JMAP session URL',
                    'copy': 'Copy',
                    'copied': 'Copied',
                    'qr_title': 'Set up on your phone',
                    'qr_desc': 'Scan the QR code to open the step-by-step guide with your address already filled in.',
                    'qr_alt': 'QR code of the setup guide',
                    'autoconfig_note': 'Most apps (Thunderbird, Apple Mail, Outlook) detect these settings automatically: just enter your address and the app password.',
                },
            },
        },
        'tour': {
            'inotum_apps_title': 'Inotum tools',
            'inotum_apps_desc': 'Here you find the Inotum shortcuts: sync with Google Calendar and set up your mailbox on other devices.',
        },
    },
    'it': {
        'settings': {
            'tabs': {'inotum_setup': 'Configura la tua casella'},
            'inotum': {
                'google_calendar': {
                    'title': 'Google Calendar',
                    'description': 'Vedi gli eventi Inotum dentro Google Calendar e gli eventi Google dentro Inotum, in sola lettura, senza installare nulla.',
                    'to_google_title': 'Inotum → Google Calendar',
                    'to_google_desc': 'Crea un link segreto ai tuoi calendari Inotum e aggiungilo a Google Calendar. Google lo aggiorna da solo (può impiegare fino a 12–24 ore).',
                    'loading': 'Caricamento…',
                    'link_label': 'Link segreto del calendario',
                    'create': 'Crea il mio link calendario',
                    'create_hint': 'Il link è privato: chi lo possiede può leggere il tuo calendario. Puoi rigenerarlo o revocarlo in qualsiasi momento.',
                    'created': 'Link calendario creato',
                    'regenerated': 'Link calendario rigenerato: quello vecchio non funziona più',
                    'regenerate': 'Rigenera',
                    'revoke': 'Revoca',
                    'revoke_confirm': 'Revocare il link? Google Calendar smetterà di ricevere i tuoi eventi Inotum.',
                    'revoked': 'Link calendario revocato',
                    'copy': 'Copia',
                    'copied': 'Copiato',
                    'add_to_google': 'Aggiungi a Google Calendar',
                    'add_manually': 'Aggiungi manualmente (da URL)',
                    'secret_warning': 'Tieni segreto questo link: dà accesso in lettura al tuo calendario.',
                    'refresh_note': 'Il link si aggiorna ogni 30 minuti. Un link appena creato può impiegare qualche minuto prima di mostrare i dati.',
                    'from_google_title': 'Google Calendar → Inotum',
                    'from_google_desc': 'Sottoscrivi il tuo calendario Google da Inotum. Gli eventi restano modificabili solo su Google.',
                    'from_google_step1': 'Apri le impostazioni di Google Calendar e scegli il calendario da condividere.',
                    'open_google_settings': 'Apri impostazioni Google Calendar',
                    'from_google_step2': 'Scorri fino a «Integra il calendario» e copia l’«Indirizzo segreto in formato iCal» (finisce con .ics).',
                    'from_google_step3': 'Incollalo nella finestra di sottoscrizione qui sotto.',
                    'subscribe_button': 'Aggiungi calendario Google (da URL)',
                    'google_calendar_name': 'Google Calendar',
                    'error': 'Qualcosa è andato storto. Riprova.',
                },
                'mailbox_setup': {
                    'title': 'Configura la tua casella',
                    'description': 'Tutto quello che serve per usare questo indirizzo in Outlook, Apple Mail, Thunderbird o sul telefono.',
                    'password_title': 'Usa una password per le app',
                    'password_desc': 'Non inserire la password principale nelle app di posta: crea una password dedicata (revocabile in qualsiasi momento) e usa quella nell’app.',
                    'password_button': 'Crea una password per le app',
                    'imap_title': 'Posta in arrivo (IMAP)',
                    'smtp_title': 'Posta in uscita (SMTP)',
                    'dav_title': 'Calendario e contatti (CalDAV / CardDAV)',
                    'jmap_title': 'JMAP',
                    'server': 'Server',
                    'port': 'Porta',
                    'security': 'Sicurezza',
                    'username': 'Nome utente',
                    'dav_server': 'Indirizzo del server',
                    'jmap_url': 'URL sessione JMAP',
                    'copy': 'Copia',
                    'copied': 'Copiato',
                    'qr_title': 'Configura sul telefono',
                    'qr_desc': 'Inquadra il codice QR per aprire la guida passo-passo con il tuo indirizzo già compilato.',
                    'qr_alt': 'Codice QR della guida di configurazione',
                    'autoconfig_note': 'La maggior parte delle app (Thunderbird, Apple Mail, Outlook) rileva queste impostazioni da sola: basta inserire l’indirizzo e la password per le app.',
                },
            },
        },
        'tour': {
            'inotum_apps_title': 'Strumenti Inotum',
            'inotum_apps_desc': 'Qui trovi le scorciatoie Inotum: sincronizza Google Calendar e configura la tua casella sugli altri dispositivi.',
        },
    },
}


def rebrand(obj, path=''):
    changed = 0
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f'{path}.{k}' if path else k
            if isinstance(v, str):
                if 'Bulwark' in v and p.startswith(REBRAND_PREFIXES) and not p.startswith(KEEP_BULWARK):
                    nv = v.replace('Bulwark Webmail', 'Inotum Webmail').replace('Bulwark Mail', 'Inotum Mail').replace('Bulwark', 'Inotum')
                    if nv != v:
                        obj[k] = nv
                        changed += 1
            else:
                changed += rebrand(v, p)
    return changed


def fill_missing(dst, src):
    """Copia da `src` solo le chiavi che mancano in `dst`, senza toccare le traduzioni."""
    for k, v in src.items():
        if isinstance(v, dict):
            if not isinstance(dst.get(k), dict):
                dst[k] = {}
            fill_missing(dst[k], v)
        elif k not in dst:
            dst[k] = v


def deep_merge(dst, src):
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            deep_merge(dst[k], v)
        else:
            dst[k] = v


def main():
    total = 0
    for loc in sorted(os.listdir(ROOT)):
        f = os.path.join(ROOT, loc, 'common.json')
        if not os.path.isfile(f):
            continue
        with open(f, encoding='utf-8') as fh:
            data = json.load(fh)
        n = rebrand(data)
        if loc in EXTRA:
            deep_merge(data, EXTRA[loc])
            n += 1
        else:
            # Ogni locale deve avere tutte le chiavi di `en` (lo verifica
            # lib/__tests__/translations.test.ts): le lingue non tradotte
            # ricevono il testo inglese, che è anche il fallback a runtime.
            before = json.dumps(data, sort_keys=True)
            fill_missing(data, EXTRA['en'])
            if json.dumps(data, sort_keys=True) != before:
                n += 1
        if n:
            with open(f, 'w', encoding='utf-8') as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)
                fh.write('\n')
            total += n
            print(f'{loc}: {n} change(s)')
    print(f'done: {total}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
