/** @jest-environment jsdom */
const { init, computeSummary, setTask } = require('./js/release-checklist');

describe('ReleaseChecklist module', () => {
  test('computeSummary returns totals and label', () => {
    const summary = computeSummary({ docs: true, browsers: true });
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.completed).toBe(2);
    expect(summary.label).toContain('2 von');
  });

  test('setTask toggles entries immutably', () => {
    const state = { docs: true };
    const next = setTask(state, 'browsers', true);
    expect(next).not.toBe(state);
    expect(next.docs).toBe(true);
    expect(next.browsers).toBe(true);
    const cleared = setTask(next, 'docs', false);
    expect(cleared.docs).toBeUndefined();
    expect(cleared.browsers).toBe(true);
  });

  test('init renders checklist, respects storage and persists changes', () => {
    document.body.innerHTML = '<div id="rc"></div>';
    const helper = {
      safeGet: jest.fn().mockReturnValue(JSON.stringify({ docs: true })),
      safeSet: jest.fn()
    };
    const status = jest.fn();
    const log = jest.fn();

    const { summary } = init({
      container: document.getElementById('rc'),
      helper,
      onStatus: status,
      onLog: log
    });

    expect(summary.completed).toBe(1);
    const checkboxes = document.querySelectorAll('#rc input[type="checkbox"]');
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0].checked).toBe(true);

    checkboxes[1].click();
    expect(helper.safeSet).toHaveBeenCalled();
    const storageKey = helper.safeSet.mock.calls[0][0];
    expect(storageKey).toBe('provoware_release_check');
    expect(status.mock.calls.some(call => call[0].includes('erledigt'))).toBe(true);
    expect(log.mock.calls.some(call => call[0].includes('erledigt'))).toBe(true);

    const progressText = document.querySelector('.release-card__progress').textContent;
    expect(progressText).toMatch(/2 von 3/);

    checkboxes[1].click();
    expect(status.mock.calls.some(call => call[0].includes('reaktiviert'))).toBe(true);
  });
});
