# TSV Pilsting · Dart-App

Eine kleine, mobil-first Web-App für die Dartabteilung des TSV Pilsting e.V. —
reines HTML/CSS/JavaScript, kein Build-Prozess, kein Framework, direkt per
GitHub Pages hostbar.

## Beschreibung

Die App bündelt alles rund um den Dart-Spielbetrieb des Vereins: Termine,
Mannschaften, interne Turniere, die Marktmeisterschaft und schöne
Ergebnis-Grafiken für Social Media — erreichbar über eine feste
Bottom-Navigation mit fünf Hauptbereichen.

## Seitenübersicht

| Datei                     | Tab      | Beschreibung                                                        |
|---------------------------|----------|----------------------------------------------------------------------|
| `index.html`              | Home     | Startseite mit Überblick, Schnellzugriffen und aktuellen Hinweisen   |
| `termine.html`             | Termine  | Spiele, Training, Events, Busreservierung (Grundgerüst)              |
| `teams.html`               | Teams    | Die 4 Mannschaften, Verfügbarkeiten, Ersatzspielerpool (Grundgerüst)  |
| `sport.html`               | Sport    | Sport-Dashboard: verlinkt Turnier, Archiv, Marktmeisterschaft, Spielergebnis; zeigt Liga-Tabelle &amp; letzte Ergebnisse (siehe Liga-Crawler unten) |
| `verein.html`              | Verein   | News, Dokumente, Mitglieder, Sponsoren, Helfereinsätze, Einstellungen (Grundgerüst) |
| `turnier.html`             | *(Sport)*| Internes Turnier durchführen — Gruppenphase/Direkt-K.O., Auslosung, K.O.-Baum, Archivierung |
| `archiv.html`              | *(Sport)*| Gespeicherte Turniere ansehen (Tabellen, K.O.-Baum, alle Spiele)      |
| `marktmeisterschaft.html`  | *(Sport)*| Live-Wertung/Anzeige der Marktmeisterschaft                          |
| `spielergebnis.html`       | *(Sport)*| Ergebnis-Grafik für Instagram &amp; Co. erstellen                    |

Die vier zuletzt genannten Seiten existierten bereits vor diesem
Grundgerüst und wurden **nicht verändert oder gelöscht** — sie sind über die
Schnellzugriffe auf der Startseite sowie über `sport.html` erreichbar.
`turnier.html` und `archiv.html` binden zusätzlich die neue Bottom-Navigation
ein (gleiches Farbschema, geringes Risiko). `marktmeisterschaft.html`
(Kiosk-/TV-Anzeige im festen 100vh-Layout) und `spielergebnis.html`
(Bild-Generator im festen Format) behalten bewusst nur einen
Zurück-Button, um ihr bestehendes, fein abgestimmtes Layout nicht zu
gefährden.

## Dateistruktur

```
/
├── index.html
├── termine.html
├── teams.html
├── sport.html
├── verein.html
├── turnier.html
├── archiv.html
├── marktmeisterschaft.html
├── spielergebnis.html
├── css/
│   └── style.css        # gemeinsames Design-System der neuen Seiten
├── js/
│   ├── app.js             # Bottom-Nav-Erkennung, Filter, RSVP-Buttons, Helfer
│   └── liga-data.js       # lädt/rendert die Crawler-Daten in die HTML-Seiten
├── assets/
│   ├── icons/
│   │   └── frosch.png     # Vereins-Maskottchen (Nav-Icon "Verein")
│   ├── images/
│   ├── logo.png
│   └── favicon.png
│
├── package.json, tsconfig.json   # Liga-Daten-Crawler (Node.js/TypeScript)
├── src/                          # Crawler-Quellcode, siehe Abschnitt unten
├── data/
│   ├── raw/               # rohe HTML-Seiten je Mannschaft (nicht committed)
│   ├── parsed/             # *** wird von der App gelesen *** (committed)
│   └── cache/              # HTTP-Cache (nicht committed)
├── .github/workflows/crawl.yml   # täglicher Crawl-Lauf via GitHub Actions
│
└── README.md
```

## Lokales Öffnen

Kein Build nötig — die App ist reines HTML/CSS/JS. Am einfachsten lokal über
einen kleinen Webserver öffnen (direktes `file://`-Öffnen funktioniert meist
auch, aber ein Server vermeidet Pfad-/CORS-Eigenheiten):

```bash
python3 -m http.server 8000
# dann im Browser: http://localhost:8000/index.html
```

## GitHub Pages Deployment

1. Repository auf GitHub pushen (dieser Ordner ist bereits das Projekt-Root).
2. Im Repository zu **Settings → Pages** gehen.
3. Unter **Branch** `main` und als Ordner **/root** auswählen, speichern.
4. Nach kurzer Zeit ist die App unter der von GitHub angezeigten
   `https://<user>.github.io/<repo>/`-URL erreichbar (`index.html` ist die
   Startseite).

## Liga-Daten-Crawler

Ein separates Node.js/TypeScript-Projekt (`src/`), das öffentlich zugängliche
Daten (Spielplan, Tabelle, Ergebnisse) von der nuLiga-Plattform des
Bayerischen Dart-Verbandes (`https://bdv-dart.liga.nu/`) abruft und als
JSON-Dateien unter `data/parsed/` ablegt. Die HTML-App liest diese Dateien
direkt (siehe „Integration in die HTML-App“ weiter unten) — es gibt kein
Backend, keine Datenbank.

### ⚖️ Rechtlicher Hinweis — bitte unbedingt beachten

Dieser Crawler ruft **ausschließlich öffentlich zugängliche Seiten** ab:
Spielplan, Tabelle, Ergebnisse. Er automatisiert **keinen Login**, umgeht
**keine Captchas** und ruft **keine passwortgeschützten Vereinsbereiche**
ab (Ergebniserfassung, Mitgliederdaten, Mannschaftsmeldungen etc.).

- robots.txt wird zur Laufzeit geprüft; von robots.txt gesperrte Pfade
  werden übersprungen und geloggt, nicht umgangen.
- Es werden nur die in `src/config/teams.config.ts` explizit hinterlegten
  URLs abgerufen — keine automatische Linkverfolgung/"Crawling" darüber
  hinaus.
- Requests laufen mit Verzögerung (Rate-Limiter) und eigenem, transparentem
  User-Agent (siehe `src/crawler/httpClient.ts`).
- Ergebnisse werden gecacht, um wiederholte Requests zu vermeiden.
- Falls eine Seite nicht öffentlich erreichbar ist (z. B. durch robots.txt
  gesperrt oder einen Login erfordert), meldet der Crawler:
  *"Diese Daten sind nicht öffentlich verfügbar und werden nicht
  abgerufen."* und macht mit den übrigen Mannschaften weiter.
- Es werden keine personenbezogenen Daten gespeichert, die über den
  sportlichen Kontext (Spielername + Ergebnis, öffentlich einsehbar)
  hinausgehen.

Bitte passe `src/crawler/httpClient.ts` (`USER_AGENT`) auf eine echte
Kontaktmöglichkeit des Vereins an, bevor der Crawler produktiv/regelmäßig
läuft (z. B. GitHub Actions), damit der Verband bei Rückfragen jemanden
erreichen kann.

### Installation

```bash
npm install
```

### Konfiguration der Mannschafts-URLs

Alle Mannschafts-URLs werden zentral in `src/config/teams.config.ts`
gepflegt — der Crawler selbst enthält keine hartkodierten URLs oder Namen.

Für jede Mannschaft eintragen:

```ts
{
  id: 'team-1',
  name: '1. Mannschaft',
  displayName: '1. Mannschaft',
  clubTeamName: 'TSV Pilsting 1', // exakt wie auf liga.nu, s.u.!
  ligaNuTeamUrl: 'https://bdv-dart.liga.nu/...',
  scheduleUrl: 'https://bdv-dart.liga.nu/...',
  tableUrl: 'https://bdv-dart.liga.nu/...',
  resultsUrl: 'https://bdv-dart.liga.nu/...',
  season: '2026/2027',
}
```

So findest du die URLs: Auf `https://bdv-dart.liga.nu/` **ohne Login**
zu Verband → Liga → Mannschaft navigieren und die URLs für
Spielplan/Tabelle/Ergebnisse aus der Adresszeile kopieren.

**Wichtig:** `clubTeamName` muss der Name sein, wie er auf liga.nu in den
Tabellen erscheint (z. B. "TSV Pilsting 1" oder "TSV Pilsting I") — nicht
die interne App-Bezeichnung "1. Mannschaft". Er wird für die
Heim/Auswärts-Erkennung benötigt. Solange ein Team noch Platzhalter-Werte
(`HIER_...`) enthält, wird es beim Crawl automatisch übersprungen (mit
Warnung) statt einen fehlerhaften Request auszulösen.

### Crawler starten

```bash
npm run crawl          # normaler Lauf gegen bdv-dart.liga.nu
npm run crawl:debug    # wie oben, mit ausführlichem Debug-Logging
npm run parse:local    # parst nur bereits gespeichertes data/raw neu,
                       # OHNE die Webseite erneut aufzurufen
npm run typecheck      # TypeScript-Typprüfung ohne Ausgabe
```

Nach einem Lauf liegen die Ergebnisse unter `data/parsed/` (siehe
„Datenformat“) sowie — sofern nicht per `.gitignore` ausgeschlossen — das
abgerufene Roh-HTML unter `data/raw/` und der HTTP-Cache unter
`data/cache/`.

### Debug-Modus

`DEBUG=true` (bzw. `npm run crawl:debug`) schaltet ausführlichere Logs frei:
Parser-Entscheidungen (welche Tabelle/Spalten erkannt wurden), Cache-Treffer,
Retry-Versuche. Ohne Debug-Modus werden nur Info/Warn/Error-Zeilen sowie die
Zusammenfassung am Ende ausgegeben.

### GitHub Actions aktivieren

Die Workflow-Datei `.github/workflows/crawl.yml` ist bereits enthalten und
läuft automatisch:

- **täglich um 06:00 Uhr** (Cron `0 5 * * *` UTC)
- **manuell** über den Reiter *Actions → Liga-Daten crawlen → Run workflow*

Voraussetzungen:

1. Unter **Settings → Actions → General → Workflow permissions** muss
   *"Read and write permissions"* aktiviert sein, damit der Workflow
   Änderungen an `data/parsed/` committen darf.
2. Sonst ist keine weitere Einrichtung nötig — `npm ci` + `npm run crawl`
   laufen im Workflow automatisch, geänderte Dateien werden mit der
   Commit-Message `chore: update liga data` gepusht.

### Datenformat

Alle Dateien liegen unter `data/parsed/`:

| Datei | Inhalt |
|---|---|
| `schedules.json` | alle `ScheduleEntry` aller Mannschaften (Spielplan) |
| `standings.json` | alle `StandingEntry` aller Mannschaften (Tabelle) |
| `results.json` | alle `MatchResult` aller Mannschaften (Ergebnisse) |
| `teams.json` | ein `TeamRecord` pro Mannschaft |
| `last-updated.json` | Zeitstempel + Zusammenfassung des letzten Laufs |
| `<team-id>-schedule.json` etc. | dieselben Daten, nur für eine Mannschaft |

Beispiel (`schedules.json`):

```json
[
  {
    "id": "team-1-2026-09-12-dc-buisdingen",
    "teamId": "team-1",
    "teamName": "1. Mannschaft",
    "season": "2026/2027",
    "leagueName": "Bezirksliga Beispiel",
    "date": "2026-09-12",
    "time": "19:00",
    "homeTeam": "TSV Pilsting 1",
    "awayTeam": "DC Buisdingen",
    "opponent": "DC Buisdingen",
    "isHomeGame": true,
    "venue": "Vereinsheim",
    "status": "scheduled",
    "originalUrl": "https://bdv-dart.liga.nu/...",
    "crawledAt": "2026-07-23T09:30:00.000Z",
    "updatedAt": "2026-07-23T09:30:00.000Z"
  }
]
```

### Integration in die HTML-App

`js/liga-data.js` (nach `js/app.js` einbinden) stellt folgende Funktionen
bereit:

- `loadLigaData()` — lädt alle drei JSON-Dateien (gecacht pro Seitenaufruf)
- `renderNextMatches(containerId, teamId, limit?)` — nächste anstehende Spiele
- `renderTeamSchedule(containerId, teamId)` — kompletter Spielplan
- `renderStandings(containerId, teamId)` — Ligatabelle
- `renderLatestResults(containerId, teamId, limit?)` — letzte Ergebnisse

Beispiel (bereits so in `index.html` eingebaut):

```html
<div id="liga-next-match"></div>
...
<script src="js/app.js"></script>
<script src="js/liga-data.js"></script>
<script>
  renderNextMatches('liga-next-match', 'team-1', 1);
</script>
```

Weitere Beispiele (ebenfalls bereits eingebaut):

```html
<!-- termine.html -->
<div id="liga-schedule-team-1"></div>
<script>renderTeamSchedule('liga-schedule-team-1', 'team-1');</script>

<!-- teams.html -->
<div id="liga-standings-team-1"></div>
<script>renderStandings('liga-standings-team-1', 'team-1');</script>

<!-- sport.html -->
<div id="liga-standings-sport"></div>
<div id="liga-results-sport"></div>
<script>
  renderStandings('liga-standings-sport', 'team-1');
  renderLatestResults('liga-results-sport', 'team-1');
</script>
```

`teamId` weglassen (bzw. `null`/`undefined` übergeben), um Daten aller
Mannschaften zusammen anzuzeigen. Bis der Crawler das erste Mal mit echten
URLs gelaufen ist, zeigen alle Container einen freundlichen
"Keine Daten verfügbar"-Hinweis (die Seed-Dateien in `data/parsed/`
enthalten anfangs leere Arrays).

### Troubleshooting

| Problem | Lösung |
|---|---|
| "keine URLs konfiguriert — übersprungen" | `src/config/teams.config.ts` mit echten URLs befüllen |
| Alle Seiten werden übersprungen ("robots.txt") | robots.txt der Zielseite prüfen; ggf. ist der Pfad dort gesperrt |
| Spielplan/Tabelle wird nicht erkannt | Siehe „Bekannte Grenzen“ — Header-Synonyme in den jeweiligen Parsern anpassen |
| `isHomeGame` immer `false`/Gegner falsch | `clubTeamName` in `teams.config.ts` prüfen — muss dem Namen auf liga.nu entsprechen |
| Validierungsfehler in den Logs | Betrifft nur interne Konsistenzprüfung (Zod) — Daten werden trotzdem gespeichert, Ursache im Parser prüfen |
| GitHub Actions committed nichts | Kein Unterschied zu `data/parsed/` gefunden — kein Fehler, einfach nichts Neues |

### Bekannte Grenzen

Da die genaue HTML-Struktur von `bdv-dart.liga.nu` beim Erstellen dieses
Crawlers nicht einsehbar war (Netzwerk-Policy der Entwicklungsumgebung),
wurden bewusst **robuste, generische Parser** gebaut (Erkennung von
Tabellen anhand der Spaltenüberschriften statt fester CSS-Klassen, siehe
`src/parsers/tableUtils.ts`) statt exakter Selektoren. Nach dem ersten
echten Testlauf gegen die Live-Seite bitte prüfen:

1. **Werden Spielplan/Tabelle/Ergebnisse überhaupt gefunden?** Falls eine
   Warnung wie *"Keine Tabelle anhand der Spaltenüberschriften erkannt"*
   erscheint: das gespeicherte HTML unter `data/raw/<team-id>/*.html`
   öffnen und die tatsächlichen Spaltenüberschriften mit den
   `HEADER_SYNONYMS`-Objekten in `src/parsers/scheduleParser.ts`,
   `tableParser.ts` bzw. `resultsParser.ts` abgleichen und ergänzen.
2. **Einzelergebnisse (PlayerResult):** Werden aktuell nur best-effort
   direkt aus der Ergebniszeile extrahiert (siehe Kommentar in
   `resultsParser.ts`). Zeigt liga.nu Einzelergebnisse stattdessen auf
   einer verlinkten Detailseite pro Spiel, müsste dafür ein zusätzlicher,
   eigens rate-limitierter Crawl-Schritt ergänzt werden — bewusst nicht
   Teil dieses Grundgerüsts, um die Zielseite nicht unnötig oft
   anzufragen.
3. **Liganame:** wird heuristisch aus der Team-Übersichtsseite abgeleitet
   (`src/parsers/teamParser.ts`, `LEAGUE_HINTS`). Falls das fehlschlägt,
   erscheint eine Warnung; die Erkennung ggf. erweitern.
4. Falls liga.nu Tabellen nicht als echte `<table>`-Elemente, sondern als
   verschachtelte `<div>`-Raster rendert, muss `findTableByHeaders()` in
   `src/parsers/tableUtils.ts` entsprechend angepasst werden.
5. Der Crawler unterstützt aktuell keine automatische Pagination
   (z. B. "nächste Seite" bei sehr langen Spielplänen) — nicht
   implementiert, da unbekannt, ob nuLiga das überhaupt einsetzt.

## Geplante Funktionen / Roadmap

- **Termine**: echte Kalenderlogik (Erstellen/Bearbeiten, Erinnerungen,
  Busreservierung mit Konfliktprüfung, da nur 1 Vereinsbus verfügbar ist)
- **Teams**: echte Spielerlisten, Zu-/Absagen mit Speicherung, Mannschaftsführer-Verwaltung
- **Sport**: Averages/Checkout/180er-Statistiken (der Crawler liefert bereits
  Spielplan/Tabelle/Ergebnisse, siehe „Liga-Daten-Crawler“ oben)
- **Verein**: Mitgliederverzeichnis, Dokumentencenter, Sponsorenbereich, echte Einstellungen
- **Design-System**: langfristig sollen `turnier.html`, `archiv.html`,
  `marktmeisterschaft.html` und `spielergebnis.html` ihr eingebettetes CSS
  ebenfalls nach `css/style.css` migrieren, sobald das ohne Funktionsverlust
  möglich ist
- **Liga-Crawler**: Einzelergebnisse pro Spieler über eine verlinkte
  Detailseite nachladen (siehe „Bekannte Grenzen“); alle vier Mannschaften
  automatisch in `teams.html` statt nur "team-1" anzeigen, sobald echte URLs
  für alle Teams hinterlegt sind
- Persistenz aktuell nur clientseitig (`localStorage`, z. B. Turnierarchiv) —
  später ggf. Backend/Datenbank

## Versionen

- **0.2.0** — Liga-Daten-Crawler (Node.js/TypeScript) für öffentliche
  bdv-dart.liga.nu-Daten (Spielplan, Tabelle, Ergebnisse), automatischer
  täglicher Lauf via GitHub Actions, Integration in die HTML-App über
  `js/liga-data.js`
- **0.1.0** — App-Grundgerüst: Bottom-Navigation mit 5 Tabs, neue Seiten
  Termine/Teams/Sport/Verein, Einbindung der bestehenden Turnier-/
  Marktmeisterschaft-/Spielergebnis-Seiten
