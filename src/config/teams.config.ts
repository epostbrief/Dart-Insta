import type { TeamConfig } from '../models/team.js';

/**
 * Zentrale Konfiguration aller Mannschaften, die gecrawlt werden sollen.
 *
 * WICHTIG: Bitte NUR öffentlich zugängliche nuLiga-URLs eintragen (keine
 * Login-URLs, keine passwortgeschützten Vereinsbereiche). Die URLs findest
 * du, indem du auf https://bdv-dart.liga.nu/ öffentlich zu deiner
 * Mannschaft navigierst (Verband → Liga → Mannschaft) und die URLs aus der
 * Adresszeile für Spielplan/Tabelle/Ergebnisse kopierst — ganz ohne Login.
 *
 * `clubTeamName` ist WICHTIG und oft ANDERS als `displayName`: liga.nu
 * zeigt in Spielplan/Tabelle typischerweise den vollen Vereinsnamen inkl.
 * Mannschaftsnummer (z.B. "TSV Pilsting 1" oder "TSV Pilsting I"), nicht
 * die interne App-Bezeichnung "1. Mannschaft". Bitte hier den Namen exakt
 * so eintragen, wie er auf liga.nu erscheint — sonst schlägt die
 * Heim/Auswärts-Erkennung fehl (siehe scheduleParser.ts).
 *
 * Der Crawler selbst enthält KEINE hartkodierten URLs oder Mannschafts-
 * namen — alles kommt ausschließlich aus dieser Datei.
 */
export const TEAMS: TeamConfig[] = [
  {
    id: 'team-1',
    name: '1. Mannschaft',
    displayName: '1. Mannschaft',
    clubTeamName: 'HIER_VEREINSNAME_WIE_AUF_LIGA_NU', // z.B. "TSV Pilsting 1"
    ligaNuTeamUrl: 'HIER_URL_EINFUEGEN',
    scheduleUrl: 'HIER_SPIELPLAN_URL_EINFUEGEN',
    tableUrl: 'HIER_TABELLEN_URL_EINFUEGEN',
    resultsUrl: 'HIER_ERGEBNIS_URL_EINFUEGEN',
    season: '2026/2027',
  },
  {
    id: 'team-2',
    name: '2. Mannschaft',
    displayName: '2. Mannschaft',
    clubTeamName: 'HIER_VEREINSNAME_WIE_AUF_LIGA_NU', // z.B. "TSV Pilsting 2"
    ligaNuTeamUrl: 'HIER_URL_EINFUEGEN',
    scheduleUrl: 'HIER_SPIELPLAN_URL_EINFUEGEN',
    tableUrl: 'HIER_TABELLEN_URL_EINFUEGEN',
    resultsUrl: 'HIER_ERGEBNIS_URL_EINFUEGEN',
    season: '2026/2027',
  },
  {
    id: 'team-3',
    name: '3. Mannschaft',
    displayName: '3. Mannschaft',
    clubTeamName: 'HIER_VEREINSNAME_WIE_AUF_LIGA_NU', // z.B. "TSV Pilsting 3"
    ligaNuTeamUrl: 'HIER_URL_EINFUEGEN',
    scheduleUrl: 'HIER_SPIELPLAN_URL_EINFUEGEN',
    tableUrl: 'HIER_TABELLEN_URL_EINFUEGEN',
    resultsUrl: 'HIER_ERGEBNIS_URL_EINFUEGEN',
    season: '2026/2027',
  },
  {
    id: 'team-4',
    name: '4. Mannschaft',
    displayName: '4. Mannschaft',
    clubTeamName: 'HIER_VEREINSNAME_WIE_AUF_LIGA_NU', // z.B. "TSV Pilsting 4"
    ligaNuTeamUrl: 'HIER_URL_EINFUEGEN',
    scheduleUrl: 'HIER_SPIELPLAN_URL_EINFUEGEN',
    tableUrl: 'HIER_TABELLEN_URL_EINFUEGEN',
    resultsUrl: 'HIER_ERGEBNIS_URL_EINFUEGEN',
    season: '2026/2027',
  },
];

/**
 * Platzhalter-Werte, die noch nicht befüllt wurden. Diese Teams werden
 * beim Crawl übersprungen (mit Warnung), damit versehentliche Requests
 * gegen ungültige URLs ausbleiben.
 */
export function isPlaceholderUrl(url: string): boolean {
  return url.startsWith('HIER_');
}
