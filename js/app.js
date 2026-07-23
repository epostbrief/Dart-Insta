/* ════════════════════════════════════════════════════════════════
   TSV Pilsting · Dart-App — gemeinsames JavaScript
   Wird von allen neuen App-Seiten eingebunden (index, termine,
   teams, sport, verein). Bewusst einfach gehalten: kein Build-Tool,
   keine Frameworks, keine Abhängigkeiten.
   ════════════════════════════════════════════════════════════════ */

// Bestehende Seiten, die inhaltlich zum Sport-Bereich gehören, aber
// (noch) keinen eigenen Bottom-Nav-Tab haben. Wenn eine dieser Seiten
// aktuell geöffnet ist, wird stattdessen der "Sport"-Tab hervorgehoben.
var SPORT_SUBPAGES = ['turnier.html', 'archiv.html', 'marktmeisterschaft.html', 'spielergebnis.html'];

/**
 * Markiert in der Bottom-Navigation automatisch den Tab, dessen
 * Link-Ziel dem aktuellen Dateinamen entspricht (z.B. "teams.html").
 * Für Sport-Unterseiten ohne eigenen Tab wird "sport.html" markiert.
 * Muss auf jeder Seite aufgerufen werden, die die Bottom-Nav einbindet.
 */
function initBottomNav() {
  var navItems = document.querySelectorAll('.bottom-nav .nav-item');
  if (!navItems.length) return;

  // aktueller Dateiname, z.B. "teams.html" (Fallback: "index.html")
  var path = window.location.pathname;
  var current = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  if (SPORT_SUBPAGES.indexOf(current) !== -1) {
    current = 'sport.html';
  }

  navItems.forEach(function (link) {
    var target = link.getAttribute('href');
    var isActive = target === current;
    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * Einfache Filterfunktion für Chip-Leisten (aktuell: termine.html).
 * Erwartet Filter-Chips mit [data-filter="..."] und Karten mit
 * [data-type="..."]. "alle" zeigt immer alles.
 */
function initFilterChips() {
  var chips = document.querySelectorAll('.filter-chip[data-filter]');
  var cards = document.querySelectorAll('[data-type]');
  if (!chips.length) return;

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');

      var filter = chip.dataset.filter;
      cards.forEach(function (card) {
        var show = filter === 'alle' || card.dataset.type === filter;
        card.classList.toggle('hidden', !show);
      });

      updateEmptyState(filter, cards);
    });
  });
}

/** Zeigt eine "keine Termine" Meldung, wenn ein Filter nichts trifft. */
function updateEmptyState(filter, cards) {
  var emptyEl = document.getElementById('filter-empty');
  if (!emptyEl) return;
  var visibleCount = 0;
  cards.forEach(function (card) {
    if (!card.classList.contains('hidden')) visibleCount++;
  });
  emptyEl.classList.toggle('hidden', visibleCount > 0);
}

/**
 * Zusage/Absage/Unsicher-Buttons (Teams-Seite, Termin-Karten).
 * Rein clientseitige Demo-Interaktion: setzt einen Status-Chip
 * innerhalb derselben Karte. Später durch echte Speicherung ersetzbar.
 */
function initRsvpButtons() {
  document.querySelectorAll('[data-rsvp]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('[data-rsvp-group]');
      if (!card) return;
      var status = btn.dataset.rsvp; // "ok" | "danger" | "warn"
      var chip = card.querySelector('[data-rsvp-status]');
      if (chip) {
        chip.className = 'chip chip-' + status;
        chip.textContent = btn.dataset.rsvpLabel || btn.textContent.trim();
      }
      card.querySelectorAll('[data-rsvp]').forEach(function (b) {
        b.classList.toggle('btn-primary', b === btn);
        b.classList.toggle('btn-outline', b !== btn);
      });
    });
  });
}

/** Kleine Hilfsfunktion: aktuelles Datum hübsch formatiert (de-DE). */
function formatToday() {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long'
  });
}

/** Füllt alle Elemente mit [data-today] mit dem heutigen Datum. */
function fillTodayLabels() {
  document.querySelectorAll('[data-today]').forEach(function (el) {
    el.textContent = formatToday();
  });
}

// Beim Laden jeder Seite: gemeinsame Initialisierung ausführen.
document.addEventListener('DOMContentLoaded', function () {
  initBottomNav();
  initFilterChips();
  initRsvpButtons();
  fillTodayLabels();
});
