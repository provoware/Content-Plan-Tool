const { createHistory } = require('./js/history');

test('undo and redo work with simple states', () => {
  const h = createHistory();
  h.push('a');
  h.push('b');
  expect(h.canUndo()).toBe(true);
  expect(h.undo()).toBe('a');
  expect(h.canRedo()).toBe(true);
  expect(h.redo()).toBe('b');
});
