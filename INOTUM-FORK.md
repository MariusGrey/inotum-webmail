# Fork Inotum della webmail Bulwark

Fork di [bulwarkmail/webmail](https://github.com/bulwarkmail/webmail) (AGPL-3.0), la webmail
JMAP usata da **Inotum Mail**. Base: **v1.9.2**, la stessa versione in produzione.

## Stato: IN PRODUZIONE dal 30/08 (immagine inotum-webmail:1.9.2-inotum.1)

Motivo del passaggio: l'immagine ufficiale pinnata era piu' vecchia di main e non
conteneva le app sidebar dell'operatore (#931), richieste dal progetto. Nessuna
modifica al codice: build di main. Le prossime modifiche funzionali partiranno da qui.

In produzione gira ancora l'immagine ufficiale. Il fork esiste per:

1. avere una base pubblica pronta quando serviranno modifiche non ottenibili da configurazione;
2. rispettare l'AGPL nel momento in cui distribuiremo una versione modificata.

**Non serve forkare per il branding**: l'immagine ufficiale lo copre già via variabili
d'ambiente (`APP_NAME`, `APP_LOGO_LIGHT_URL`, `APP_LOGO_DARK_URL`, favicon) e, per il
multi-dominio, via `DOMAIN_BRANDING` — un JSON che assegna nome e logo diversi a ogni
hostname (`webmail.inotum.io`, `webmail.inotum.it`, domini dei clienti…).

## Modifiche previste quando il fork entrerà in produzione

- **App della barra laterale predefinite**: oggi ogni utente deve aggiungersele da sé
  (es. la pagina "Sincronizza Google Calendar"). Serve un default a livello di istanza.
- **Campo "link calendario"**: mostrare all'utente il proprio feed ICS
  (`https://mail.inotum.io/calfeed/<token>.ics`) direttamente nelle impostazioni,
  invece di inviarglielo via email.
- **Endpoint JMAP per dominio**: far puntare `webmail.<dominio>` al proprio
  `mail.<dominio>` invece che sempre a `mail.inotum.io` (white-label completo).

## Build

```bash
docker build -t ghcr.io/mariusgrey/inotum-webmail:1.9.2 .
```
Poi aggiornare l'immagine in `compose.yaml` sul server, con tag fissato (mai `latest`).

## Aggiornamenti da upstream

```bash
git remote add upstream https://github.com/bulwarkmail/webmail.git
git fetch upstream && git rebase upstream/main
```
