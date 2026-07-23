/**
 * Orchestriert den kompletten Crawl-Ablauf für alle in teams.config.ts
 * konfigurierten Mannschaften (siehe Aufgabenstellung Abschnitt 7).
 *
 * Eine einzelne Mannschaft, die fehlschlägt, bricht NICHT den gesamten
 * Lauf ab — Fehler werden geloggt, die nächste Mannschaft wird trotzdem
 * verarbeitet (siehe Abschnitt 13 "Fehlerbehandlung").
 */
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

import { TEAMS, isPlaceholderUrl } from '../config/teams.config.js';
import type { TeamConfig } from '../models/team.js';
import type { ScheduleEntry } from '../models/schedule.js';
import type { StandingEntry } from '../models/standing.js';
import type { MatchResult } from '../models/result.js';
import type { TeamRecord } from '../models/team.js';

import { fetchHtml, HttpFetchError } from './httpClient.js';
import { isAllowedByRobots } from './robots.js';
import { saveJson, saveRawHtml } from '../storage/jsonStorage.js';
import { parseTeamOverview } from '../parsers/teamParser.js';
import { parseSchedule } from '../parsers/scheduleParser.js';
import { parseStandings } from '../parsers/tableParser.js';
import { parseResults } from '../parsers/resultsParser.js';
import {
  scheduleEntrySchema,
  standingEntrySchema,
  matchResultSchema,
  teamRecordSchema,
} from '../validation/schemas.js';
import { logger } from '../utils/logger.js';

const LOCAL_PARSE = process.env.LOCAL_PARSE === 'true';

const DATA_PARSED_DIR = path.join('data', 'parsed');
const DATA_RAW_DIR = path.join('data', 'raw');

type PageKind = 'team' | 'schedule' | 'table' | 'results';

interface PageLoadResult {
  html: string | null;
  skipped: boolean;
  reason?: string;
}

function rawFilePath(teamId: string, kind: PageKind): string {
  return path.join(DATA_RAW_DIR, teamId, `${kind}.html`);
}

/**
 * Lädt eine Seite entweder von der echten URL (Standardmodus) oder aus
 * bereits gespeichertem Raw-HTML (LOCAL_PARSE=true, siehe `npm run parse:local`).
 * Prüft robots.txt und Platzhalter-URLs, bevor überhaupt ein Request
 * ausgelöst wird.
 */
async function loadPage(kind: PageKind, teamId: string, url: string): Promise<PageLoadResult> {
  const rawPath = rawFilePath(teamId, kind);

  if (LOCAL_PARSE) {
    try {
      const html = await readFile(rawPath, 'utf-8');
      return { html, skipped: false };
    } catch {
      return {
        html: null,
        skipped: true,
        reason: `Keine gespeicherte Raw-HTML unter ${rawPath} gefunden (LOCAL_PARSE-Modus, kein Netzwerkzugriff).`,
      };
    }
  }

  if (isPlaceholderUrl(url)) {
    return { html: null, skipped: true, reason: 'Platzhalter-URL — bitte teams.config.ts befüllen.' };
  }

  const allowed = await isAllowedByRobots(url);
  if (!allowed) {
    return {
      html: null,
      skipped: true,
      reason: 'Diese Daten sind nicht öffentlich verfügbar (robots.txt) und werden nicht abgerufen.',
    };
  }

  try {
    const { html } = await fetchHtml(url);
    await saveRawHtml(rawPath, html);
    return { html, skipped: false };
  } catch (err) {
    const message = err instanceof HttpFetchError ? err.message : (err as Error).message;
    return { html: null, skipped: true, reason: message };
  }
}

/** Validiert ein Array gegen ein Zod-Schema und loggt Details bei Abweichungen. */
function validateArray<T>(schema: z.ZodType<T>, items: unknown[], label: string): void {
  const result = z.array(schema).safeParse(items);
  if (!result.success) {
    const issueCount = result.error.issues.length;
    logger.error(`Validierung fehlgeschlagen für ${label}: ${issueCount} Probleme`, {
      firstIssues: result.error.issues.slice(0, 3),
    });
  }
}

export interface CrawlSummary {
  teamsProcessed: number;
  teamsSkipped: number;
  scheduleEntries: number;
  standingEntries: number;
  matchResults: number;
  warnings: number;
  errors: number;
  outputFiles: string[];
  startedAt: string;
  finishedAt: string;
}

export async function runCrawl(): Promise<CrawlSummary> {
  const startedAt = new Date().toISOString();
  const outputFiles: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const allTeams: TeamRecord[] = [];
  const allSchedules: ScheduleEntry[] = [];
  const allStandings: StandingEntry[] = [];
  const allResults: MatchResult[] = [];

  let teamsProcessed = 0;
  let teamsSkipped = 0;

  for (const config of TEAMS as TeamConfig[]) {
    logger.info(`=== ${config.displayName} (${config.id}) ===`);

    const allPlaceholder =
      isPlaceholderUrl(config.ligaNuTeamUrl) &&
      isPlaceholderUrl(config.scheduleUrl) &&
      isPlaceholderUrl(config.tableUrl) &&
      isPlaceholderUrl(config.resultsUrl);

    if (allPlaceholder) {
      logger.warn(`${config.displayName}: keine URLs konfiguriert — übersprungen. Bitte src/config/teams.config.ts befüllen.`);
      teamsSkipped += 1;
      continue;
    }

    try {
      // ── Team-Übersicht (best-effort, für Liganame) ──
      const overview = await loadPage('team', config.id, config.ligaNuTeamUrl);
      if (overview.skipped) {
        logger.warn(`${config.displayName}: Team-Übersicht übersprungen — ${overview.reason}`);
        warnings.push(`${config.displayName} (Team-Übersicht): ${overview.reason}`);
      }
      const teamRecord = parseTeamOverview(overview.html, config);
      allTeams.push(teamRecord);
      validateArray(teamRecordSchema, [teamRecord], `${config.id}-team`);
      const teamFile = path.join(DATA_PARSED_DIR, `${config.id}-team.json`);
      await saveJson(teamFile, teamRecord);
      outputFiles.push(teamFile);

      // ── Spielplan ──
      const scheduleLoad = await loadPage('schedule', config.id, config.scheduleUrl);
      if (scheduleLoad.skipped) {
        logger.warn(`${config.displayName}: Spielplan übersprungen — ${scheduleLoad.reason}`);
        warnings.push(`${config.displayName} (Spielplan): ${scheduleLoad.reason}`);
      } else if (scheduleLoad.html) {
        const parsed = parseSchedule(scheduleLoad.html, {
          teamId: config.id,
          teamName: config.displayName,
          clubTeamName: config.clubTeamName,
          season: config.season,
          leagueName: teamRecord.leagueName,
          originalUrl: config.scheduleUrl,
        });
        parsed.warnings.forEach((w) => warnings.push(`${config.displayName} (Spielplan): ${w}`));
        validateArray(scheduleEntrySchema, parsed.items, `${config.id}-schedule`);
        allSchedules.push(...parsed.items);
        const scheduleFile = path.join(DATA_PARSED_DIR, `${config.id}-schedule.json`);
        await saveJson(scheduleFile, parsed.items);
        outputFiles.push(scheduleFile);
      }

      // ── Tabelle ──
      const tableLoad = await loadPage('table', config.id, config.tableUrl);
      if (tableLoad.skipped) {
        logger.warn(`${config.displayName}: Tabelle übersprungen — ${tableLoad.reason}`);
        warnings.push(`${config.displayName} (Tabelle): ${tableLoad.reason}`);
      } else if (tableLoad.html) {
        const parsed = parseStandings(tableLoad.html, {
          teamId: config.id,
          season: config.season,
          leagueName: teamRecord.leagueName,
          originalUrl: config.tableUrl,
        });
        parsed.warnings.forEach((w) => warnings.push(`${config.displayName} (Tabelle): ${w}`));
        validateArray(standingEntrySchema, parsed.items, `${config.id}-standings`);
        allStandings.push(...parsed.items);
        const tableFile = path.join(DATA_PARSED_DIR, `${config.id}-standings.json`);
        await saveJson(tableFile, parsed.items);
        outputFiles.push(tableFile);
      }

      // ── Ergebnisse ──
      const resultsLoad = await loadPage('results', config.id, config.resultsUrl);
      if (resultsLoad.skipped) {
        logger.warn(`${config.displayName}: Ergebnisse übersprungen — ${resultsLoad.reason}`);
        warnings.push(`${config.displayName} (Ergebnisse): ${resultsLoad.reason}`);
      } else if (resultsLoad.html) {
        const parsed = parseResults(resultsLoad.html, {
          teamId: config.id,
          season: config.season,
          leagueName: teamRecord.leagueName,
          originalUrl: config.resultsUrl,
        });
        parsed.warnings.forEach((w) => warnings.push(`${config.displayName} (Ergebnisse): ${w}`));
        validateArray(matchResultSchema, parsed.items, `${config.id}-results`);
        allResults.push(...parsed.items);
        const resultsFile = path.join(DATA_PARSED_DIR, `${config.id}-results.json`);
        await saveJson(resultsFile, parsed.items);
        outputFiles.push(resultsFile);
      }

      teamsProcessed += 1;
    } catch (err) {
      const message = (err as Error).message;
      logger.error(`${config.displayName}: unerwarteter Fehler — überspringe Mannschaft, fahre mit den übrigen fort`, {
        error: message,
      });
      errors.push(`${config.displayName}: ${message}`);
      teamsSkipped += 1;
    }
  }

  // ── Aggregierte Dateien ──
  const schedulesFile = path.join(DATA_PARSED_DIR, 'schedules.json');
  const standingsFile = path.join(DATA_PARSED_DIR, 'standings.json');
  const resultsFile = path.join(DATA_PARSED_DIR, 'results.json');
  const teamsFile = path.join(DATA_PARSED_DIR, 'teams.json');
  const lastUpdatedFile = path.join(DATA_PARSED_DIR, 'last-updated.json');

  await saveJson(schedulesFile, allSchedules);
  await saveJson(standingsFile, allStandings);
  await saveJson(resultsFile, allResults);
  await saveJson(teamsFile, allTeams);
  outputFiles.push(schedulesFile, standingsFile, resultsFile, teamsFile);

  const finishedAt = new Date().toISOString();
  const summary: CrawlSummary = {
    teamsProcessed,
    teamsSkipped,
    scheduleEntries: allSchedules.length,
    standingEntries: allStandings.length,
    matchResults: allResults.length,
    warnings: warnings.length,
    errors: errors.length,
    outputFiles,
    startedAt,
    finishedAt,
  };

  await saveJson(lastUpdatedFile, {
    ...summary,
    warningMessages: warnings,
    errorMessages: errors,
  });
  outputFiles.push(lastUpdatedFile);

  return summary;
}
