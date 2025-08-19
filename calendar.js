/* assets/calendar.js – Monatsansicht mit ToDo-Overlay, Filter, Recurrence, CSV-Import & Print */
import {applyTheme} from './theme.js';
import {validateEvents} from './validate.js';

const qs = s=>document.querySelector(s);
const qsa = s=>Array.from(document.querySelectorAll(s));

function formatMonth(year, month){
  const d = new Date(year, month, 1);
  return d.toLocaleString('de-DE', {month:'long', year:'numeric'});
}
function daysInMonth(year, month){ return new Date(year, month+1, 0).getDate(); }
function weekday(deDate){ const w = deDate.getDay(); return (w+6)%7; } // 0=Mon..6=Son
function ymd(d){ return d.toISOString().slice(0,10); }
function addDays(date, n){ const d = new Date(date); d.setDate(d.getDate()+n); return d; }

async function loadEvents(){
  try { return await fetch('data/events.json', {cache:'no-store'}).then(r=>r.json()); }
  catch(e){ console.warn('events.json nicht gefunden, verwende leeres Array'); return []; }
}
async function loadSchema(){
  try{ return await fetch('config/events.schema.json', {cache:'no-store'}).then(r=>r.json()); }
  catch(e){ return null; }
}

function matchFilters(ev, filters){
  if(filters.status.size && !filters.status.has(ev.status)) return false;
  if(filters.platform.size && (!ev.platform || !filters.platform.has(ev.platform))) return false;
  if(filters.tag.size){
    if(!Array.isArray(ev.tags) || !ev.tags.some(t=>filters.tag.has(t))) return false;
  }
  return true;
}

function expandRangesAndRecurrence(events, year, month){
  // Build concrete instances in visible month
  const first = new Date(year, month, 1);
  const last = new Date(year, month, daysInMonth(year, month));
  const results = [];
  const inMonth = (d)=> d>=first && d<=last;

  // Parse simple RRULE if provided
  const parseRRULE = (s)=>{
    const out = {};
    s.split(';').forEach(pair=>{
      const [k,v] = pair.split('=');
      if(!k || !v) return;
      out[k.toUpperCase()] = v.toUpperCase();
    });
    return out;
  };

  const wd = ['MO','TU','WE','TH','FR','SA','SU'];

  events.forEach(ev=>{
    // Choose base dates
    let baseStart = ev.start_date || ev.date;
    let baseEnd = ev.end_date || ev.date;
    if(!baseStart) return;

    // Recurrence handling
    const rec = ev.recurrence || {};
    let instances = [];

    // Helper push instance within month range
    const pushIfInMonth = (d)=>{
      if(inMonth(d)){
        const inst = {...ev, date: ymd(d)};
        delete inst.start_date; delete inst.end_date;
        results.push(inst);
      }
    };

    if(rec.rrule || rec.freq){
      // derive rule
      let FREQ, INTERVAL= (rec.interval || 1), BYDAY=null, COUNT=null, UNTIL=null;
      if(rec.rrule){
        const rr = parseRRULE(rec.rrule);
        FREQ = rr.FREQ;
        if(rr.INTERVAL) INTERVAL = parseInt(rr.INTERVAL,10)||1;
        if(rr.BYDAY) BYDAY = rr.BYDAY.split(',');
        if(rr.COUNT) COUNT = parseInt(rr.COUNT,10)||null;
        if(rr.UNTIL) UNTIL = rr.UNTIL;
      } else {
        FREQ = (rec.freq||'MONTHLY').toUpperCase();
        BYDAY = rec.byweekday || null;
        COUNT = rec.count || null;
        UNTIL = rec.until || null;
      }
      const start = new Date(baseStart);
      const limit = UNTIL ? new Date(UNTIL) : addDays(last, 31); // extend a bit beyond month
      let n = 0;
      const addInstance = (d)=>{
        if(inMonth(d)) pushIfInMonth(d);
        n++; if(COUNT && n>=COUNT) return true;
        return false;
      };
      let cur = new Date(start);
      if(FREQ==='DAILY'){
        while(cur<=limit){
          if(addInstance(cur)) break;
          cur = addDays(cur, INTERVAL);
        }
      } else if(FREQ==='WEEKLY'){
        // if BYDAY set, snap to that weekday set each week
        const weekStart = new Date(first); // iterate weeks covering month
        for(let w=addDays(weekStart,-7); w<=addDays(last,7); w=addDays(w,7)){
          if(BYDAY && BYDAY.length){
            BYDAY.forEach(code=>{
              const idx = wd.indexOf(code);
              if(idx<0) return;
              const d = addDays(w, idx);
              if(d>=start && d<=limit){
                if(addInstance(d)) return;
              }
            });
          } else {
            const d = new Date(cur);
            if(d>=start && d<=limit) if(addInstance(d)) break;
            cur = addDays(cur, 7*INTERVAL);
          }
        }
      } else if(FREQ==='MONTHLY'){
        // same day of month
        let d = new Date(start);
        while(d<=limit){
          if(addInstance(d)) break;
          d = new Date(d.getFullYear(), d.getMonth()+INTERVAL, d.getDate());
        }
      } else if(FREQ==='YEARLY'){
        let d = new Date(start);
        while(d<=limit){
          if(addInstance(d)) break;
          d = new Date(d.getFullYear()+INTERVAL, d.getMonth(), d.getDate());
        }
      }
    } else {
      // No recurrence: expand range
      const s = new Date(baseStart);
      const e = new Date(baseEnd);
      for(let d=new Date(s); d<=e; d=addDays(d,1)){
        pushIfInMonth(d);
      }
    }

    // Deadline marker (separat, optional)
    if(ev.deadline){
      const dd = new Date(ev.deadline);
      if(inMonth(dd)){
        results.push({...ev, date: ymd(dd), status: ev.status || 'planned', _deadline:true});
      }
    }
  });
  return results;
}

function renderSummary(instances){
  const by = (key, transform=(x)=>x)=>{
    const m = new Map();
    instances.forEach(ev=>{
      const k = transform(ev[key]);
      if(!k) return;
      m.set(k, (m.get(k)||0)+1);
    });
    return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}: ${v}`).join('\n') || '—';
  };
  const statusText = by('status', s=>({'planned':'geplant','productive':'produktiv','done':'fertig'})[s]||s);
  const platformText = by('platform');
  const tagsCount = new Map();
  instances.forEach(ev=>{
    if(Array.isArray(ev.tags)) ev.tags.forEach(t=> tagsCount.set(t, (tagsCount.get(t)||0)+1));
  });
  const tagsText = Array.from(tagsCount.entries()).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}: ${v}`).join('\n') || '—';
  const S = (id, txt)=>{ const el=document.getElementById(id); if(el) el.textContent = txt; }
  S('sum-status', statusText);
  S('sum-platform', platformText);
  S('sum-tags', tagsText);
}

function renderCalendar(year, month, events, filters){
  const grid = qs('#grid'); grid.innerHTML='';
  const first = new Date(year, month, 1);
  const offset = weekday(first);
  const dim = daysInMonth(year, month);
  const totalCells = Math.ceil((offset+dim)/7)*7;

  qs('#monthLabel').textContent = formatMonth(year, month);

  const instances = expandRangesAndRecurrence(events, year, month);
  renderSummary(instances);

  for(let i=0;i<totalCells;i++){
    const cell = document.createElement('div');
    cell.className='day';
    const dayNum = i - offset + 1;
    if(dayNum>=1 && dayNum<=dim){
      cell.setAttribute('tabindex','0');
      const d = new Date(year, month, dayNum);
      const dateStr = d.toISOString().slice(0,10);
      cell.dataset.date = dateStr;
      const head = document.createElement('div');
      head.className='date';
      head.textContent = dayNum.toString();
      cell.appendChild(head);
      const todoWrap = document.createElement('div');
      todoWrap.className='todo-pill';
      const todays = instances.filter(e=>e.date===dateStr && matchFilters(e, filters));
      todays.forEach(ev=>{
        const tag = document.createElement('span');
        const cls = `todo ${ev.status}`;
        tag.className = cls;
        tag.textContent = ev.title;
        tag.title = `${ev.title} • ${ev.platform||''} • ${Array.isArray(ev.tags)? ev.tags.join(', ') : ''}`.trim();
        tag.setAttribute('role','button');
        tag.setAttribute('tabindex','0');
        if(ev._deadline){ tag.style.outline='2px dashed var(--danger)'; tag.style.outlineOffset='2px'; }
        tag.addEventListener('click', ()=> openOverlay(ev));
        tag.addEventListener('keydown', (e)=>{ if(e.key==='Enter') openOverlay(ev); });
        todoWrap.appendChild(tag);
      });
      cell.appendChild(todoWrap);
    } else {
      cell.classList.add('muted');
      cell.setAttribute('aria-hidden','true');
    }
    // Double-click to add new event on day
    cell.addEventListener('dblclick', ()=>{
      const dateStr = cell.dataset.date; if(!dateStr) return;
      openEditor({id:`new_${Date.now()}`, title:'Neues Event', date:dateStr, status:'planned', tags:[]});
    });
    grid.appendChild(cell);
  }
}

function gatherFilters(){
  const status = new Set(qsa('input[name="f-status"]:checked').map(x=>x.value));
  const platform = new Set(qsa('input[name="f-platform"]:checked').map(x=>x.value));
  const tagStr = qs('#f-tags').value.trim();
  const tag = new Set(tagStr? tagStr.split(',').map(s=>s.trim()).filter(Boolean): []);
  return {status, platform, tag};
}

function openOverlay(ev){ openEditor(ev);
  const ov = qs('#overlay');
  qs('#ov-title').textContent = ev.title;
  qs('#ov-date').textContent = ev.date;
  qs('#ov-status').textContent = ev.status;
  qs('#ov-platform').textContent = ev.platform || '—';
  qs('#ov-tags').textContent = Array.isArray(ev.tags)? ev.tags.join(', ') : '—';
  ov.hidden = false;
  qs('#ov-close').focus();
}
function closeOverlay(){ qs('#overlay').hidden = true; qs('#monthLabel').focus(); }

function bindShortcuts(){
  window.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){ closeOverlay(); }
    if(e.key==='t' && !e.ctrlKey && !e.metaKey){
      const p = qs('#panel'); p.hidden = !p.hidden;
      if(!p.hidden) qs('#f-tags').focus();
    }
    if(e.key==='Enter'){
      const btn = document.activeElement && document.activeElement.closest('button, .btn');
      if(btn) btn.click();
    }
  });
}

/* --- CSV Importer --- */
function parseCSV(text){
  const rows = [];
  let i=0, field='', row=[], inQuotes=false;
  while(i<text.length){
    const c = text[i];
    if(inQuotes){
      if(c==='"' && text[i+1]==='"'){ field+='"'; i+=2; continue; }
      if(c==='"'){ inQuotes=false; i++; continue; }
      field+=c; i++; continue;
    } else {
      if(c==='"'){ inQuotes=true; i++; continue; }
      if(c===','){ row.push(field); field=''; i++; continue; }
      if(c==='
' || c==='
'){
        // handle CRLF
        if(c==='\r' && text[i+1]==='\n') i++;
        row.push(field); rows.push(row); field=''; row=[]; i++; continue;
      }
      field+=c; i++; continue;
    }
  }
  if(field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r=>r.length && r.some(v=>v.trim().length));
}
function toEvents(rows){
  const head = rows[0].map(h=>h.trim().toLowerCase());
  const idx = (k)=> head.indexOf(k);
  const out=[];
  for(let r=1;r<rows.length;r++){
    const row = rows[r];
    const g = (k)=> idx(k)>=0? (row[idx(k)]||'').trim() : '';
    const ev = {
      id: g('id') || `csv_${r}_${Date.now()}`,
      title: g('title'),
      date: g('date'),
      status: g('status') || 'planned',
    };
    const sd = g('start_date'); const ed = g('end_date'); const dl = g('deadline');
    if(sd) ev.start_date=sd; if(ed) ev.end_date=ed; if(dl) ev.deadline=dl;
    const plat = g('platform'); if(plat) ev.platform=plat;
    const tags = g('tags'); if(tags) ev.tags = tags.split(';').map(s=>s.trim()).filter(Boolean);
    const rrule = g('rrule'); if(rrule) ev.recurrence = { rrule };
    const freq = g('freq'); const interval = g('interval'); const byday=g('byweekday');
    if(freq || interval || byday){
      ev.recurrence = ev.recurrence || {};
      if(freq) ev.recurrence.freq = freq.toUpperCase();
      if(interval) ev.recurrence.interval = parseInt(interval,10)||1;
      if(byday) ev.recurrence.byweekday = byday.split('|').map(s=>s.trim().toUpperCase()).filter(Boolean);
    }
    out.push(ev);
  }
  return out;
}
function downloadJSON(filename, data){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* --- Print --- */
function printMonth(){ window.print(); }

async function main(){
  const {variant} = await applyTheme('auto');
  const [events, schema] = await Promise.all([loadEvents(), loadSchema()]);
  const errs = validateEvents(events, schema);
  const log = qs('#val-log');
  if(errs.length){
    log.textContent = errs.map(e=>`- ${e.path}: ${e.msg}`).join('\n');
    log.previousElementSibling.querySelector('.badge').classList.add('warn');
  }else{
    log.textContent = 'OK – Events validiert.';
    log.previousElementSibling.querySelector('.badge').classList.add('ok');
  }
  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth();
  const refresh = ()=> renderCalendar(year, month, events, gatherFilters());
  qs('#prev').addEventListener('click', ()=>{ month--; if(month<0){month=11; year--;} refresh(); });
  qs('#next').addEventListener('click', ()=>{ month++; if(month>11){month=0; year++;} refresh(); });
  qsa('input[name="f-status"], input[name="f-platform"]').forEach(el=> el.addEventListener('change', refresh));
  qs('#f-tags').addEventListener('input', refresh);
  qs('#btn-print').addEventListener('click', printMonth);
  qs('#ov-save').addEventListener('click', ()=>{ const res = saveEditor(events, schema); if(res.ok){ /* user replaces file, then refresh */ alert('events.json heruntergeladen – bitte Datei in /data ersetzen und Kalender neu laden.'); }});
  qs('#ov-delete').addEventListener('click', ()=>{ deleteEditor(events); });

  // CSV Import
  const fileInput = qs('#csv-file');
  const btnParse = qs('#csv-parse');
  const btnMerge = qs('#csv-merge');
  const csvLog = qs('#csv-log');
  let imported = [];
  btnParse.addEventListener('click', async ()=>{
    if(!fileInput.files.length){ csvLog.textContent='Bitte CSV auswählen.'; return; }
    const txt = await fileInput.files[0].text();
    const rows = parseCSV(txt);
    imported = toEvents(rows);
    const e2 = validateEvents(imported, schema);
    if(e2.length){
      csvLog.textContent = 'CSV-Fehler:\n' + e2.map(e=>`- ${e.path}: ${e.msg}`).join('\n');
      csvLog.previousElementSibling.querySelector('.badge').classList.add('warn');
    } else {
      csvLog.textContent = `OK – ${imported.length} Events importiert.`;
      csvLog.previousElementSibling.querySelector('.badge').classList.add('ok');
    }
  });
  btnMerge.addEventListener('click', ()=>{
    if(!imported.length){ csvLog.textContent='Nichts zu mergen – zuerst CSV parsen.'; return; }
    const merged = [...events];
    const existing = new Map(merged.map(e=>[e.id, e]));
    imported.forEach(ev=> existing.set(ev.id, ev));
    const out = Array.from(existing.values());
    downloadJSON('events.json', out);
    csvLog.textContent = `Export bereit: events.json (${out.length} Einträge). Datei ersetzen in data/`;
  });

  refresh();
  bindShortcuts();
}
document.addEventListener('DOMContentLoaded', main);

/* --- Editor Overlay Logic --- */
let currentEdit = null;
function openEditor(ev){
  const ov = document.getElementById('overlay');
  currentEdit = ev ? {...ev} : {id:`new_${Date.now()}`, title:'Neues Event', date:new Date().toISOString().slice(0,10), status:'planned', tags:[]};
  document.getElementById('ov-title').textContent = currentEdit.title;
  const set = (id, val)=>{ const el=document.getElementById(id); if(el) el.value = val||''; };
  set('ov-date', currentEdit.date||'');
  set('ov-status', currentEdit.status||'planned');
  set('ov-platform', currentEdit.platform||'');
  set('ov-tags', Array.isArray(currentEdit.tags)? currentEdit.tags.join('; ') : '');
  set('ov-start', currentEdit.start_date||'');
  set('ov-end', currentEdit.end_date||'');
  set('ov-deadline', currentEdit.deadline||'');
  set('ov-rrule', currentEdit.recurrence && currentEdit.recurrence.rrule || '');
  set('ov-freq', currentEdit.recurrence && currentEdit.recurrence.freq || '');
  set('ov-interval', currentEdit.recurrence && currentEdit.recurrence.interval || '');
  set('ov-byday', currentEdit.recurrence && Array.isArray(currentEdit.recurrence.byweekday) ? currentEdit.recurrence.byweekday.join('|') : '');
  ov.hidden = false; document.getElementById('ov-close').focus();
}
function readEditor(){
  const g = (id)=>{ const el=document.getElementById(id); return el ? el.value.trim() : ''; };
  currentEdit.title = document.getElementById('ov-title').textContent.trim() || 'Ohne Titel';
  currentEdit.date = g('ov-date') || currentEdit.date;
  currentEdit.status = g('ov-status') || 'planned';
  currentEdit.platform = g('ov-platform') || undefined;
  const tags = g('ov-tags'); currentEdit.tags = tags? tags.split(';').map(s=>s.trim()).filter(Boolean): [];
  currentEdit.start_date = g('ov-start') || undefined;
  currentEdit.end_date = g('ov-end') || undefined;
  currentEdit.deadline = g('ov-deadline') || undefined;
  const rrule = g('ov-rrule');
  const freq = g('ov-freq'); const interval = g('ov-interval'); const byday = g('ov-byday');
  if(rrule){ currentEdit.recurrence = {rrule}; }
  else if(freq || interval || byday){
    currentEdit.recurrence = {};
    if(freq) currentEdit.recurrence.freq = freq;
    if(interval) currentEdit.recurrence.interval = parseInt(interval,10)||1;
    if(byday) currentEdit.recurrence.byweekday = byday.split('|').map(s=>s.trim()).filter(Boolean);
  } else {
    delete currentEdit.recurrence;
  }
  return currentEdit;
}
function saveEditor(events, schema){
  const ev = readEditor();
  // minimal client-side validate
  const errs = (window.validateEvents? window.validateEvents([ev], schema): []);
  if(errs && errs.length){ alert('Fehler: '+errs.map(e=>e.msg).join('\n')); return {ok:false}; }
  const map = new Map(events.map(e=>[e.id, e]));
  map.set(ev.id, ev);
  const out = Array.from(map.values());
  // Download new events.json (offline)
  const blob = new Blob([JSON.stringify(out,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'events.json'; a.click(); URL.revokeObjectURL(a.href);
  return {ok:true, out};
}
function deleteEditor(events){
  if(!currentEdit){ return; }
  if(!confirm('Event wirklich löschen?')) return;
  const out = events.filter(e=> e.id !== currentEdit.id);
  const blob = new Blob([JSON.stringify(out,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'events.json'; a.click(); URL.revokeObjectURL(a.href);
}
