function copyText(text, statusFn) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => {
      if (statusFn) statusFn('Text kopiert');
      return true;
    }).catch(() => Promise.resolve(fallbackCopy(text, statusFn)));
  }
  return Promise.resolve(fallbackCopy(text, statusFn));
}

function fallbackCopy(text, statusFn) {
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
    if (statusFn) statusFn(ok ? 'Text kopiert' : 'Kopieren nicht möglich');
    return ok;
  } catch (err) {
    if (statusFn) statusFn('Kopieren nicht möglich');
    return false;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { copyText, fallbackCopy };
} else {
  window.copyText = copyText;
}
