const { formatDateTime } = require('./js/time');

test('formatDateTime toggles 12/24 hour', () => {
  const d = new Date('2020-01-01T13:00:00Z');
  const twelve = formatDateTime(d, true, 'en-US');
  const twentyFour = formatDateTime(d, false, 'en-US');
  expect(twelve).toMatch(/PM/i);
  expect(twentyFour).toMatch(/13:00/);
});
