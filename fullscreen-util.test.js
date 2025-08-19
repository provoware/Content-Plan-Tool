const { shouldFullscreenFallback } = require('./js/fullscreen-util');

test('erkennt fehlendes Fullscreen', () => {
  expect(shouldFullscreenFallback({ fullscreenEnabled: false })).toBe(true);
});

test('nutzt API wenn unterstützt', () => {
  expect(shouldFullscreenFallback({ fullscreenEnabled: true })).toBe(false);
});

test('versucht API wenn Eigenschaft fehlt', () => {
  expect(shouldFullscreenFallback({})).toBe(false);
});
