import type { CrawlMeta } from './common.js';

/**
 * Konfiguration einer Mannschaft, wie sie in src/config/teams.config.ts
 * gepflegt wird. Enthält bewusst NUR öffentliche nuLiga-URLs.
 */
export interface TeamConfig {
  id: string;
  name: string;
  displayName: string;
  /**
   * Name der Mannschaft EXAKT wie er auf liga.nu in Spielplan-/Tabellen-
   * Zeilen erscheint (z.B. "TSV Pilsting 1" oder "TSV Pilsting I").
   * Wird für die Heim/Auswärts-Erkennung benötigt, da liga.nu i.d.R.
   * nicht "1. Mannschaft" schreibt, sondern den vollen Vereinsnamen inkl.
   * Mannschaftsnummer. Falls leer/Platzhalter, schlägt die Heim/Auswärts-
   * Erkennung fehl und wird als Warnung geloggt.
   */
  clubTeamName: string;
  /** Übersichtsseite der Mannschaft auf liga.nu (öffentlich). */
  ligaNuTeamUrl: string;
  /** Spielplan-Seite (öffentlich). */
  scheduleUrl: string;
  /** Tabellen-Seite der Liga (öffentlich). */
  tableUrl: string;
  /** Ergebnis-Seite (öffentlich). */
  resultsUrl: string;
  season: string;
}

/** Aus dem Crawl abgeleiteter, angereicherter Mannschaftsdatensatz. */
export interface TeamRecord extends CrawlMeta {
  id: string;
  teamId: string;
  name: string;
  displayName: string;
  season: string;
  leagueName: string | null;
  scheduleUrl: string;
  tableUrl: string;
  resultsUrl: string;
}
