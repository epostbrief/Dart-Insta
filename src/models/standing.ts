import type { CrawlMeta } from './common.js';

/** Eine Zeile der Ligatabelle. */
export interface StandingEntry extends CrawlMeta {
  id: string;
  teamId: string;
  season: string;
  leagueName: string | null;
  position: number | null;
  teamName: string;
  matchesPlayed: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  points: number | null;
  setsFor: number | null;
  setsAgainst: number | null;
  legsFor: number | null;
  legsAgainst: number | null;
  gamesFor: number | null;
  gamesAgainst: number | null;
  difference: number | null;
}
