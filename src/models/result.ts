import type { CrawlMeta, MatchStatus } from './common.js';

/**
 * Einzelergebnis innerhalb einer Mannschaftsbegegnung (z.B. ein Einzel
 * zwischen zwei Spielern). Wird nur befüllt, wenn auf der öffentlichen
 * Ergebnis-Seite tatsächlich Einzelergebnisse sichtbar und zuverlässig
 * parsebar sind — siehe resultsParser.ts.
 */
export interface PlayerResult {
  id: string;
  matchResultId: string;
  playerName: string;
  teamName: string;
  opponentName: string;
  result: string | null;
  sets: string | null;
  legs: string | null;
  points: string | null;
  originalUrl: string;
}

/** Ergebnis einer kompletten Mannschaftsbegegnung. */
export interface MatchResult extends CrawlMeta {
  id: string;
  teamId: string;
  season: string;
  leagueName: string | null;
  matchNumber: string | null;
  date: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  /** 'home' | 'away' | 'draw', oder null wenn nicht bestimmbar. */
  winner: 'home' | 'away' | 'draw' | null;
  status: MatchStatus;
  detailsUrl: string | null;
  /** Optional: Einzelergebnisse, falls öffentlich sichtbar und parsebar. */
  players?: PlayerResult[];
}
