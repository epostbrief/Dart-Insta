import type { CrawlMeta, MatchStatus } from './common.js';

/** Ein Eintrag im Spielplan einer Mannschaft. */
export interface ScheduleEntry extends CrawlMeta {
  id: string;
  teamId: string;
  teamName: string;
  season: string;
  leagueName: string | null;
  matchDay: string | null;
  matchNumber: string | null;
  /** ISO-Datum YYYY-MM-DD, oder null wenn nicht parsebar. */
  date: string | null;
  /** HH:mm, oder null wenn nicht angegeben/parsebar. */
  time: string | null;
  homeTeam: string;
  awayTeam: string;
  /** Der jeweilige Gegner aus Sicht der konfigurierten Mannschaft. */
  opponent: string;
  isHomeGame: boolean;
  venue: string | null;
  status: MatchStatus;
  updatedAt: string;
}
