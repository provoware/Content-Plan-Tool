const { hexToRgba } = require('./colors');

test('wandelt Hex in rgba um', () => {
  expect(hexToRgba('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)');
});
