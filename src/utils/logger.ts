/**
 * Sehr einfacher, abhängigkeitsfreier Logger auf Basis von console.
 * Debug-Ausgaben erscheinen nur, wenn die Umgebungsvariable DEBUG=true
 * gesetzt ist (siehe package.json Script "crawl:debug").
 */

const isDebug = process.env.DEBUG === 'true';

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: string, message: string, meta?: unknown): string {
  const base = `[${timestamp()}] ${level.padEnd(5)} ${message}`;
  if (meta === undefined) return base;
  try {
    return `${base} ${JSON.stringify(meta)}`;
  } catch {
    return `${base} ${String(meta)}`;
  }
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    if (!isDebug) return;
    // eslint-disable-next-line no-console
    console.debug(format('DEBUG', message, meta));
  },
  info(message: string, meta?: unknown): void {
    // eslint-disable-next-line no-console
    console.log(format('INFO', message, meta));
  },
  warn(message: string, meta?: unknown): void {
    // eslint-disable-next-line no-console
    console.warn(format('WARN', message, meta));
  },
  error(message: string, meta?: unknown): void {
    // eslint-disable-next-line no-console
    console.error(format('ERROR', message, meta));
  },
};

export type Logger = typeof logger;
