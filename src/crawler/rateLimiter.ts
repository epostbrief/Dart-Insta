/**
 * Sehr einfacher Rate-Limiter: erzwingt eine Mindestwartezeit zwischen
 * zwei Requests, damit der Crawler die Zielseite nicht belastet.
 * Bewusst simpel gehalten (kein Token-Bucket, keine Parallelität) —
 * der Crawler arbeitet ohnehin sequentiell, eine Mannschaft nach der
 * anderen, eine Seite nach der anderen.
 */
import { logger } from '../utils/logger.js';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  private readonly minDelayMs: number;
  private readonly jitterMs: number;
  private lastRequestAt = 0;

  /**
   * @param minDelayMs Mindestabstand zwischen zwei Requests in ms.
   * @param jitterMs   Zusätzliche zufällige Verzögerung (0..jitterMs),
   *                   damit Requests nicht immer exakt im gleichen Takt kommen.
   */
  constructor(minDelayMs = 2000, jitterMs = 800) {
    this.minDelayMs = minDelayMs;
    this.jitterMs = jitterMs;
  }

  /** Wartet so lange, bis der konfigurierte Mindestabstand erreicht ist. */
  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    const jitter = Math.floor(Math.random() * this.jitterMs);
    const requiredDelay = this.minDelayMs + jitter;

    if (this.lastRequestAt !== 0 && elapsed < requiredDelay) {
      const waitMs = requiredDelay - elapsed;
      logger.debug(`Rate-Limit: warte ${waitMs}ms vor nächstem Request`);
      await sleep(waitMs);
    }

    this.lastRequestAt = Date.now();
  }
}
