const THEMES = ['hell', 'dunkel', 'kontrast'];
function normalizeTheme(val) {
  return THEMES.includes(val) ? val : 'hell';
}
if (typeof module !== 'undefined') {
  module.exports = { THEMES, normalizeTheme };
}
