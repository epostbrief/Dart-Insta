/**
 * Gemeinsame Typen, die von mehreren Datenmodellen genutzt werden.
 */

/** Normalisierter Spielstatus, unabhängig davon wie liga.nu ihn textlich darstellt. */
export type MatchStatus =
  | 'scheduled' // geplant, noch nicht gespielt
  | 'postponed' // verlegt
  | 'cancelled' // abgesagt / ausgefallen
  | 'completed' // Ergebnis liegt vor
  | 'unknown'; // Status konnte nicht bestimmt werden

/**
 * Beschreibt, wie vollständig ein einzelner Datensatz nach dem Parsen ist.
 * Wird u.a. fürs Logging und für Warnungen verwendet, nicht als Pflichtfeld
 * auf jedem Modell (nur wo es im Auftrag explizit gefordert ist).
 */
export type DataAvailability = 'complete' | 'partial' | 'missing' | 'parse_error';

/** Felder, die auf jedem aus dem Web gecrawlten Datensatz vorhanden sind. */
export interface CrawlMeta {
  /** Absolute URL der Originalseite, von der der Datensatz stammt. */
  originalUrl: string;
  /** ISO-Zeitstempel, wann der Datensatz zuletzt gecrawlt wurde. */
  crawledAt: string;
}

/** Ergebnis eines einzelnen Parse-Vorgangs inkl. Warnungen (fehlende Felder etc.). */
export interface ParseResult<T> {
  items: T[];
  warnings: string[];
  availability: DataAvailability;
}
