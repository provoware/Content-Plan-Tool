(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  } else {
    root.CalendarLogic = exports;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  function formatMonth(year, month) {
    const d = new Date(year, month, 1);
    return d.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
  }

  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function weekday(deDate) {
    const w = deDate.getDay();
    return (w + 6) % 7; // 0 = Montag .. 6 = Sonntag
  }

  function ymd(date) {
    return date.toISOString().slice(0, 10);
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function matchFilters(ev, filters) {
    if (filters.status.size && !filters.status.has(ev.status)) return false;
    if (filters.platform.size && (!ev.platform || !filters.platform.has(ev.platform))) return false;
    if (filters.tag.size) {
      if (!Array.isArray(ev.tags) || !ev.tags.some(t => filters.tag.has(t))) return false;
    }
    return true;
  }

  function parseRRULEString(str) {
    const out = {};
    str.split(';').forEach(pair => {
      const [k, v] = pair.split('=');
      if (!k || !v) return;
      out[k.toUpperCase()] = v.toUpperCase();
    });
    return out;
  }

  function expandRangesAndRecurrence(events, year, month) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month, daysInMonth(year, month));
    const results = [];
    const inMonth = d => d >= first && d <= last;

    events.forEach(ev => {
      let baseStart = ev.start_date || ev.date;
      let baseEnd = ev.end_date || ev.date;
      if (!baseStart) return;

      const rec = ev.recurrence || {};

      const pushIfInMonth = d => {
        if (inMonth(d)) {
          const inst = { ...ev, date: ymd(d) };
          delete inst.start_date;
          delete inst.end_date;
          results.push(inst);
        }
      };

      if (rec.rrule || rec.freq) {
        let FREQ;
        let INTERVAL = rec.interval || 1;
        let BYDAY = null;
        let COUNT = null;
        let UNTIL = null;
        if (rec.rrule) {
          const rr = parseRRULEString(rec.rrule);
          FREQ = rr.FREQ;
          if (rr.INTERVAL) INTERVAL = parseInt(rr.INTERVAL, 10) || 1;
          if (rr.BYDAY) BYDAY = rr.BYDAY.split(',');
          if (rr.COUNT) COUNT = parseInt(rr.COUNT, 10) || null;
          if (rr.UNTIL) UNTIL = rr.UNTIL;
        } else {
          FREQ = (rec.freq || 'MONTHLY').toUpperCase();
          BYDAY = rec.byweekday || null;
          COUNT = rec.count || null;
          UNTIL = rec.until || null;
          if (Array.isArray(BYDAY)) BYDAY = BYDAY.map(code => code.toUpperCase());
        }
        const start = new Date(baseStart);
        const limit = UNTIL ? new Date(UNTIL) : addDays(last, 31);
        let n = 0;
        const addInstance = d => {
          if (inMonth(d)) pushIfInMonth(d);
          n++;
          if (COUNT && n >= COUNT) return true;
          return false;
        };
        if (FREQ === 'DAILY') {
          let cur = new Date(start);
          while (cur <= limit) {
            if (addInstance(cur)) break;
            cur = addDays(cur, INTERVAL);
          }
        } else if (FREQ === 'WEEKLY') {
          const windowStart = addDays(first, -7);
          for (let w = new Date(windowStart); w <= addDays(last, 7); w = addDays(w, 7)) {
            if (BYDAY && BYDAY.length) {
              BYDAY.forEach(code => {
                const idx = WEEKDAYS.indexOf(code);
                if (idx < 0) return;
                const d = addDays(w, idx);
                if (d >= start && d <= limit) {
                  if (addInstance(d)) return;
                }
              });
            } else {
              const diff = Math.round((w - start) / (7 * 24 * 60 * 60 * 1000));
              const cur = addDays(start, diff * 7 * INTERVAL);
              if (cur >= start && cur <= limit) {
                if (addInstance(cur)) break;
              }
            }
          }
        } else if (FREQ === 'MONTHLY') {
          let d = new Date(start);
          while (d <= limit) {
            if (addInstance(d)) break;
            d = new Date(d.getFullYear(), d.getMonth() + INTERVAL, d.getDate());
          }
        } else if (FREQ === 'YEARLY') {
          let d = new Date(start);
          while (d <= limit) {
            if (addInstance(d)) break;
            d = new Date(d.getFullYear() + INTERVAL, d.getMonth(), d.getDate());
          }
        }
      } else {
        const s = new Date(baseStart);
        const e = new Date(baseEnd);
        for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
          pushIfInMonth(d);
        }
      }

      if (ev.deadline) {
        const dd = new Date(ev.deadline);
        if (inMonth(dd)) {
          results.push({ ...ev, date: ymd(dd), status: ev.status || 'planned', _deadline: true });
        }
      }
    });

    return results;
  }

  function parseCSV(text) {
    const rows = [];
    let i = 0;
    let field = '';
    let row = [];
    let inQuotes = false;
    while (i < text.length) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
        if (c === '"') { inQuotes = false; i++; continue; }
        field += c; i++; continue;
      } else {
        if (c === '"') { inQuotes = true; i++; continue; }
        if (c === ',') { row.push(field); field = ''; i++; continue; }
        if (c === '\n' || c === '\r') {
          if (c === '\r' && text[i + 1] === '\n') i++;
          row.push(field); rows.push(row); field = ''; row = []; i++; continue;
        }
        field += c; i++; continue;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.length && r.some(v => v.trim().length));
  }

  function toEvents(rows) {
    if (!rows.length) return [];
    const head = rows[0].map(h => h.trim().toLowerCase());
    const idx = key => head.indexOf(key);
    const out = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const get = key => idx(key) >= 0 ? (row[idx(key)] || '').trim() : '';
      const ev = {
        id: get('id') || `csv_${r}_${Date.now()}`,
        title: get('title'),
        date: get('date'),
        status: get('status') || 'planned'
      };
      const sd = get('start_date');
      const ed = get('end_date');
      const dl = get('deadline');
      if (sd) ev.start_date = sd;
      if (ed) ev.end_date = ed;
      if (dl) ev.deadline = dl;
      const plat = get('platform');
      if (plat) ev.platform = plat;
      const tags = get('tags');
      if (tags) ev.tags = tags.split(';').map(s => s.trim()).filter(Boolean);
      const rrule = get('rrule');
      if (rrule) ev.recurrence = { rrule };
      const freq = get('freq');
      const interval = get('interval');
      const byday = get('byweekday');
      if (freq || interval || byday) {
        ev.recurrence = ev.recurrence || {};
        if (freq) ev.recurrence.freq = freq.toUpperCase();
        if (interval) ev.recurrence.interval = parseInt(interval, 10) || 1;
        if (byday) ev.recurrence.byweekday = byday.split('|').map(s => s.trim().toUpperCase()).filter(Boolean);
      }
      out.push(ev);
    }
    return out;
  }

  return {
    formatMonth,
    daysInMonth,
    weekday,
    ymd,
    addDays,
    matchFilters,
    expandRangesAndRecurrence,
    parseCSV,
    toEvents
  };
});
