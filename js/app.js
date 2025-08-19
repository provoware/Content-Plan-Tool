/*
 * Hauptskript des Jahrescontent‑Kalenders.
 *
 * Dieses Modul organisiert die Datenstruktur, rendert den Kalender,
 * synchronisiert das UI (inklusive Dashboard und Drawer) und kümmert
 * sich um das Speichern und Wiederherstellen der Daten. Es wurde
 * hinsichtlich einer klaren Trennung von Logik und Darstellung
 * strukturiert. Fehlende Einträge werden automatisiert repariert
 * (Self‑Repair). Speicherzugriffe sind über einen sicheren Wrapper
 * gekapselt, der bei Ausfall des Browserspeichers auf einen
 * In‑Memory‑Fallback zurückfällt.
 */
(function() {
  'use strict';
  /* Hilfsfunktionen */
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const byId = id => document.getElementById(id);
  const fmt2 = n => String(n).padStart(2, '0');
  const today = new Date();
  const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const STORAGE_KEY = 'provoware_calendar_state';
  const BACKUP_KEY = 'provoware_calendar_backup';
  const THEME_KEY = 'provoware_theme';
  const FS_KEY = 'provoware_fs';
  const PALETTE_KEY = 'provoware_palette';
  const TIMEFMT_KEY = 'provoware_timefmt';

  /* Farben für Monatsrahmen und Überschriften. Diese Liste wird
     zyklisch verwendet, um jedem Monat eine eigene Akzentfarbe
     zuzuweisen. Sie orientiert sich an den farbigen Kacheln im
     bereitgestellten LAYOUT: kräftige Töne für bessere
     Unterscheidbarkeit. */
  const MONTH_COLORS = [
    '#eab308', // gelb
    '#10b981', // grün
    '#3b82f6', // blau
    '#ec4899', // pink
    '#f97316', // orange
    '#8b5cf6', // violett
    '#ef4444', // rot
    '#0ea5e9', // cyan
    '#14b8a6', // teal
    '#facc15', // gold
    '#f472b6', // rose
    '#22d3ee'  // hellblau
  ];

  /* Auto‑Speichern und Debugging */
  // Flag, ob periodisches Autosave aktiv ist
  let autosaveEnabled = true;
  // ID des Autosave‑Intervalls (wird bei Aktivierung gesetzt)
  let autosaveInterval = null;

  /* Speicher‑Wrapper mit Fallback */
  const memStore = {};
  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return memStore[key] || null;
    }
  }
  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      memStore[key] = value;
      updateStatus('Speichern im lokalen Speicher fehlgeschlagen, Fallback genutzt');
      console.warn('localStorage set failed', err);
    }
  }
  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      delete memStore[key];
    }
  }

  // Prüfe Unterstützung für Browser-Speicher und weise darauf hin
  if (!('localStorage' in window)) {
    const st = document.getElementById('status');
    if (st) st.textContent = 'Warnung: kein Browser-Speicher verfügbar';
  }
  // Globales Fehler-Handling: zeige Meldung im Statusbereich
  window.addEventListener('error', e => {
    const st = document.getElementById('status');
    if (st) st.textContent = 'Fehler: ' + e.message;
  });
  // Fange unbehandelte Promise-Ablehnungen ab
  window.addEventListener('unhandledrejection', e => {
    const st = document.getElementById('status');
    if (st) st.textContent = 'Fehler: ' + e.reason;
  });

  /* Zustand laden oder initialisieren */
  let state = loadState() || initState(today.getFullYear());
  const history = typeof createHistory === 'function' ? createHistory() : {
    push() {},
    undo() { return null; },
    redo() { return null; },
    canUndo() { return false; },
    canRedo() { return false; },
    getCurrent() { return null; }
  };
  let timeFormat = safeGet(TIMEFMT_KEY);
  if (timeFormat !== '12' && timeFormat !== '24') timeFormat = '24';
  let previousState = JSON.stringify(state);
  history.push(previousState);

  function initState(year) {
    return {
      year: year,
      items: {},
      log: [],
      theme: normalizeTheme(safeGet(THEME_KEY) || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dunkel' : 'hell')),
      fontsize: safeGet(FS_KEY) || '16',
      palette: safeGet(PALETTE_KEY) || 'blue'
    };
  }

  function loadState() {
    try {
      const raw = safeGet(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      updateStatus('Zustand beschädigt, neu initialisiert');
      return null;
    }
  }
  function persistState() {
    history.push(previousState);
    previousState = JSON.stringify(state);
    try {
      safeSet(STORAGE_KEY, previousState);
      safeSet(THEME_KEY, state.theme);
      safeSet(FS_KEY, state.fontsize);
      safeSet(PALETTE_KEY, state.palette);
      updateStatus('Alle Änderungen gespeichert');
    } catch (err) {
      updateStatus('Speichern fehlgeschlagen');
    }
    updateDashboard();
    // Debug‑Status aktualisieren
    renderDebugStatus();
    updateUndoRedoButtons();
  }

  function undo() {
    const prev = history.undo();
    if (!prev) {
      updateStatus('Nichts zum Rückgängigmachen');
      return;
    }
    previousState = prev;
    state = JSON.parse(previousState);
    try {
      safeSet(STORAGE_KEY, previousState);
      safeSet(THEME_KEY, state.theme);
      safeSet(FS_KEY, state.fontsize);
      safeSet(PALETTE_KEY, state.palette);
      updateStatus('Änderung rückgängig gemacht');
    } catch (err) {
      updateStatus('Rückgängig fehlgeschlagen');
    }
    renderCalendar();
    updateDashboard();
    renderDebugStatus();
    updateUndoRedoButtons();
  }

  function redo() {
    const next = history.redo();
    if (!next) {
      updateStatus('Nichts zum Wiederholen');
      return;
    }
    previousState = next;
    state = JSON.parse(previousState);
    try {
      safeSet(STORAGE_KEY, previousState);
      safeSet(THEME_KEY, state.theme);
      safeSet(FS_KEY, state.fontsize);
      safeSet(PALETTE_KEY, state.palette);
      updateStatus('Wiederhergestellt');
    } catch (err) {
      updateStatus('Wiederherstellen fehlgeschlagen');
    }
    renderCalendar();
    updateDashboard();
    renderDebugStatus();
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    const undoBtn = byId('undo-btn');
    if (undoBtn) {
      const dis = !history.canUndo();
      undoBtn.disabled = dis;
      undoBtn.setAttribute('aria-disabled', dis ? 'true' : 'false');
    }
    const redoBtn = byId('redo-btn');
    if (redoBtn) {
      const dis = !history.canRedo();
      redoBtn.disabled = dis;
      redoBtn.setAttribute('aria-disabled', dis ? 'true' : 'false');
    }
  }
  /* Auto‑Backup nach 5 Minuten, falls noch keines vorhanden */
  setTimeout(() => {
    if (!safeGet(BACKUP_KEY)) {
      safeSet(BACKUP_KEY, JSON.stringify(state));
      logEvent('Auto‑Backup angelegt');
      updateStatus('Auto‑Backup gespeichert');
      renderLog();
    }
  }, 5 * 60 * 1000);

  function updateStatus(text) {
    const statusEl = byId('status');
    if (statusEl) statusEl.textContent = text;
  }

  // Zeigt Speicherstatus und Zustandgröße im Debugbereich an
  function renderDebugStatus() {
    const stEl = byId('debug-storage');
    const szEl = byId('debug-size');
    // Prüfe localStorage Verfügbarkeit
    if (stEl) {
      let available = true;
      try {
        const testKey = '__prov_test';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
      } catch (err) {
        available = false;
      }
      stEl.textContent = available ? 'localStorage verfügbar' : 'Fallback (nur temporär)';
    }
    if (szEl) {
      try {
        const bytes = JSON.stringify(state).length;
        const kb = bytes / 1024;
        szEl.textContent = kb.toFixed(1) + ' KB';
      } catch (err) {
        szEl.textContent = '–';
      }
    }
  }

  // Startet oder stoppt den Autosave entsprechend des Schalters
  function startAutoSave() {
    // Aufräumen bestehender Intervalle
    if (autosaveInterval) {
      clearInterval(autosaveInterval);
      autosaveInterval = null;
    }
    if (autosaveEnabled) {
      autosaveInterval = setInterval(() => {
        persistState();
        logEvent('Autosave ausgeführt');
        renderLog();
      }, 5 * 60 * 1000);
    }
  }

  function logEvent(msg) {
    const t = new Date();
    state.log.unshift(`${t.toLocaleString()} — ${msg}`);
    state.log = state.log.slice(0, 250);
  }

  /* Theme & Palette anwenden */
  function applyTheme(val) {
    val = normalizeTheme(val);
    document.documentElement.setAttribute('data-theme', val);
    state.theme = val;
    safeSet(THEME_KEY, val);
  }
  function applyFontSize(px) {
    document.documentElement.style.setProperty('--fs-base', `${px}px`);
    state.fontsize = px;
    safeSet(FS_KEY, px);
  }
  const PALETTES = {
    blue: { primary: '#1d4ed8', accent: '#0ea5e9' },
    green: { primary: '#16a34a', accent: '#22c55e' },
    violet:{ primary: '#7c3aed', accent: '#a78bfa' },
    red:  { primary: '#dc2626', accent: '#ef4444' }
  };
  function applyPalette(name) {
    const pal = PALETTES[name] || PALETTES.blue;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--primary', pal.primary);
    rootStyle.setProperty('--accent', pal.accent);
    // Berechne automatisierte Textfarbe auf Buttons anhand Luminanz
    const lum = luminance(...Object.values(hexToRgb(pal.primary)));
    rootStyle.setProperty('--btn-on-primary', lum > 0.6 ? '#000000' : '#ffffff');
    state.palette = name;
    safeSet(PALETTE_KEY, name);
  }
  function luminance(r,g,b) {
    r/=255; g/=255; b/=255;
    const a=[r,g,b].map(v => v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2];
  }

  /* Initialisierung der UI */
  function initUI() {
    // Navigation: show/hide modules
    $$('#sidebar .nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        // Toggle nav active state
        $$('#sidebar .nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Show corresponding section
        $$('#main .module').forEach(sec => sec.classList.remove('active'));
        const tgt = byId(`${target}-section`);
        if (tgt) tgt.classList.add('active');
      });
    });
    // Sidebar toggle for mobile
    const menuToggle = byId('menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        byId('sidebar').classList.toggle('open');
      });
    }
    // Clear data button
    const clearBtn = byId('clear-data-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Möchtest du wirklich alle Daten löschen?')) {
          state.items = {};
          state.log = [];
          persistState();
          renderCalendar();
          updateDashboard();
          renderLog();
        }
      });
    }
    // Backup button
    const exportJsonBtn = byId('export-json-btn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        exportJSON();
      });
    }
    // Logout button: einfach Speicher löschen
    const logoutBtn = byId('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Speicher wirklich zurücksetzen?')) {
          safeRemove(STORAGE_KEY);
          safeRemove(BACKUP_KEY);
          safeRemove(THEME_KEY);
          safeRemove(FS_KEY);
          safeRemove(PALETTE_KEY);
          state = initState(today.getFullYear());
          buildSelectors();
          renderCalendar();
          renderDashboardStructure();
          updateClock();
          updateDashboard();
          renderLog();
          updateStatus('Zurückgesetzt');
        }
      });
    }
    // Settings form: will be populated via buildSelectors() and applyTheme

    // Debugging‑initialisierung wird separat über initDebug() durchgeführt
  }

  /* Dashboard Struktur aufbauen (wird in Info‑Panel gerendert) */
  function renderDashboardStructure() {
    const container = byId('dashboard');
    if (!container) return;
    container.innerHTML = '';
    container.innerHTML = `
      <div class="dash-section">
        <div class="dash-title">Jetzt</div>
        <div class="row">
          <time id="dash-clock" class="pill" datetime="" title="Aktuelles Datum und Uhrzeit – zum Kopieren klicken" aria-live="polite" role="timer" tabindex="0" aria-label="Aktuelle Uhrzeit und Datum">--:--</time>
          <button id="time-format-btn" class="pill" type="button" aria-pressed="false" title="Zeitformat 24 Stunden – klicken zum Umstellen">24 h</button>
        </div>
      </div>
      <div class="dash-section">
        <div class="dash-title">Aktueller Monat</div>
        <div class="row">
          <span id="dash-month-name" class="pill" title="Monatsname">—</span>
          <span id="dash-count-free" class="pill" title="Freie Tage"><span>Frei:</span> <strong>0</strong></span>
          <span id="dash-count-used" class="pill" title="Belegte Tage"><span>Belegt:</span> <strong>0</strong></span>
        </div>
        <div class="legend">
          <span class="pill"><span class="dot" style="background:var(--today-bg);border-color:var(--today-bd);width:.8rem;height:.8rem;border-radius:50%;display:inline-block;margin-right:.3rem;"></span>Heute</span>
          <span class="pill"><span class="dot" style="background:var(--free-bg);border-color:var(--free-bd);width:.8rem;height:.8rem;border-radius:50%;display:inline-block;margin-right:.3rem;"></span>Frei</span>
          <span class="pill"><span class="dot" style="background:var(--used-bg);border-color:var(--used-bd);width:.8rem;height:.8rem;border-radius:50%;display:inline-block;margin-right:.3rem;"></span>Belegt</span>
        </div>
        <div class="muted">Offene Datumsangaben (klick zum Springen)</div>
        <div id="open-days" class="list"></div>
        <div class="row" style="gap:.5rem;margin-top:.5rem;">
          <button id="btn-export-open" class="secondary small">Offene Tage TXT</button>
          <button id="btn-month-txt" class="secondary small">Monat TXT</button>
        </div>
      </div>
      <div class="dash-section">
        <div class="dash-title">Nächste To‑Dos</div>
        <div id="upcoming" class="list"></div>
      </div>
      <div class="dash-section">
        <div class="dash-title">Notizen</div>
        <textarea id="notes" placeholder="Kurznotizen…"></textarea>
      </div>
      <div class="dash-section">
        <div class="dash-title">Letzte Ereignisse</div>
        <div id="event-log"></div>
        <div class="row" style="gap:.5rem;margin-top:.5rem;">
          <button id="btn-clear-log" class="secondary small">Log leeren</button>
          <button id="btn-scan-dupes" class="secondary small">Duplikate prüfen</button>
        </div>
      </div>
      <div class="dash-section">
        <div class="dash-title">Tipps</div>
        <ul class="muted" style="margin:0;padding-left:1rem;font-size:var(--fs-sm);">
          <li><kbd>T</kbd> – heute; <kbd>F</kbd> – freier Tag; <kbd>S</kbd> – speichern; <kbd>Esc</kbd> – schließen</li>
          <li>Speichert beim Verlassen von Feldern oder Schließen</li>
          <li>Monate lassen sich maximieren (Max) oder im Vollbild anzeigen</li>
        </ul>
      </div>
    `;
    // Event handlers for dashboard buttons
    byId('btn-export-open')?.addEventListener('click', exportOpenDaysTXT);
    byId('btn-month-txt')?.addEventListener('click', exportCurrentMonthTXT);
    byId('btn-clear-log')?.addEventListener('click', () => {
      if (confirm('Log wirklich leeren?')) {
        state.log = [];
        persistState();
        renderLog();
      }
    });
    byId('btn-scan-dupes')?.addEventListener('click', scanDuplicates);
    const clk = byId('dash-clock');
    if (clk) {
      clk.onclick = copyClock;
      clk.onkeydown = e => { if (e.key === 'Enter') copyClock(); };
    }
    const fmtBtn = byId('time-format-btn');
    if (fmtBtn) {
      fmtBtn.onclick = toggleTimeFormat;
      fmtBtn.onkeydown = e => { if (e.key === 'Enter') toggleTimeFormat(); };
      updateTimeFormatButton();
    }
    // Notes persistence
    const notesArea = byId('notes');
    if (notesArea) {
      notesArea.value = safeGet('provoware_notes') || '';
      notesArea.addEventListener('blur', () => {
        safeSet('provoware_notes', notesArea.value || '');
        logEvent('Notizen gespeichert');
        renderLog();
      });
    }
  }

  function updateClock() {
    const clock = byId('dash-clock');
    if (!clock) return;
    try {
      const now = new Date();
      const txt = (typeof formatDateTime === 'function')
        ? formatDateTime(now, timeFormat === '12')
        : now.toLocaleString();
      clock.textContent = txt;
      clock.dateTime = now.toISOString();
      clock.setAttribute('aria-label', 'Aktuell ' + txt);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      clock.title = `Aktuelles Datum und Uhrzeit – Zeitzone: ${tz} – zum Kopieren klicken`;
    } catch (err) {
      clock.textContent = 'Zeit unbekannt';
      clock.setAttribute('aria-label', 'Zeit unbekannt');
    }
  }

  function updateTimeFormatButton() {
    const btn = byId('time-format-btn');
    if (!btn) return;
    const is12 = timeFormat === '12';
    btn.setAttribute('aria-pressed', String(is12));
    btn.textContent = is12 ? '12 h' : '24 h';
    btn.title = `Zeitformat ${is12 ? '12 Stunden' : '24 Stunden'} – klicken zum Umstellen`;
  }

  function toggleTimeFormat() {
    timeFormat = timeFormat === '24' ? '12' : '24';
    safeSet(TIMEFMT_KEY, timeFormat);
    updateTimeFormatButton();
    updateClock();
    updateStatus('Zeitformat: ' + (timeFormat === '12' ? '12 Stunden' : '24 Stunden'));
  }

  function copyClock() {
    const clock = byId('dash-clock');
    if (!clock) return;
    const text = clock.textContent || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        updateStatus('Datum/Uhrzeit kopiert');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      updateStatus(ok ? 'Datum/Uhrzeit kopiert' : 'Kopieren nicht möglich');
    } catch (err) {
      updateStatus('Kopieren nicht möglich');
    }
  }

  /* Kalender rendern */
  function renderCalendar() {
    const cal = byId('calendar');
    if (!cal) return;
    cal.innerHTML = '';
    // Sortiere Monate: aktueller Monat nach oben, wenn im aktuellen Jahr
    const order = monthOrderForYear(state.year);
    order.forEach(m => {
      const monthEl = document.createElement('section');
      monthEl.className = 'month';
      monthEl.setAttribute('data-month', m);
      // Weisen Sie jedem Monat eine individuelle Akzentfarbe zu. Die
      // Akzentfarbe wird sowohl als Rahmenfarbe als auch als
      // Schatten verwendet, um die optische Nähe zum Layout
      // hervorzuheben. Zusätzlich erhält die Kopfzeile eine
      // halbtransparente Hintergrundfarbe.
      const mColor = MONTH_COLORS[m % MONTH_COLORS.length];
      monthEl.style.borderColor = mColor;
      monthEl.style.boxShadow = `0 0 0 2px ${mColor}`;
      // Header
      const header = document.createElement('div');
      header.className = 'month-header';
      header.innerHTML = `
        <div class="month-name">${MONTHS[m]} ${state.year}</div>
        <div class="month-stats" id="stats-${m}">—</div>
        <div class="month-actions">
          <button type="button" class="btn-max" title="Monat maximieren">Max</button>
          <button type="button" class="btn-full" title="Monat als Vollbild öffnen (Esc schließt, Strg+Shift+F)" aria-label="Vollbild umschalten" aria-pressed="false">Vollbild</button>
          <button type="button" class="btn-overview" title="Monatsübersicht öffnen">Info</button>
        </div>
      `;
      // Kopfzeile mit transparenter Akzentfarbe hinterlegen
      header.style.background = hexToRgba(mColor, 0.15);
      // Grid
      const grid = document.createElement('div');
      grid.className = 'grid';
      // Wochentage
      ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(d => {
        const w = document.createElement('div');
        w.className = 'weekday';
        w.textContent = d;
        grid.appendChild(w);
      });
      // Bestimme Startindex und Anzahl Tage
      const first = new Date(state.year, m, 1);
      const startIdx = (first.getDay() + 6) % 7;
      const daysInMonth = new Date(state.year, m + 1, 0).getDate();
      // Leere Felder am Monatsanfang
      for (let i = 0; i < startIdx; i++) grid.appendChild(document.createElement('div'));
      // Tage generieren
      for (let d = 1; d <= daysInMonth; d++) {
        const ymd = `${state.year}-${fmt2(m + 1)}-${fmt2(d)}`;
        const item = state.items[ymd];
        const used = isUsed(item);
        const isToday = (state.year === today.getFullYear() && m === today.getMonth() && d === today.getDate());
        const day = document.createElement('div');
        day.className = 'day ' + (used ? 'used' : 'free') + (isToday ? ' today' : '');
        day.setAttribute('data-ymd', ymd);
        // Kopfzeile
        const headerEl = document.createElement('div');
        headerEl.className = 'day-header';
        const num = document.createElement('span');
        num.className = 'day-num';
        num.textContent = d;
        const stateEl = document.createElement('span');
        stateEl.className = 'state';
        // Heute Badge
        if (isToday) {
          const b = document.createElement('span');
          b.className = 'badge today';
          b.textContent = 'Heute';
          stateEl.appendChild(b);
        }
        // To‑Do Badge
        const todos = (item?.todos || []);
        const openTodos = todos.filter(t => !t.done).length;
        const doneTodos = todos.filter(t => t.done).length;
        if (openTodos || doneTodos) {
          const b = document.createElement('span');
          b.className = 'badge todos';
          b.textContent = `${openTodos}/${openTodos + doneTodos}`;
          stateEl.appendChild(b);
        }
        // Status Badge (frei/belegt)
        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge ' + (used ? 'used' : 'free');
        statusBadge.textContent = used ? 'belegt' : 'frei';
        stateEl.appendChild(statusBadge);
        headerEl.appendChild(num);
        headerEl.appendChild(stateEl);
        day.appendChild(headerEl);
        // Quick Input (Titel)
        const quick = document.createElement('div');
        quick.className = 'quick';
        const ti = document.createElement('input');
        ti.type = 'text';
        ti.placeholder = 'Titel…';
        ti.value = item?.title || '';
        quick.appendChild(ti);
        // Chips
        const extras = (item?.titles || []).filter(t => t && t.trim());
        if (extras.length) {
          const chips = document.createElement('div');
          chips.className = 'chips';
          extras.forEach(e => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.textContent = e.length > 24 ? `${e.slice(0,24)}…` : e;
            chips.appendChild(chip);
          });
          quick.appendChild(chips);
        }
        // Vorschau Beschreibung
        if (item?.desc) {
          const preview = document.createElement('div');
          preview.className = 'muted';
          const s = String(item.desc);
          preview.textContent = s.length > 60 ? `${s.slice(0,60)}…` : s;
          quick.appendChild(preview);
        }
        // Vorschau To‑Dos (Texte kommagetrennt). Zeige die ersten
        // Einträge an, damit im Monatskalender ersichtlich ist, was zu tun ist.
        const todoNames = (item?.todos || []).map(t => t.text || '').filter(t => t.trim());
        if (todoNames.length) {
          const tp = document.createElement('div');
          tp.className = 'todo-preview';
          const joined = todoNames.join(', ');
          tp.textContent = joined.length > 60 ? `${joined.slice(0,60)}…` : joined;
          quick.appendChild(tp);
        }
        day.appendChild(quick);
        // Event: Öffnen Drawer
        day.addEventListener('click', ev => {
          // Nicht öffnen, wenn im Eingabefeld geklickt
          if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
          openDrawer(ymd);
        });
        // Inline Titel bearbeiten
        ti.addEventListener('input', e => {
          const obj = (state.items[ymd] ||= {});
          obj.title = e.target.value;
          updateCellStatus(day, ymd);
          updateDashboard();
        });
        ti.addEventListener('blur', () => {
          persistState();
          logEvent(`Titel gespeichert: ${ymd}`);
          renderLog();
        });
        grid.appendChild(day);
      }
      monthEl.appendChild(header);
      monthEl.appendChild(grid);
      cal.appendChild(monthEl);
      // Aktionen
      const btnMax = monthEl.querySelector('.btn-max');
      // Maximieren: Zeigt den ausgewählten Monat alleine an und blendet die anderen aus.
      btnMax.addEventListener('click', () => {
        const isNowMax = monthEl.classList.toggle('maximized');
        // Hol alle Monate im Kalender
        document.querySelectorAll('.month').forEach(mEl => {
          if (isNowMax) {
            // Blende alle anderen Monate aus, damit der maximierte Monat die gesamte Breite einnimmt.
            if (mEl !== monthEl) mEl.classList.add('hidden');
            else {
              // Stelle sicher, dass der aktive Monat die volle Breite nutzt.
              mEl.style.gridColumn = '1 / -1';
              mEl.style.width = '100%';
            }
          } else {
            // Rückgängig: Zeige alle Monate an und entferne spezifische Breiten.
            mEl.classList.remove('hidden');
            mEl.style.gridColumn = '';
            mEl.style.width = '';
            mEl.classList.remove('maximized');
          }
        });
      });
      monthEl.querySelector('.btn-full').addEventListener('click', ev => toggleFullscreen(monthEl, ev.currentTarget));
      monthEl.querySelector('.btn-overview').addEventListener('click', () => openOverview('month', m));
      updateMonthStats(m);
    });
  }
  let currentFullscreen = null;
  function requestFs(el) {
    const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || el.mozRequestFullScreen;
    if (fn) return fn.call(el);
    return Promise.reject(new Error('Fullscreen API nicht verfügbar'));
  }
  function exitFs() {
    const fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen || document.mozCancelFullScreen;
    return fn ? fn.call(document) : Promise.resolve();
  }
  function toggleFullscreen(monthEl, btn) {
    const isFull = currentFullscreen === monthEl;
    if (isFull) {
      exitFs().catch(() => {}).finally(() => {
        monthEl.classList.remove('fullscreen');
        document.body.removeAttribute('data-fullscreen');
        btn?.setAttribute('aria-pressed', 'false');
        currentFullscreen = null;
        updateStatus('Vollbild beendet');
      });
    } else {
      if (!document.fullscreenEnabled) {
        monthEl.classList.add('fullscreen');
        document.body.setAttribute('data-fullscreen', '1');
        btn?.setAttribute('aria-pressed', 'true');
        currentFullscreen = monthEl;
        updateStatus('Vollbild (Fallback)');
        return;
      }
      requestFs(monthEl).then(() => {
        monthEl.classList.add('fullscreen');
        document.body.setAttribute('data-fullscreen', '1');
        btn?.setAttribute('aria-pressed', 'true');
        currentFullscreen = monthEl;
        updateStatus('Vollbild aktiviert');
      }).catch(err => {
        console.warn('Fullscreen fehlgeschlagen', err);
        updateStatus('Vollbild nicht möglich');
        monthEl.classList.add('fullscreen');
        document.body.setAttribute('data-fullscreen', '1');
        btn?.setAttribute('aria-pressed', 'true');
        currentFullscreen = monthEl;
      });
    }
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && currentFullscreen) {
      currentFullscreen.classList.remove('fullscreen');
      document.body.removeAttribute('data-fullscreen');
      const b = currentFullscreen.querySelector('.btn-full');
      if (b) b.setAttribute('aria-pressed', 'false');
      updateStatus('Vollbild beendet');
      currentFullscreen = null;
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && currentFullscreen) {
      toggleFullscreen(currentFullscreen, currentFullscreen.querySelector('.btn-full'));
    }
  });
  function isUsed(it) {
    if (!it) return false;
    if ((it.title && it.title.trim()) || (it.desc && it.desc.trim()) || (it.tags && it.tags.trim())) return true;
    if (Array.isArray(it.titles) && it.titles.some(t => t && t.trim())) return true;
    if (Array.isArray(it.todos) && it.todos.length) return true;
    return false;
  }
  function updateCellStatus(cell, ymd) {
    const it = state.items[ymd] || {};
    const used = isUsed(it);
    cell.classList.toggle('used', used);
    cell.classList.toggle('free', !used);
    const badge = cell.querySelector('.state .badge:last-child');
    if (badge) {
      badge.textContent = used ? 'belegt' : 'frei';
      badge.className = 'badge ' + (used ? 'used' : 'free');
    }
    const q = cell.querySelector('input[type="text"]');
    if (q && q.value !== (it.title || '')) q.value = it.title || '';
  }
  function updateMonthStats(m) {
    const daysInMonth = new Date(state.year, m+1, 0).getDate();
    let used = 0;
    for (let d=1; d<=daysInMonth; d++) {
      const ymd = `${state.year}-${fmt2(m+1)}-${fmt2(d)}`;
      if (isUsed(state.items[ymd])) used++;
    }
    const free = daysInMonth - used;
    const el = byId(`stats-${m}`);
    if (el) el.textContent = `frei ${free} • belegt ${used}`;
    // Aktueller Monat Dashboard aktualisieren
    if (m === ((state.year === today.getFullYear()) ? today.getMonth() : 0)) {
      updateDashboard();
    }
  }
  function monthOrderForYear(y) {
    if (y === today.getFullYear()) {
      const s = today.getMonth();
      return Array.from({length:12}, (_,i) => (s + i) % 12);
    }
    return Array.from({length:12}, (_,i) => i);
  }
  /* Drawer Funktionen */
  let currentYMD = null;
  function openDrawer(ymd) {
    currentYMD = ymd;
    const d = new Date(ymd);
    byId('drawer-date').textContent = d.toLocaleDateString('de-DE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const data = state.items[ymd] || { title:'', titles:[], desc:'', tags:'', todos:[] };
    byId('title').value = data.title || '';
    byId('desc').value = data.desc || '';
    byId('tags').value = data.tags || '';
    renderExtraTitles(data.titles || []);
    renderTodos(data.todos || []);
    updateCharCount();
    markDupesIndicator(ymd);
    byId('drawer').classList.add('open');
    // Fokus auf Titel
    setTimeout(() => {
      const titleEl = byId('title');
      if (titleEl) titleEl.focus();
    }, 50);
  }
  function closeDrawer() {
    byId('drawer').classList.remove('open');
    currentYMD = null;
    persistState();
  }
  function renderExtraTitles(list) {
    const box = byId('extraTitles');
    box.innerHTML = '';
    (list || []).forEach((val, idx) => {
      const row = document.createElement('div');
      row.className = 'row';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = val || '';
      input.setAttribute('aria-label', `Zusatz‑Titel ${idx+1}`);
      const del = document.createElement('button');
      del.className = 'secondary small';
      del.textContent = '–';
      del.title = 'Entfernen';
      del.onclick = () => {
        const t = (state.items[currentYMD].titles ||= []);
        t.splice(idx, 1);
        renderExtraTitles(t);
        refreshCell(currentYMD);
      };
      input.oninput = e => {
        const t = (state.items[currentYMD].titles ||= []);
        t[idx] = e.target.value;
        updateCharCount();
        refreshCell(currentYMD);
      };
      input.onblur = () => {
        persistState();
        logEvent('Zusatz‑Titel gespeichert');
        renderLog();
      };
      row.appendChild(input);
      row.appendChild(del);
      box.appendChild(row);
    });
  }
  byId('btn-add-title').addEventListener('click', () => {
    if (!currentYMD) return;
    const it = (state.items[currentYMD] ||= {});
    it.titles = it.titles || [];
    it.titles.push('');
    renderExtraTitles(it.titles);
  });
  function renderTodos(list) {
    const box = byId('todoList');
    box.innerHTML = '';
    (list || []).forEach((todo, idx) => {
      const row = document.createElement('div');
      row.className = 'todo-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!todo.done;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = todo.text || '';
      const del = document.createElement('button');
      del.className = 'secondary small';
      del.textContent = '–';
      del.title = 'Löschen';
      cb.onchange = () => {
        const arr = (state.items[currentYMD].todos ||= []);
        arr[idx].done = cb.checked;
        refreshCell(currentYMD);
        updateDashboard();
        persistState();
        logEvent('To‑Do Status geändert');
        renderLog();
      };
      inp.oninput = e => {
        const arr = (state.items[currentYMD].todos ||= []);
        arr[idx].text = e.target.value;
        updateCharCount();
      };
      inp.onblur = () => {
        persistState();
        logEvent('To‑Do gespeichert');
        renderLog();
      };
      del.onclick = () => {
        const arr = (state.items[currentYMD].todos ||= []);
        arr.splice(idx, 1);
        renderTodos(arr);
        refreshCell(currentYMD);
        updateDashboard();
        persistState();
      };
      row.appendChild(cb);
      row.appendChild(inp);
      row.appendChild(del);
      box.appendChild(row);
    });
  }
  byId('btn-add-todo').addEventListener('click', () => {
    if (!currentYMD) return;
    const it = (state.items[currentYMD] ||= {});
    it.todos = it.todos || [];
    it.todos.push({ text:'', done:false });
    renderTodos(it.todos);
    refreshCell(currentYMD);
    updateDashboard();
  });
  function refreshCell(ymd) {
    const cell = document.querySelector(`.day[data-ymd="${ymd}"]`);
    if (!cell) return;
    updateCellStatus(cell, ymd);
    // Chips neu zeichnen
    const it = state.items[ymd] || {};
    const extras = (it.titles || []).filter(x => x && x.trim());
    let chips = cell.querySelector('.chips');
    if (!chips) {
      chips = document.createElement('div');
      chips.className = 'chips';
      cell.querySelector('.quick').appendChild(chips);
    }
    chips.innerHTML = extras.map(e => `<span class="chip">${e.length>24 ? e.slice(0,24)+'…' : e}</span>`).join('');
    // To‑Do Badge
    const badge = cell.querySelector('.state .badge.todos');
    const todos = (it.todos || []);
    const open = todos.filter(t => !t.done).length;
    const done = todos.filter(t => t.done).length;
    if (badge) {
      badge.textContent = open || done ? `${open}/${open+done}` : '';
    }

    // To‑Do Vorschau aktualisieren
    const todoPrev = cell.querySelector('.todo-preview');
    const todoNames = todos.map(t => t.text || '').filter(t => t && t.trim());
    const joined = todoNames.join(', ');
    if (todoPrev) {
      if (todoNames.length) {
        todoPrev.textContent = joined.length > 60 ? `${joined.slice(0,60)}…` : joined;
      } else {
        todoPrev.remove();
      }
    } else if (todoNames.length) {
      // Erstelle Vorschau, falls sie noch nicht existiert
      const tp = document.createElement('div');
      tp.className = 'todo-preview';
      tp.textContent = joined.length > 60 ? `${joined.slice(0,60)}…` : joined;
      cell.querySelector('.quick').appendChild(tp);
    }

    // Monatstatistik aktualisieren
    try {
      const monthIndex = new Date(ymd).getMonth();
      updateMonthStats(monthIndex);
    } catch (err) {
      // Ignorieren, falls Datum nicht geparst werden kann
    }
  }
  function updateCharCount() {
    if (!currentYMD) {
      byId('charcount').textContent = '0';
      return;
    }
    const it = state.items[currentYMD] || {};
    const extras = (it.titles || []).join('');
    const todos = (it.todos || []).map(x => x.text || '').join('');
    const count = (it.title || '').length + (it.desc || '').length + (it.tags || '').length + extras.length + todos.length;
    byId('charcount').textContent = String(count);
  }
  // Haupt, Desc, Tags
  ['title','desc','tags'].forEach(id => {
    const el = byId(id);
    el.addEventListener('input', () => {
      if (!currentYMD) return;
      const data = (state.items[currentYMD] ||= {});
      data[id] = el.value;
      updateCharCount();
      refreshCell(currentYMD);
    });
    el.addEventListener('blur', () => {
      persistState();
      logEvent('Feld gespeichert');
      renderLog();
    });
  });
  // Drawer Buttons
  byId('btn-quick-used').addEventListener('click', () => {
    if (!currentYMD) return;
    const it = (state.items[currentYMD] ||= {});
    if (!isUsed(it)) it.title = 'Belegt';
    refreshCell(currentYMD);
    persistState();
    updateDashboard();
  });
  byId('btn-quick-free').addEventListener('click', () => {
    if (!currentYMD) return;
    delete state.items[currentYMD];
    refreshCell(currentYMD);
    persistState();
    updateDashboard();
  });
  byId('btn-drawer-save').addEventListener('click', () => {
    if (currentYMD) {
      persistState();
      logEvent(`Gespeichert: ${currentYMD}`);
      renderLog();
    }
  });
  byId('btn-drawer-clear').addEventListener('click', () => {
    if (!currentYMD) return;
    if (confirm('Inhalt löschen?')) {
      delete state.items[currentYMD];
      refreshCell(currentYMD);
      persistState();
      logEvent(`Gelöscht: ${currentYMD}`);
      renderLog();
      updateDashboard();
    }
  });
  byId('btn-drawer-close').addEventListener('click', () => {
    closeDrawer();
  });

  /* Modal (Übersichten) */
  function openOverview(mode, mIndex=null) {
    const modal = byId('modal');
    const content = byId('modal-content');
    const titleEl = byId('modal-title');
    if (mode === 'month') {
      const rows = buildMonthRows(mIndex);
      titleEl.textContent = `Monatsübersicht – ${MONTHS[mIndex]} ${state.year}`;
      content.innerHTML = `
        <table><thead><tr><th>Datum</th><th>Titel</th><th>Zusatz</th><th>Beschreibung</th><th>Tags</th><th>To‑Dos (offen/erledigt)</th></tr></thead><tbody>
        ${rows.map(r => {
          const o = r.todos.filter(t => !t.done).length;
          const d = r.todos.filter(t => t.done).length;
          return `<tr><td>${r.day}.${fmt2(mIndex+1)}.${state.year}</td><td>${esc(r.title)}</td><td>${esc(r.titles.join(', '))}</td><td>${esc(r.desc)}</td><td>${esc(r.tags)}</td><td>${o}/${o+d}</td></tr>`;
        }).join('')}
        </tbody></table>`;
      // Export
      byId('btn-modal-txt').onclick = () => {
        const lines = rows.map(r => {
          const o = r.todos.filter(t => !t.done).length;
          const d = r.todos.filter(t => t.done).length;
          return `${r.day}.${fmt2(mIndex+1)}.${state.year} | ${r.title} | [${r.titles.join('; ')}] | ${r.desc} | ${r.tags} | todos ${o}/${o+d}`;
        }).join('\n');
        exportTXT(`monat_${fmt2(mIndex+1)}_${state.year}`, lines);
      };
    } else if (mode === 'year') {
      const rows = [];
      for (let m=0; m<12; m++) rows.push(...buildMonthRows(m));
      titleEl.textContent = `Jahresübersicht – ${state.year}`;
      content.innerHTML = `
        <table><thead><tr><th>Datum</th><th>Titel</th><th>Zusatz</th><th>Beschreibung</th><th>Tags</th><th>To‑Dos (offen/erledigt)</th></tr></thead><tbody>
        ${rows.map(r => {
          const o = r.todos.filter(t => !t.done).length;
          const d = r.todos.filter(t => t.done).length;
          return `<tr><td>${r.ymd}</td><td>${esc(r.title)}</td><td>${esc(r.titles.join(', '))}</td><td>${esc(r.desc)}</td><td>${esc(r.tags)}</td><td>${o}/${o+d}</td></tr>`;
        }).join('')}
        </tbody></table>`;
      byId('btn-modal-txt').onclick = () => {
        const lines = rows.map(r => {
          const o = r.todos.filter(t => !t.done).length;
          const d = r.todos.filter(t => t.done).length;
          return `${r.ymd} | ${r.title} | [${r.titles.join('; ')}] | ${r.desc} | ${r.tags} | todos ${o}/${o+d}`;
        }).join('\n');
        exportTXT(`jahr_${state.year}`, lines);
      };
    }
    byId('btn-modal-print').onclick = () => window.print();
    byId('btn-modal-close').onclick = () => closeOverview();
    modal.classList.add('open');
  }
  function closeOverview() {
    byId('modal').classList.remove('open');
  }
  function buildMonthRows(m) {
    const daysInMonth = new Date(state.year, m+1, 0).getDate();
    const rows = [];
    for (let d=1; d<=daysInMonth; d++) {
      const ymd = `${state.year}-${fmt2(m+1)}-${fmt2(d)}`;
      const it = state.items[ymd] || {};
      rows.push({ ymd, day: d, title: it.title || '', titles: (it.titles || []), desc: it.desc || '', tags: it.tags || '', todos: (it.todos || []) });
    }
    return rows;
  }
  function exportTXT(name, text) {
    const filename = `jahrescontent_${name}_${state.year}_${stamp()}.txt`;
    download(filename, text);
  }
  function exportJSON() {
    const filename = `jahrescontent_json_${state.year}_${stamp()}.json`;
    download(filename, JSON.stringify(state, null, 2));
  }
  function exportOpenDaysTXT() {
    const map = allDays();
    const open = Object.keys(map).filter(ymd => !isUsed(state.items[ymd]));
    exportTXT('offene_tage', open.join('\n'));
  }
  function exportCurrentMonthTXT() {
    const m = (state.year === today.getFullYear()) ? today.getMonth() : 0;
    const rows = buildMonthRows(m).map(r => {
      const o = r.todos.filter(t => !t.done).length;
      const d = r.todos.filter(t => t.done).length;
      return `${r.ymd} | ${r.title} | [${(r.titles || []).join('; ')}] | ${r.desc} | ${r.tags} | todos ${o}/${o+d}`;
    });
    exportTXT(`monat_${fmt2(m+1)}`, rows.join('\n'));
  }
  function allDays() {
    const map = {};
    for (let m=0; m<12; m++) {
      const daysInMonth = new Date(state.year, m+1, 0).getDate();
      for (let d=1; d<=daysInMonth; d++) {
        map[`${state.year}-${fmt2(m+1)}-${fmt2(d)}`] = true;
      }
    }
    return map;
  }
  function stamp() {
    const d = new Date();
    return `${d.getFullYear()}${fmt2(d.getMonth()+1)}${fmt2(d.getDate())}_${fmt2(d.getHours())}${fmt2(d.getMinutes())}${fmt2(d.getSeconds())}`;
  }
  function download(filename, text) {
    const blob = new Blob([text], { type:'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function collectAllTitles() {
    const titlesMap = {};
    Object.entries(state.items).forEach(([ymd, v]) => {
      const push = t => {
        if (!t || !t.trim()) return;
        const key = t.trim().toLowerCase();
        (titlesMap[key] ||= []).push(ymd);
      };
      if (v) {
        push(v.title);
        (v.titles || []).forEach(push);
      }
    });
    return titlesMap;
  }
  function scanDuplicates() {
    const titles = collectAllTitles();
    const dups = Object.entries(titles).filter(([t, arr]) => arr.length > 1);
    if (!dups.length) {
      alert('Keine Duplikate gefunden.');
      return;
    }
    const lines = dups.map(([t, arr]) => `${t} -> ${arr.join(', ')}`).join('\n');
    exportTXT('duplikate', lines);
  }
  function markDupesIndicator(ymd) {
    const data = state.items[ymd];
    const mark = byId('dupemark');
    if (!mark) return;
    const all = collectAllTitles();
    const thisT = [];
    if (data) {
      if (data.title && data.title.trim()) thisT.push(data.title.trim().toLowerCase());
      (data.titles || []).forEach(t => {
        if (t && t.trim()) thisT.push(t.trim().toLowerCase());
      });
    }
    const dup = thisT.reduce((a, t) => a + ((all[t] && all[t].length > 1) ? 1 : 0), 0);
    if (dup > 0) {
      mark.style.display = 'inline-block';
      mark.textContent = 'Duplikate';
    } else {
      mark.style.display = 'none';
    }
  }
  /* Dashboard aktualisieren */
  function updateDashboard() {
    // Aktueller Monat (immer aktuelles Jahr + aktueller Monat wenn Jahr gleich) oder 1. Monat
    const curM = (state.year === today.getFullYear()) ? today.getMonth() : 0;
    const monthNameEl = byId('dash-month-name');
    if (monthNameEl) monthNameEl.textContent = `${MONTHS[curM]} ${state.year}`;
    const daysInMonth = new Date(state.year, curM+1, 0).getDate();
    let used = 0;
    const open = [];
    for (let d=1; d<=daysInMonth; d++) {
      const ymd = `${state.year}-${fmt2(curM+1)}-${fmt2(d)}`;
      if (isUsed(state.items[ymd])) used++;
      else open.push(ymd);
    }
    const free = daysInMonth - used;
    const freeEl = byId('dash-count-free');
    const usedEl = byId('dash-count-used');
    if (freeEl) freeEl.querySelector('strong').textContent = String(free);
    if (usedEl) usedEl.querySelector('strong').textContent = String(used);
    // Offene Tage Liste
    const openList = byId('open-days');
    if (openList) {
      openList.innerHTML = '';
      open.forEach(ymd => {
        const d = new Date(ymd);
        const btn = document.createElement('button');
        btn.className = 'pill';
        btn.textContent = d.toLocaleDateString('de-DE');
        btn.title = 'Springen';
        btn.addEventListener('click', () => {
          const cell = document.querySelector(`.day[data-ymd="${ymd}"]`);
          if (cell) {
            cell.scrollIntoView({ behavior:'smooth', block:'center' });
            cell.focus();
          }
        });
        openList.appendChild(btn);
      });
    }
    // Nächste To‑Dos
    const upcoming = byId('upcoming');
    if (upcoming) {
      upcoming.innerHTML = '';
      const entries = [];
      Object.entries(state.items).forEach(([ymd, it]) => {
        (it?.todos || []).filter(t => !t.done && (ymd >= stampDate(today))).forEach(t => {
          entries.push({ ymd, text: t.text || '' });
        });
      });
      entries.sort((a,b) => a.ymd.localeCompare(b.ymd));
      entries.slice(0, 12).forEach(e => {
        const d = new Date(e.ymd);
        const row = document.createElement('button');
        row.className = 'pill';
        row.textContent = `${d.toLocaleDateString('de-DE')} — ${e.text.slice(0,48)}`;
        row.title = 'Öffnen';
        row.addEventListener('click', () => {
          const cell = document.querySelector(`.day[data-ymd="${e.ymd}"]`);
          if (cell) {
            cell.scrollIntoView({ behavior:'smooth', block:'center' });
            cell.focus();
            openDrawer(e.ymd);
          }
        });
        upcoming.appendChild(row);
      });
    }
    renderLog();
  }
  function stampDate(d) {
    return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`;
  }
  function renderLog() {
    const box = byId('event-log');
    if (!box) return;
    box.innerHTML = '';
    state.log.slice(0, 20).forEach(line => {
      const div = document.createElement('div');
      div.textContent = line;
      box.appendChild(div);
    });
  }

  /* Debug‑Status aktualisieren */
  function renderDebugStatus() {
    const storageStatus = (() => {
      try {
        localStorage.setItem('__provoware_test', '1');
        localStorage.removeItem('__provoware_test');
        return 'Browser';
      } catch (e) {
        return 'Fallback';
      }
    })();
    const sizeKB = JSON.stringify(state).length / 1024;
    const stEl = byId('debug-storage');
    if (stEl) stEl.textContent = `Speicher: ${storageStatus}`;
    const szEl = byId('debug-size');
    if (szEl) szEl.textContent = `Zustandsgröße: ${sizeKB.toFixed(1)} KB`;
  }

  /* Zeigt Debug‑Ergebnisse an */
  function showDebugResults(list) {
    const box = byId('debug-results');
    if (!box) return;
    box.innerHTML = '';
    if (!list || list.length === 0) {
      const p = document.createElement('div');
      p.textContent = 'Keine Probleme gefunden.';
      box.appendChild(p);
      return;
    }
    list.forEach(l => {
      const div = document.createElement('div');
      div.textContent = l;
      box.appendChild(div);
    });
  }

  /* Autosave Steuerung */
  function startAutoSave() {
    if (!autosaveEnabled) return;
    // vorhandenes Intervall stoppen
    stopAutoSave();
    autosaveInterval = setInterval(() => {
      try {
        safeSet(BACKUP_KEY, JSON.stringify(state));
        logEvent('Auto‑Backup durchgeführt');
        updateStatus('Auto‑Backup gespeichert');
        renderLog();
        renderDebugStatus();
      } catch (err) {
        // Fehler ignorieren
      }
    }, 5 * 60 * 1000);
  }
  function stopAutoSave() {
    // Stoppe laufendes Autosave‑Intervall
    if (autosaveInterval) {
      clearInterval(autosaveInterval);
      autosaveInterval = null;
    }
  }

  /* Debug‑Initialisierung */
  function initDebug() {
    // Render initial status
    renderDebugStatus();
    updateUndoRedoButtons();
    // Self‑check button
    const runBtn = byId('run-selfcheck');
    if (runBtn) runBtn.addEventListener('click', () => {
      const issues = selfCheck();
      persistState();
      renderCalendar();
      updateDashboard();
      renderLog();
      renderDebugStatus();
      showDebugResults(issues);
    });
    // Export log button
    const exportBtn = byId('export-log');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      exportTXT('log', state.log.join('\n'));
    });
    // Clear storage button
    const clearBtn = byId('clear-storage-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (confirm('Speicher wirklich zurücksetzen?')) {
        safeRemove(STORAGE_KEY);
        safeRemove(BACKUP_KEY);
        safeRemove(THEME_KEY);
        safeRemove(FS_KEY);
        safeRemove(PALETTE_KEY);
        state = initState(today.getFullYear());
        persistState();
        buildSelectors();
        renderDashboardStructure();
        updateClock();
        renderCalendar();
        updateDashboard();
        renderLog();
        renderDebugStatus();
        updateStatus('Zurückgesetzt');
      }
    });
    // Autosave toggle
    const autoBtn = byId('autosave-toggle');
    if (autoBtn) {
      autoBtn.textContent = autosaveEnabled ? 'Autosave deaktivieren' : 'Autosave aktivieren';
      autoBtn.addEventListener('click', () => {
        autosaveEnabled = !autosaveEnabled;
        autoBtn.textContent = autosaveEnabled ? 'Autosave deaktivieren' : 'Autosave aktivieren';
        if (autosaveEnabled) startAutoSave(); else stopAutoSave();
        renderDebugStatus();
      });
    }
    const undoBtn = byId('undo-btn');
    if (undoBtn) undoBtn.addEventListener('click', undo);
    const redoBtn = byId('redo-btn');
    if (redoBtn) redoBtn.addEventListener('click', redo);
    // Autosave initial starten
    startAutoSave();
  }

  /* Selektoren initialisieren */
  function buildSelectors() {
    // Jahr
    const yearSel = byId('year');
    const thisYear = new Date().getFullYear();
    const range = [];
    for (let i=-3; i<=3; i++) range.push(thisYear + i);
    yearSel.innerHTML = range.map(y => `<option ${y===state.year?'selected':''}>${y}</option>`).join('');
    yearSel.addEventListener('change', e => {
      state.year = parseInt(e.target.value, 10);
      persistState();
      renderCalendar();
      updateDashboard();
      logEvent(`Jahr geändert: ${state.year}`);
      renderLog();
    });
    // Theme
    const themeSel = byId('theme');
    themeSel.value = normalizeTheme(state.theme);
    applyTheme(themeSel.value);
    themeSel.addEventListener('change', e => {
      applyTheme(e.target.value);
      persistState();
      logEvent(`Theme geändert: ${e.target.value}`);
      renderLog();
    });
    // Font size
    const fsSel = byId('fontsize');
    fsSel.value = String(state.fontsize);
    applyFontSize(state.fontsize);
    fsSel.addEventListener('change', e => {
      applyFontSize(e.target.value);
      persistState();
      logEvent(`Textgröße geändert: ${e.target.value}`);
      renderLog();
    });
    // Palette
    const palSel = byId('palette');
    palSel.value = state.palette;
    applyPalette(state.palette);
    palSel.addEventListener('change', e => {
      applyPalette(e.target.value);
      persistState();
      logEvent(`Akzentfarbe geändert: ${e.target.value}`);
      renderLog();
    });
  }

  /* Tastatur‑Shortcuts */
  document.addEventListener('keydown', e => {
    const tag = (e.target instanceof HTMLElement) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || e.target.hasAttribute('contenteditable')) {
      return; // keine Shortcuts während Eingabe
    }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      const monthEl = currentFullscreen || (e.target.closest && e.target.closest('.month')) || document.querySelector('.month');
      if (monthEl) {
        const btn = monthEl.querySelector('.btn-full');
        toggleFullscreen(monthEl, btn);
      } else {
        updateStatus('Kein Monat für Vollbild gefunden');
      }
      return;
    }
    if (e.key === 'Escape') {
      if (byId('drawer').classList.contains('open')) {
        closeDrawer();
      }
      if (byId('modal').classList.contains('open')) {
        closeOverview();
      }
    } else if (e.key.toLowerCase() === 't') {
      e.preventDefault();
      focusToday();
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      jumpNextFree();
    } else if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      persistState();
      logEvent('Manuell gespeichert');
      renderLog();
    }
  });
  function focusToday() {
    const ymd = `${today.getFullYear()}-${fmt2(today.getMonth()+1)}-${fmt2(today.getDate())}`;
    const cell = document.querySelector(`.day[data-ymd="${ymd}"]`);
    if (cell) {
      cell.scrollIntoView({behavior:'smooth',block:'center'});
      cell.focus();
      openDrawer(ymd);
    }
  }
  function jumpNextFree() {
    const keys = Object.keys(allDays()).sort();
    const firstFree = keys.find(k => !isUsed(state.items[k]));
    if (firstFree) {
      const cell = document.querySelector(`.day[data-ymd="${firstFree}"]`);
      if (cell) {
        cell.scrollIntoView({behavior:'smooth',block:'center'});
        cell.focus();
        openDrawer(firstFree);
      }
    }
  }

  /* Helfer HTML Escaping */
  function esc(str) {
    // HTML escaping ohne problematische Objektliterale. Auf diese Weise
    // wird jeder Sondercharakter über eine Switch-Anweisung ersetzt.
    return String(str || '').replace(/[&<>"']/g, function(m) {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return m;
      }
    });
  }

  /* Initialisierung bei Seite laden */
  function selfCheck() {
    const issues = [];
    if (!state || typeof state !== 'object') issues.push('Zustand ungültig');
    if (!state.year || isNaN(state.year)) {
      state.year = new Date().getFullYear();
      issues.push('Jahr repariert');
    }
    if (!state.items || typeof state.items !== 'object') {
      state.items = {};
      issues.push('Items repariert');
    }
    Object.keys(state.items).forEach(k => {
      const it = state.items[k];
      if (it && !Array.isArray(it.titles)) it.titles = [];
      if (it && !Array.isArray(it.todos)) it.todos = [];
    });
    if (!state.log) state.log = [];
    if (issues.length) {
      logEvent('Self‑Check: ' + issues.join(' | '));
    }
    return issues;
  }
  // Start
  selfCheck();
  initUI();
  buildSelectors();
  renderDashboardStructure();
  renderCalendar();
  updateDashboard();
  updateClock();
  setInterval(updateClock, 1000);
  renderLog();
  updateStatus('Bereit');
  // Debug initialisieren (enthält Autosave‑Start)
  initDebug();
  // Scroll zu aktuellem Monat bei Start
  setTimeout(() => {
    if (state.year === today.getFullYear()) {
      const mEl = document.querySelector(`.month[data-month="${today.getMonth()}"]`);
      if (mEl) mEl.scrollIntoView({behavior:'smooth', block:'start'});
    }
  }, 100);
})();

