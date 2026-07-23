/**
 * Lädt die vom Liga-Crawler erzeugten JSON-Dateien
 * (data/parsed/schedules.json, standings.json, results.json) und
 * rendert sie in bestehende Seiten der App. Nutzt dieselben CSS-Klassen
 * wie css/style.css (.card, .event-card, .chip-*, .data-table,
 * .result-row, .empty ...), damit sich die Inhalte optisch nahtlos
 * einfügen.
 *
 * Einbindung (nach js/app.js):
 *   <script src="js/liga-data.js"></script>
 *
 * Beispiele siehe README.md, Abschnitt "Integration in die HTML-App".
 */

const LIGA_DATA_BASE = 'data/parsed/';
let ligaDataPromise = null;

/** Lädt (und cached) Spielplan/Tabelle/Ergebnisse für die aktuelle Seite. */
function loadLigaData() {
  if (!ligaDataPromise) {
    ligaDataPromise = Promise.all([
      fetchLigaJson('schedules.json'),
      fetchLigaJson('standings.json'),
      fetchLigaJson('results.json'),
    ]).then(([schedules, standings, results]) => ({ schedules, standings, results }));
  }
  return ligaDataPromise;
}

/** Holt eine JSON-Datei; gibt bei Fehlern ein leeres Array zurück statt zu werfen. */
async function fetchLigaJson(filename) {
  try {
    const response = await fetch(LIGA_DATA_BASE + filename, { cache: 'no-cache' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (err) {
    console.warn('liga-data.js: "' + filename + '" konnte nicht geladen werden.', err);
    return [];
  }
}

/** Zeigt eine einheitliche "keine Daten"-Meldung in einem Container. */
function ligaEmptyState(container, message) {
  container.innerHTML = '<div class="empty"><span class="big">🎯</span>' + escapeLigaHtml(message) + '</div>';
}

/** "2026-09-12" -> { day: "12", month: "Sep." } für die Datums-Kachel. */
function formatLigaDate(isoDate) {
  if (!isoDate) return { day: '?', month: '' };
  const date = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return { day: '?', month: '' };
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('de-DE', { month: 'short' }).replace('.', ''),
  };
}

const LIGA_STATUS_CHIPS = {
  scheduled: ['chip-neutral', 'Geplant'],
  postponed: ['chip-warn', 'Verlegt'],
  cancelled: ['chip-danger', 'Abgesagt'],
  completed: ['chip-ok', 'Beendet'],
  unknown: ['chip-neutral', 'Unbekannt'],
};

function ligaStatusChip(status) {
  const [cls, label] = LIGA_STATUS_CHIPS[status] || LIGA_STATUS_CHIPS.unknown;
  return '<span class="chip ' + cls + '">' + label + '</span>';
}

function escapeLigaHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function renderScheduleCard(entry) {
  const { day, month } = formatLigaDate(entry.date);
  const timeLine = entry.time ? '<span>🕖 ' + escapeLigaHtml(entry.time) + ' Uhr</span>' : '';
  const venueLine = entry.venue ? '<span>📍 ' + escapeLigaHtml(entry.venue) + '</span>' : '';
  return (
    '<div class="card event-card mb8">' +
    '<div class="event-date"><div class="d">' + day + '</div><div class="m">' + month + '</div></div>' +
    '<div class="event-body">' +
    '<div class="event-ttl">' + escapeLigaHtml(entry.homeTeam) + ' vs. ' + escapeLigaHtml(entry.awayTeam) + '</div>' +
    '<div class="event-meta">' + timeLine + venueLine + '</div>' +
    '<div class="event-foot">' + ligaStatusChip(entry.status) + '</div>' +
    '</div></div>'
  );
}

/**
 * Rendert die nächsten `limit` anstehenden Spiele einer Mannschaft
 * (oder aller Mannschaften, wenn `teamId` weggelassen wird).
 */
async function renderNextMatches(containerId, teamId, limit = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { schedules } = await loadLigaData();
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = schedules
    .filter((entry) => (!teamId || entry.teamId === teamId) && entry.status !== 'cancelled')
    .filter((entry) => !entry.date || entry.date >= today)
    .sort((a, b) => (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99'))
    .slice(0, limit);

  if (upcoming.length === 0) {
    ligaEmptyState(container, 'Keine anstehenden Spiele gefunden.');
    return;
  }

  container.innerHTML = upcoming.map(renderScheduleCard).join('');
}

/** Rendert den kompletten Spielplan einer Mannschaft (chronologisch). */
async function renderTeamSchedule(containerId, teamId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { schedules } = await loadLigaData();
  const items = schedules
    .filter((entry) => !teamId || entry.teamId === teamId)
    .sort((a, b) => (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99'));

  if (items.length === 0) {
    ligaEmptyState(container, 'Kein Spielplan verfügbar.');
    return;
  }

  container.innerHTML = items.map(renderScheduleCard).join('');
}

/** Rendert die Ligatabelle (oder nur die Zeile(n) einer Mannschaft). */
async function renderStandings(containerId, teamId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { standings } = await loadLigaData();
  const rows = standings
    .filter((entry) => !teamId || entry.teamId === teamId)
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  if (rows.length === 0) {
    ligaEmptyState(container, 'Keine Tabelle verfügbar.');
    return;
  }

  const body = rows
    .map((row) => {
      const record = [row.wins, row.draws, row.losses].map((v) => (v ?? '–')).join('-');
      return (
        '<tr>' +
        '<td class="rc">' + (row.position ?? '–') + '.</td>' +
        '<td class="nc">' + escapeLigaHtml(row.teamName) + '</td>' +
        '<td class="mono">' + record + '</td>' +
        '<td class="mono">' + (row.points ?? '–') + '</td>' +
        '</tr>'
      );
    })
    .join('');

  container.innerHTML =
    '<table class="data-table"><thead><tr>' +
    '<th>#</th><th>Mannschaft</th><th>S-U-N</th><th>Pkt</th>' +
    '</tr></thead><tbody>' + body + '</tbody></table>';
}

/** Rendert die letzten `limit` abgeschlossenen Ergebnisse einer Mannschaft. */
async function renderLatestResults(containerId, teamId, limit = 5) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { results } = await loadLigaData();
  const items = results
    .filter((entry) => (!teamId || entry.teamId === teamId) && entry.status === 'completed')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, limit);

  if (items.length === 0) {
    ligaEmptyState(container, 'Noch keine Ergebnisse verfügbar.');
    return;
  }

  container.innerHTML = items
    .map((match) => {
      const hasWinner = match.winner === 'home' || match.winner === 'away';
      const winner = match.winner === 'home' ? match.homeTeam : match.awayTeam;
      const loser = match.winner === 'home' ? match.awayTeam : match.homeTeam;
      const names = hasWinner
        ? '<span class="result-win">' + escapeLigaHtml(winner) + '</span> – <span class="result-lose">' + escapeLigaHtml(loser) + '</span>'
        : escapeLigaHtml(match.homeTeam) + ' – ' + escapeLigaHtml(match.awayTeam);
      const score = (match.homeScore ?? '?') + ':' + (match.awayScore ?? '?');
      return '<div class="result-row"><div>' + names + '</div><span class="result-score">' + score + '</span></div>';
    })
    .join('');
}
