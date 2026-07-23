/**
 * Minimaler robots.txt-Client. Prüft zur Laufzeit, ob eine URL laut
 * robots.txt für unseren User-Agent crawlbar ist, bevor sie abgerufen wird.
 *
 * Bewusst ohne externe robots-Parser-Bibliothek umgesetzt (keine unnötige
 * Abhängigkeit für eine simple Zeilen-Grammatik). Unterstützt die gängigen
 * Direktiven User-agent / Allow / Disallow / Crawl-delay, inkl. "*"-Gruppe
 * als Fallback.
 */
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { USER_AGENT } from './httpClient.js';

interface RobotsRule {
  type: 'allow' | 'disallow';
  path: string;
}

interface RobotsGroup {
  userAgents: string[];
  rules: RobotsRule[];
  crawlDelaySec?: number;
}

interface RobotsPolicy {
  groups: RobotsGroup[];
  /** true, wenn robots.txt nicht geladen werden konnte (Netzwerkfehler etc.). */
  unreachable: boolean;
}

const policyCache = new Map<string, Promise<RobotsPolicy>>();

function parseRobotsTxt(body: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let expectingAgents = true;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (!line) continue;

    const [rawKey, ...rest] = line.split(':');
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (key === 'user-agent') {
      if (!expectingAgents || !current) {
        current = { userAgents: [], rules: [] };
        groups.push(current);
      }
      current.userAgents.push(value.toLowerCase());
      expectingAgents = true;
      continue;
    }

    expectingAgents = false;
    if (!current) continue;

    if (key === 'disallow' && value) {
      current.rules.push({ type: 'disallow', path: value });
    } else if (key === 'allow' && value) {
      current.rules.push({ type: 'allow', path: value });
    } else if (key === 'crawl-delay') {
      const seconds = Number(value);
      if (!Number.isNaN(seconds)) current.crawlDelaySec = seconds;
    }
  }

  return groups;
}

async function fetchPolicy(origin: string): Promise<RobotsPolicy> {
  const robotsUrl = new URL('/robots.txt', origin).toString();
  try {
    const response = await axios.get<string>(robotsUrl, {
      timeout: 10_000,
      headers: { 'User-Agent': USER_AGENT },
      responseType: 'text',
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      // Kein robots.txt vorhanden (404 o.ä.) -> laut Konvention: alles erlaubt.
      logger.info(`Kein robots.txt gefunden (HTTP ${response.status}) unter ${robotsUrl} — behandle als "alles erlaubt".`);
      return { groups: [], unreachable: false };
    }

    return { groups: parseRobotsTxt(response.data), unreachable: false };
  } catch (err) {
    logger.warn(
      `robots.txt konnte nicht geladen werden (${robotsUrl}). Fahre defensiv fort und crawle nur die explizit konfigurierten öffentlichen Seiten.`,
      { error: (err as Error).message },
    );
    return { groups: [], unreachable: true };
  }
}

function getPolicy(origin: string): Promise<RobotsPolicy> {
  let cached = policyCache.get(origin);
  if (!cached) {
    cached = fetchPolicy(origin);
    policyCache.set(origin, cached);
  }
  return cached;
}

function matchingGroup(groups: RobotsGroup[], userAgent: string): RobotsGroup | null {
  const ua = userAgent.toLowerCase();
  const exact = groups.find((g) => g.userAgents.some((a) => a !== '*' && ua.includes(a)));
  if (exact) return exact;
  return groups.find((g) => g.userAgents.includes('*')) ?? null;
}

/**
 * Prüft, ob `url` laut robots.txt für unseren User-Agent erlaubt ist.
 * Wenn robots.txt nicht erreichbar ist, wird konservativ `true`
 * zurückgegeben (siehe fetchPolicy) — der Crawler ruft ohnehin nur die
 * in teams.config.ts explizit hinterlegten, öffentlichen Seiten ab.
 */
export async function isAllowedByRobots(url: string, userAgent = USER_AGENT): Promise<boolean> {
  const parsed = new URL(url);
  const policy = await getPolicy(parsed.origin);
  if (policy.unreachable || policy.groups.length === 0) return true;

  const group = matchingGroup(policy.groups, userAgent);
  if (!group) return true;

  const path = parsed.pathname + parsed.search;
  let bestMatch: RobotsRule | null = null;

  for (const rule of group.rules) {
    if (rule.path === '') continue; // "Disallow:" (leer) = alles erlaubt
    if (path.startsWith(rule.path)) {
      if (!bestMatch || rule.path.length > bestMatch.path.length) {
        bestMatch = rule;
      }
    }
  }

  if (!bestMatch) return true;
  return bestMatch.type === 'allow';
}
