/**
 * Zentraler HTTP-Client für alle Requests gegen liga.nu.
 *
 * Verantwortlich für:
 * - eindeutigen, transparenten User-Agent
 * - Timeout
 * - Retry mit Backoff bei transienten Fehlern (Netzwerk, 5xx, 429)
 * - Rate-Limiting (über RateLimiter)
 * - optionalen Datei-Cache (über cacheStorage)
 *
 * Alle anderen Module rufen ausschließlich `fetchHtml()` auf — es gibt
 * keine weiteren Stellen im Projekt, die direkt HTTP-Requests auslösen.
 */
import axios, { AxiosError } from 'axios';
import { RateLimiter } from './rateLimiter.js';
import { getCached, setCached } from '../storage/cacheStorage.js';
import { logger } from '../utils/logger.js';

/**
 * Transparenter User-Agent inkl. Zweck und Kontaktmöglichkeit.
 * Bitte bei Bedarf auf eine echte Kontakt-URL/E-Mail des Vereins anpassen.
 */
export const USER_AGENT =
  'TSVPilstingDartCrawler/1.0 (+https://github.com/epostbrief/Dart-Insta; nur oeffentliche Liga-Daten, siehe README)';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1500;

const rateLimiter = new RateLimiter();

export type FetchErrorKind = 'network' | 'timeout' | 'http_404' | 'http_error' | 'unknown';

export class HttpFetchError extends Error {
  constructor(
    message: string,
    public readonly kind: FetchErrorKind,
    public readonly url: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'HttpFetchError';
  }
}

function classifyError(err: unknown, url: string): HttpFetchError {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError;
    if (axiosErr.code === 'ECONNABORTED') {
      return new HttpFetchError(`Timeout beim Laden von ${url}`, 'timeout', url);
    }
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      if (status === 404) {
        return new HttpFetchError(`Seite nicht gefunden (404): ${url}`, 'http_404', url, status);
      }
      return new HttpFetchError(`HTTP-Fehler ${status} bei ${url}`, 'http_error', url, status);
    }
    return new HttpFetchError(`Netzwerkfehler bei ${url}: ${axiosErr.message}`, 'network', url);
  }
  return new HttpFetchError(`Unbekannter Fehler bei ${url}: ${(err as Error).message}`, 'unknown', url);
}

function isRetryable(err: HttpFetchError): boolean {
  if (err.kind === 'network' || err.kind === 'timeout') return true;
  if (err.kind === 'http_error' && err.status !== undefined) {
    return err.status >= 500 || err.status === 429;
  }
  return false;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface FetchOptions {
  /** Cache-Ergebnisse verwenden, statt jedes Mal neu zu laden (Standard: true). */
  useCache?: boolean;
  /** Cache-Gültigkeit in Millisekunden. */
  cacheMaxAgeMs?: number;
}

export interface FetchResult {
  html: string;
  fromCache: boolean;
  status: number;
}

/**
 * Lädt eine HTML-Seite. Wirft eine {@link HttpFetchError}, wenn das nach
 * allen Retries nicht gelingt — der Aufrufer (crawler.ts) entscheidet,
 * ob er dann die Mannschaft überspringt.
 */
export async function fetchHtml(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const { useCache = true, cacheMaxAgeMs } = options;

  if (useCache) {
    const cached = await getCached(url, cacheMaxAgeMs);
    if (cached !== null) {
      return { html: cached, fromCache: true, status: 200 };
    }
  }

  let lastError: HttpFetchError | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    await rateLimiter.wait();
    try {
      logger.debug(`GET ${url} (Versuch ${attempt}/${MAX_RETRIES})`);
      const response = await axios.get<string>(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'de-DE,de;q=0.9' },
        responseType: 'text',
        validateStatus: (status) => status < 500, // 4xx selbst behandeln, 5xx retryen
      });

      if (response.status >= 400) {
        throw classifyError({ isAxiosError: true, response } as AxiosError, url);
      }

      await setCached(url, response.data);
      return { html: response.data, fromCache: false, status: response.status };
    } catch (err) {
      lastError = err instanceof HttpFetchError ? err : classifyError(err, url);
      if (!isRetryable(lastError) || attempt === MAX_RETRIES) {
        throw lastError;
      }
      const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
      logger.warn(`${lastError.message} — retry in ${backoff}ms`, { attempt });
      await sleep(backoff);
    }
  }

  // Sollte durch die throw-Pfade oben nie erreicht werden.
  throw lastError ?? new HttpFetchError(`Unbekannter Fehler bei ${url}`, 'unknown', url);
}
