/** @jest-environment jsdom */
const { init, computeSummary, setTask, setNote } = require('./js/release-checklist');

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

  test('setNote stores trimmed note values immutably', () => {
    const state = { docs: true, notes: { docs: 'Alt' } };
    const next = setNote(state, 'docs', '  Neuer Hinweis  ');
    expect(next).not.toBe(state);
    expect(next.notes.docs).toBe('Neuer Hinweis');
    expect(state.notes.docs).toBe('Alt');
    const cleared = setNote(next, 'docs', '  ');
    expect(cleared.notes).toBeUndefined();
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
    expect(status.mock.calls.some(call => call[0].includes('geladen'))).toBe(true);
    expect(log.mock.calls.some(call => call[0].includes('geladen'))).toBe(true);
    const checkboxes = document.querySelectorAll('#rc input[type="checkbox"]');
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0].checked).toBe(true);

    const nextInfo = document.querySelector('.release-card__next-info');
    const nextTitle = document.querySelector('.release-card__next-title');
    const nextButton = document.querySelector('.release-card__next-button');
    expect(nextTitle.textContent).toContain('Nächster Schritt');
    expect(nextInfo.textContent).toContain('Cross-Browser');
    expect(nextButton.disabled).toBe(false);
    expect(nextButton.dataset.target).toBe('browsers');

    checkboxes[1].click();
    expect(helper.safeSet).toHaveBeenCalled();
    const storageKey = helper.safeSet.mock.calls[0][0];
    expect(storageKey).toBe('provoware_release_check');
    expect(status.mock.calls.some(call => call[0].includes('erledigt'))).toBe(true);
    expect(log.mock.calls.some(call => call[0].includes('erledigt'))).toBe(true);

    const progressText = document.querySelector('.release-card__progress').textContent;
    expect(progressText).toMatch(/2 von 3/);
    const badge = document.querySelector('.release-card__status');
    expect(badge.textContent).toMatch(/Gut unterwegs|Fast geschafft|Bereit für Release|Noch Aufgaben offen/);
    expect(nextInfo.textContent).toContain('Live-Vorschau');
    expect(nextButton.dataset.target).toBe('feedback');

    checkboxes[1].click();
    expect(status.mock.calls.some(call => call[0].includes('reaktiviert'))).toBe(true);
    expect(nextInfo.textContent).toContain('Cross-Browser');
    expect(nextButton.dataset.target).toBe('browsers');

    checkboxes.forEach(box => {
      if (!box.checked) box.click();
    });
    expect(nextButton.disabled).toBe(true);
    expect(nextTitle.textContent).toContain('Release-Check abgeschlossen');
    expect(nextInfo.textContent).toContain('Alle Aufgaben');
  });

  test('init renders note fields and saves updates', () => {
    document.body.innerHTML = '<div id="rc"></div>';
    const helper = {
      safeGet: jest.fn().mockReturnValue(JSON.stringify({
        browsers: true,
        notes: { browsers: 'Chrome/Firefox ✅' }
      })),
      safeSet: jest.fn()
    };
    const status = jest.fn();
    const log = jest.fn();

    init({
      container: document.getElementById('rc'),
      helper,
      onStatus: status,
      onLog: log
    });

    const noteField = document.getElementById('browsers-note');
    expect(noteField).toBeTruthy();
    expect(noteField.value).toBe('Chrome/Firefox ✅');
    noteField.value = 'Chrome, Firefox, Edge';
    noteField.dispatchEvent(new Event('change', { bubbles: true }));
    expect(helper.safeSet).toHaveBeenCalled();
    const payload = JSON.parse(helper.safeSet.mock.calls.slice(-1)[0][1]);
    expect(payload.notes.browsers).toBe('Chrome, Firefox, Edge');
    expect(status.mock.calls.some(call => call[0].includes('Notiz gespeichert'))).toBe(true);
    expect(log.mock.calls.some(call => call[0].includes('Notiz aktualisiert'))).toBe(true);
  });
});
