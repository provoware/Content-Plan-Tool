const { shouldFullscreenFallback, isFullscreenShortcut } = require('./js/fullscreen-util');

test('erkennt fehlendes Fullscreen', () => {
  expect(shouldFullscreenFallback({ fullscreenEnabled: false })).toBe(true);
});

test('nutzt API wenn unterstützt', () => {
  expect(shouldFullscreenFallback({ fullscreenEnabled: true })).toBe(false);
});

test('versucht API wenn Eigenschaft fehlt', () => {
  expect(shouldFullscreenFallback({})).toBe(false);
});

test('erkennt Tastenkürzel Strg+Shift+F', () => {
  expect(isFullscreenShortcut({ key: 'f', ctrlKey: true, shiftKey: true })).toBe(true);
  expect(isFullscreenShortcut({ key: 'f', metaKey: true, shiftKey: true })).toBe(true);
  expect(isFullscreenShortcut({ key: 'f', ctrlKey: true, shiftKey: false })).toBe(false);
});
