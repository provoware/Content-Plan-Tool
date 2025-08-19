function shouldFullscreenFallback(doc = document) {
  return 'fullscreenEnabled' in doc && doc.fullscreenEnabled === false;
}
if (typeof module !== 'undefined') {
  module.exports = { shouldFullscreenFallback };
}
