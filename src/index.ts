/**
 * Einstiegspunkt des Liga-Crawlers. Siehe package.json Scripts:
 *
 *   npm run crawl        — normaler Lauf gegen die echten liga.nu-Seiten
 *   npm run crawl:debug  — wie oben, mit ausführlichem Logging
 *   npm run parse:local  — parst nur bereits gespeichertes Raw-HTML aus
 *                          data/raw neu, ohne die Webseite erneut zu laden
 */
import { runCrawl } from './crawler/crawler.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  const mode = process.env.LOCAL_PARSE === 'true' ? 'parse:local' : 'crawl';
  const debug = process.env.DEBUG === 'true';

  logger.info(`Liga-Crawler gestartet (Modus: ${mode}${debug ? ', debug' : ''})`);

  const summary = await runCrawl();

  logger.info('════════════════════════════════════');
  logger.info('Zusammenfassung');
  logger.info('════════════════════════════════════');
  logger.info(`Mannschaften verarbeitet : ${summary.teamsProcessed}`);
  logger.info(`Mannschaften übersprungen: ${summary.teamsSkipped}`);
  logger.info(`Spielplan-Einträge       : ${summary.scheduleEntries}`);
  logger.info(`Tabellenzeilen           : ${summary.standingEntries}`);
  logger.info(`Ergebnisse               : ${summary.matchResults}`);
  logger.info(`Warnungen                : ${summary.warnings}`);
  logger.info(`Fehler                   : ${summary.errors}`);
  logger.info(`Gestartet   : ${summary.startedAt}`);
  logger.info(`Beendet     : ${summary.finishedAt}`);
  logger.info('Gespeicherte Dateien:');
  summary.outputFiles.forEach((file) => logger.info(`  - ${file}`));

  if (summary.teamsProcessed === 0 && summary.teamsSkipped > 0) {
    logger.warn(
      'Keine Mannschaft wurde verarbeitet — vermutlich sind in src/config/teams.config.ts noch keine echten URLs eingetragen.',
    );
  }

  // Ein Exit-Code != 0 signalisiert z.B. GitHub Actions, dass etwas
  // schiefgelaufen ist — Warnungen allein führen NICHT zum Fehlschlag,
  // nur echte Fehler (z.B. unerwartete Exceptions pro Mannschaft).
  if (summary.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  logger.error('Unerwarteter Fehler im Crawler — Lauf abgebrochen', {
    error: (err as Error).message,
  });
  process.exitCode = 1;
});
