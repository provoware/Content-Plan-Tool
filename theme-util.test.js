const { normalizeTheme } = require('./js/theme-util');

test('normalizeTheme falls back to hell', () => {
  expect(normalizeTheme('foo')).toBe('hell');
  expect(normalizeTheme('dunkel')).toBe('dunkel');
});
