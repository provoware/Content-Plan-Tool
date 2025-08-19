
/* assets/theme.js – lädt config/theme.json und setzt CSS-Variablen */
export async function applyTheme(mode='auto'){
  const res = await fetch('config/theme.json', {cache:'no-store'});
  const theme = await res.json();
  const gs = await fetch('config/global_settings.json').then(r=>r.json()).catch(()=>({theme:'auto', contrast_mode:'AA'}));
  const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  let variant = (mode==='auto' ? (preferDark ? 'dark':'light') : mode);
  if(mode==='auto' && gs && gs.theme && gs.theme!=='auto'){ variant = gs.theme==='high-contrast' ? 'high_contrast' : gs.theme; }
  if(mode==='hc') variant='high_contrast';
  const v = theme.variants[variant] || theme.variants.dark;
  const root = document.documentElement;
  Object.entries(v).forEach(([k,val])=> root.style.setProperty(`--${k}`, val));
  root.dataset.theme = variant;
  return {theme, variant};
}
