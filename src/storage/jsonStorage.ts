/**
 * Einfache Speicherung von JSON- und Roh-HTML-Dateien auf der Festplatte.
 * Bewusst ohne Datenbank — die App liest die JSON-Dateien direkt als
 * statische Assets (siehe js/liga-data.js).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../utils/logger.js';

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

/** Speichert beliebige Daten als hübsch formatiertes JSON. */
export async function saveJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(filePath);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  logger.debug(`JSON gespeichert: ${filePath}`);
}

/** Liest eine JSON-Datei, gibt `fallback` zurück wenn sie nicht existiert. */
export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }
    logger.warn(`Konnte JSON nicht lesen, verwende Fallback: ${filePath}`, {
      error: (err as Error).message,
    });
    return fallback;
  }
}

/** Speichert rohes HTML (zur Nachvollziehbarkeit/Debugging), siehe data/raw. */
export async function saveRawHtml(filePath: string, html: string): Promise<void> {
  await ensureDir(filePath);
  await writeFile(filePath, html, 'utf-8');
  logger.debug(`Raw HTML gespeichert: ${filePath}`);
}
