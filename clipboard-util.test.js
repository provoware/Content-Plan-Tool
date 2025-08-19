/** @jest-environment jsdom */
const { copyText } = require('./js/clipboard-util');

test('fallback copy uses execCommand when clipboard API missing', async () => {
  document.execCommand = jest.fn(() => true);
  const status = jest.fn();
  const ok = await copyText('hello', status);
  expect(document.execCommand).toHaveBeenCalledWith('copy');
  expect(ok).toBe(true);
  expect(status).toHaveBeenCalledWith('Text kopiert');
});
