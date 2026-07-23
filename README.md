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
| `sport.html`               | Sport    | Sport-Dashboard: verlinkt Turnier, Archiv, Marktmeisterschaft, Spielergebnis; Platzhalter für Tabellen/Statistiken |
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
│   └── app.js            # Bottom-Nav-Erkennung, Filter, RSVP-Buttons, Helfer
├── assets/
│   ├── icons/
│   │   └── frosch.png     # Vereins-Maskottchen (Nav-Icon "Verein")
│   ├── images/
│   ├── logo.png
│   └── favicon.png
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

## Geplante Funktionen / Roadmap

- **Termine**: echte Kalenderlogik (Erstellen/Bearbeiten, Erinnerungen,
  Busreservierung mit Konfliktprüfung, da nur 1 Vereinsbus verfügbar ist)
- **Teams**: echte Spielerlisten, Zu-/Absagen mit Speicherung, Mannschaftsführer-Verwaltung
- **Sport**: Ligatabellen- und Statistik-Anbindung (Averages, Checkouts, 180er)
- **Verein**: Mitgliederverzeichnis, Dokumentencenter, Sponsorenbereich, echte Einstellungen
- **Design-System**: langfristig sollen `turnier.html`, `archiv.html`,
  `marktmeisterschaft.html` und `spielergebnis.html` ihr eingebettetes CSS
  ebenfalls nach `css/style.css` migrieren, sobald das ohne Funktionsverlust
  möglich ist
- Persistenz aktuell nur clientseitig (`localStorage`, z. B. Turnierarchiv) —
  später ggf. Backend/Datenbank

## Versionen

- **0.1.0** — App-Grundgerüst: Bottom-Navigation mit 5 Tabs, neue Seiten
  Termine/Teams/Sport/Verein, Einbindung der bestehenden Turnier-/
  Marktmeisterschaft-/Spielergebnis-Seiten
