/**
 * Erzeugt stabile, lesbare IDs aus beliebigen Strings, z.B. für
 * ScheduleEntry-IDs wie "team-1-2026-09-12-gegnername".
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // diakritische Zeichen entfernen (é -> e)
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Baut eine deterministische ID aus mehreren Teilen zusammen. */
export function buildId(...parts: Array<string | number | null | undefined>): string {
  return parts
    .filter((part) => part !== null && part !== undefined && String(part).length > 0)
    .map((part) => slugify(String(part)))
    .join('-');
}
