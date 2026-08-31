# Fork Inotum della webmail Bulwark

Fork di [bulwarkmail/webmail](https://github.com/bulwarkmail/webmail) (AGPL-3.0), la webmail
JMAP usata da **Inotum Mail**. Base: **v1.9.2**, la stessa versione in produzione.

## Stato: IN PRODUZIONE (immagine `inotum-webmail:1.9.2-inotum.3`)

Base: `bulwarkmail/webmail` main (v1.9.2 + #931). Prima motivazione del fork: l'immagine
ufficiale pinnata era piu' vecchia del sorgente e non conteneva le app sidebar
dell'operatore (#931), necessarie al progetto.

## Modifiche rispetto a upstream (branch `inotum-brand`)

| File | Modifica |
|---|---|
| `components/pwa-install-prompt.tsx` | la X rimanda il banner "installa app" di 24 ore (prima riappariva a ogni navigazione); `appinstalled` + display-mode standalone lo nascondono per sempre ad app installata |
| `lib/favicon-badge.ts` | badge non-letti nel blu brand `#1766c0` (contrasto ~5:1) al posto del rosso; normalizzazione difensiva dei data URI `data:img/*` malformati nei loghi (altrimenti il favicon composto perde il raster) |
| `lib/__tests__/favicon-badge.test.ts` | aspettative aggiornate al nuovo colore |
| `components/layout/navigation-rail.tsx` | logo nel rail a 40px (era 32) |

Il branding resta via env (`APP_NAME`, `APP_LOGO_*`, `DOMAIN_BRANDING`); le app sidebar
per tutti gli utenti via `policy.json` (`defaultSidebarApps`).

## Prossime evoluzioni candidate

- link del feed calendario (`/calfeed/<token>.ics`) nelle impostazioni utente
- endpoint JMAP per dominio (`webmail.<dominio>` -> `mail.<dominio>`)
- sync per-account delle app sidebar aggiunte dall'utente (oggi localStorage)
- relay push self-hosted

## Build

```bash
docker build -t inotum-webmail:1.9.2-inotum.N .
```
Poi aggiornare l'immagine in `compose.yaml` sul server, con tag fissato (mai `latest`).

## Aggiornamenti da upstream

```bash
git remote add upstream https://github.com/bulwarkmail/webmail.git
git fetch upstream && git rebase upstream/main
```

## 1.9.2-inotum.6 (2026-08-31)

Evoluzioni Inotum: le prime funzioni vere del fork, non solo branding.

| Area | File | Cosa fa |
| --- | --- | --- |
| Calendario | `lib/inotum/calfeeds.ts`, `lib/inotum/identity.ts`, `app/api/inotum/calfeed/route.ts`, `components/settings/inotum-google-calendar.tsx` | L'utente crea/rigenera/revoca da solo il link .ics segreto dei propri calendari e lo aggiunge a Google Calendar in un clic; nella stessa scheda la direzione opposta (sottoscrizione al calendario Google). Store JSON in `/app/data/inotum/calfeeds.json`, identita' verificata come in `/api/settings`. |
| Configurazione client | `components/settings/inotum-mailbox-setup.tsx` | Scheda "Configura la tua casella" con IMAP/SMTP/CalDAV/JMAP gia' compilati per l'account, QR per il telefono, scorciatoia alle password per le app. Host derivato dal server JMAP della sessione (multi-dominio). |
| Localizzazione | `scripts/inotum-locales.py` | Rebranding Bulwark→Inotum su 27 lingue (esclusi i riferimenti al relay push e all'app mobile reali di Bulwark) + stringhe nuove it/en. Idempotente: rieseguirlo dopo ogni merge da upstream. |
| Tour | `components/tour/tour-steps.ts`, `tour-provider.tsx`, `components/layout/navigation-rail.tsx` | Passo del tour sulle app Inotum fissate dalla policy (`data-tour="app-<id>"` su rail e barra mobile), saltato se non ce n'e' nessuna. |

Test: `lib/inotum/__tests__/calfeeds.test.ts` (6), `components/tour/__tests__/inotum-tour-steps.test.ts` (3), typecheck pulito, eslint pulito sui file toccati.

Lato host (repo mailserver, non in questo fork): `ops/gcal-export.py` legge il JSON e
esporta i calendari con le credenziali dell'amministratore Stalwart, cancellando i feed
dei token revocati.
