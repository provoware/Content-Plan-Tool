// selfcheck.js – autonomer Schnelltest & Reparaturhinweise
(async function(){
  const log = [];
  const push = (sev, msg, fix=null) => log.push({time:new Date().toISOString(), sev, msg, fix});

  // Load config
  let cfg = {};
  try {
    const res = await fetch('config/global_settings.json', {cache:'no-store'});
    cfg = await res.json();
    push('INFO','Settings geladen');
  } catch(e){
    push('CRIT','global_settings.json nicht ladbar', 'Datei erstellen und JSON prüfen.');
  }

  // Startdatei-Hinweis
  if(!document.querySelector('main')){
    push('MAJOR','<main>-Landmarke fehlt','Füge <main role="main">...</main> ein.');
  }

  // Skip-Link vorhanden?
  if(!document.querySelector('a.skip-link')){
    push('MAJOR','Skip-Link fehlt','<a class=\"skip-link\" href=\"#main\">Zum Inhalt springen</a>');
  }

  // Focus sichtbar?
  const testBtn = document.createElement('button');
  testBtn.textContent = 'FocusTest';
  document.body.appendChild(testBtn);
  testBtn.focus();
  const style = window.getComputedStyle(testBtn);
  const outline = style.outlineStyle;
  if(outline === 'none'){
    push('MAJOR','Kein sichtbarer Tastatur-Fokus',':focus-visible Styles ergänzen.');
  }
  testBtn.remove();

  // File-Naming
  const bad = [];
  try {
    const res = await fetch('baumstruktur.txt', {cache:'no-store'});
    const txt = await res.text();
    const lines = txt.split(/\r?\n/);
    lines.forEach(line=>{
      const m = line.trim();
      if(m && !m.endsWith('/') ){
        const parts = m.split(/\s+/);
        const name = parts[parts.length-1];
        if(!/^[a-z0-9._\-]+$/.test(name)){
          bad.push(name);
        }
      }
    });
    if(bad.length) push('MAJOR',`Nicht konforme Dateinamen: ${bad.join(', ')}`,'Umbenennen in lowercase, ohne Leerzeichen.');
  } catch(e){ /* ignore */ }

  // Report ausgeben
  const pre = document.getElementById('selfcheck-log');
  pre.textContent = log.map(x => `[${x.sev}] ${x.time} – ${x.msg}${x.fix? ' | Fix: '+x.fix:''}`).join('\n');

  // todo.txt anlegen/erweitern
  try {
    // Kein echtes Schreiben möglich ohne Backend – zeigen Hinweis
    const todo = document.getElementById('selfcheck-todo');
    todo.textContent = 'Hinweis: todo.txt wird vom Tool beim Speichern erweitert (offline).';
  } catch(e){}

// --- Erweiterungen: Kontrast, Landmarken, ARIA, alt-Texte ---
function hexToRgb(h){h=h.replace('#',''); const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16); return [r,g,b];}
function luminance(rgb){function f(c){c/=255; return c<=0.03928? c/12.92 : Math.pow((c+0.055)/1.055,2.4)} const [r,g,b]=rgb.map(f); return 0.2126*r+0.7152*g+0.0722*b;}
function contrastRatio(h1,h2){const L1=luminance(hexToRgb(h1)), L2=luminance(hexToRgb(h2)); const a=Math.max(L1,L2), b=Math.min(L1,L2); return (a+0.05)/(b+0.05);}

async function themeCheck(){
  try{
    const t = await fetch('config/theme.json',{cache:'no-store'}).then(r=>r.json());
    const v = t.variants.dark;
    const checks = [
      ['Text vs BG', v.fg, v.bg],
      ['Text vs Card', v.fg, v.card],
      ['Accent vs BG', v.acc, v.bg],
      ['OK vs BG', v.ok, v.bg],
      ['Warn vs BG', v.warn, v.bg],
      ['Danger vs BG', v.danger, v.bg]
    ];
    checks.forEach(([label,a,b])=>{
      const cr = contrastRatio(a,b);
      if(cr<4.5) push('MAJOR', `Kontrast niedrig (${label} = ${cr.toFixed(2)}:1)`, 'Farbwerte in theme.json anheben (AA/AAA).');
    });
  }catch(e){}
}
function domA11yCheck(){
  if(!document.querySelector('main')) push('MAJOR','Landmark <main> fehlt','<main role="main">...</main>');
  if(!document.querySelector('header')) push('MINOR','Landmark <header> prüfen','Semantische Struktur ergänzen');
  if(!document.querySelector('footer')) push('MINOR','Landmark <footer> prüfen','Semantische Struktur ergänzen');
  document.querySelectorAll('img').forEach(img=>{
    if(!img.hasAttribute('alt')) push('MAJOR',`<img> ohne alt gefunden (src=${img.getAttribute('src')||''})`,'Alt-Text ergänzen');
  });
  // ARIA roles sanity
  document.querySelectorAll('[role]').forEach(el=>{
    const r = el.getAttribute('role');
    if(!['main','banner','contentinfo','navigation','dialog','button','grid'].includes(r)){
      push('MINOR',`Unbekannte/ungebräuchliche ARIA-Rolle: ${r}`,'Rolle prüfen oder entfernen');
    }
  });
}
await themeCheck();
domA11yCheck();

})();

// --- Kontrast-Suggestion & Download ---
function rgbFromHex(h){h=h.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function lum(rgb){function f(c){c/=255; return c<=0.03928? c/12.92 : Math.pow((c+0.055)/1.055,2.4)} const [r,g,b]=rgb.map(f); return 0.2126*r+0.7152*g+0.0722*b;}
function cr(h1,h2){const L1=lum(rgbFromHex(h1)), L2=lum(rgbFromHex(h2)); const a=Math.max(L1,L2), b=Math.min(L1,L2); return (a+0.05)/(b+0.05);}
function adjustForAA(color, bg){
  // simple brighten/darken towards white/black to reach 4.5:1 while staying near original
  let c = rgbFromHex(color); let step=0;
  const target=4.5;
  const towards = cr('#000000', bg) > cr('#ffffff', bg) ? [0,0,0] : [255,255,255];
  while(cr('#'+c.map(x=>x.toString(16).padStart(2,'0')).join(''), bg) < target && step<80){
    c = c.map((v,i)=> Math.round(v + Math.sign(towards[i]-v)*3));
    step++;
  }
  return '#'+c.map(x=>Math.max(0,Math.min(255,x)).toString(16).padStart(2,'0')).join('');
}
async function downloadThemeSuggestion(){
  try{
    const t = await fetch('config/theme.json',{cache:'no-store'}).then(r=>r.json());
    const v = {...t.variants.dark};
    const keys = ['fg','acc','ok','warn','danger'];
    keys.forEach(k=>{ v[k] = adjustForAA(v[k], v.bg); });
    const suggestion = {...t, variants:{...t.variants, dark:v}};
    const blob = new Blob([JSON.stringify(suggestion,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'theme_fixed.json';
    a.click(); URL.revokeObjectURL(a.href);
  }catch(e){ alert('Konnte theme.json nicht laden.'); }
}
