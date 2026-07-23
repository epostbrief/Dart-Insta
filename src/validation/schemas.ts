/**
 * Zod-Schemas zur Validierung der geparsten Daten, bevor sie gespeichert
 * werden. Bewusst tolerant bei inhaltlichen Werten (viele Felder sind
 * `nullable`, weil liga.nu nicht jede Spalte auf jeder Seite anzeigt),
 * aber strikt bei Pflichtstruktur (IDs, URLs, Zeitstempel).
 *
 * Die Feldlisten spiegeln exakt die Interfaces in src/models/*.ts wider.
 */
import { z } from 'zod';

const matchStatusSchema = z.enum(['scheduled', 'postponed', 'cancelled', 'completed', 'unknown']);

export const crawlMetaSchema = z.object({
  originalUrl: z.string().url(),
  crawledAt: z.string().datetime(),
});

export const scheduleEntrySchema = crawlMetaSchema.extend({
  id: z.string().min(1),
  teamId: z.string().min(1),
  teamName: z.string().min(1),
  season: z.string().min(1),
  leagueName: z.string().nullable(),
  matchDay: z.string().nullable(),
  matchNumber: z.string().nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  opponent: z.string().min(1),
  isHomeGame: z.boolean(),
  venue: z.string().nullable(),
  status: matchStatusSchema,
  updatedAt: z.string().datetime(),
});

export const standingEntrySchema = crawlMetaSchema.extend({
  id: z.string().min(1),
  teamId: z.string().min(1),
  season: z.string().min(1),
  leagueName: z.string().nullable(),
  position: z.number().int().nullable(),
  teamName: z.string().min(1),
  matchesPlayed: z.number().int().nullable(),
  wins: z.number().int().nullable(),
  draws: z.number().int().nullable(),
  losses: z.number().int().nullable(),
  points: z.number().int().nullable(),
  setsFor: z.number().int().nullable(),
  setsAgainst: z.number().int().nullable(),
  legsFor: z.number().int().nullable(),
  legsAgainst: z.number().int().nullable(),
  gamesFor: z.number().int().nullable(),
  gamesAgainst: z.number().int().nullable(),
  difference: z.number().int().nullable(),
});

export const playerResultSchema = z.object({
  id: z.string().min(1),
  matchResultId: z.string().min(1),
  playerName: z.string().min(1),
  teamName: z.string().min(1),
  opponentName: z.string().min(1),
  result: z.string().nullable(),
  sets: z.string().nullable(),
  legs: z.string().nullable(),
  points: z.string().nullable(),
  originalUrl: z.string().url(),
});

export const matchResultSchema = crawlMetaSchema.extend({
  id: z.string().min(1),
  teamId: z.string().min(1),
  season: z.string().min(1),
  leagueName: z.string().nullable(),
  matchNumber: z.string().nullable(),
  date: z.string().nullable(),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  homeScore: z.number().int().nullable(),
  awayScore: z.number().int().nullable(),
  winner: z.enum(['home', 'away', 'draw']).nullable(),
  status: matchStatusSchema,
  detailsUrl: z.string().url().nullable(),
  players: z.array(playerResultSchema).optional(),
});

export const teamRecordSchema = crawlMetaSchema.extend({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  displayName: z.string().min(1),
  season: z.string().min(1),
  leagueName: z.string().nullable(),
  scheduleUrl: z.string().url(),
  tableUrl: z.string().url(),
  resultsUrl: z.string().url(),
});

export type ScheduleEntryInput = z.infer<typeof scheduleEntrySchema>;
export type StandingEntryInput = z.infer<typeof standingEntrySchema>;
export type MatchResultInput = z.infer<typeof matchResultSchema>;
export type PlayerResultInput = z.infer<typeof playerResultSchema>;
export type TeamRecordInput = z.infer<typeof teamRecordSchema>;
