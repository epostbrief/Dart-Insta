/**
 * Datei-basierter HTTP-Cache unter data/cache. Reduziert wiederholte
 * Requests gegen dieselbe URL innerhalb der konfigurierten Gültigkeit
 * (Standard: 6 Stunden) — wichtig, um den Server nicht unnötig zu
 * belasten, besonders bei mehreren lokalen Testläufen kurz hintereinander.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { logger } from '../utils/logger.js';

const CACHE_DIR = path.join('data', 'cache');
const DEFAULT_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 Stunden

interface CacheEntry {
  url: string;
  fetchedAt: string;
  html: string;
}

function cacheKeyFor(url: string): string {
  return crypto.createHash('sha1').update(url).digest('hex');
}

function cacheFilePath(url: string): string {
  return path.join(CACHE_DIR, `${cacheKeyFor(url)}.json`);
}

/**
 * Liefert gecachtes HTML zurück, wenn es existiert und noch innerhalb
 * von `maxAgeMs` liegt. Sonst `null`.
 */
export async function getCached(url: string, maxAgeMs = DEFAULT_MAX_AGE_MS): Promise<string | null> {
  try {
    const raw = await readFile(cacheFilePath(url), 'utf-8');
    const entry = JSON.parse(raw) as CacheEntry;
    const age = Date.now() - new Date(entry.fetchedAt).getTime();
    if (age > maxAgeMs) {
      logger.debug(`Cache abgelaufen für ${url} (Alter: ${Math.round(age / 60000)} min)`);
      return null;
    }
    logger.debug(`Cache-Treffer für ${url}`);
    return entry.html;
  } catch {
    return null;
  }
}

/** Speichert HTML im Cache für die gegebene URL. */
export async function setCached(url: string, html: string): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const entry: CacheEntry = { url, fetchedAt: new Date().toISOString(), html };
  await writeFile(cacheFilePath(url), JSON.stringify(entry), 'utf-8');
}
