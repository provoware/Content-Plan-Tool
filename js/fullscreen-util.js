function shouldFullscreenFallback(doc = document) {
  return 'fullscreenEnabled' in doc && doc.fullscreenEnabled === false;
}

function isFullscreenShortcut(e) {
  const key = e.key ? e.key.toLowerCase() : '';
  const mod = e.ctrlKey || e.metaKey;
  return mod && e.shiftKey && key === 'f';
}
if (typeof module !== 'undefined') {
  module.exports = { shouldFullscreenFallback, isFullscreenShortcut };
}
