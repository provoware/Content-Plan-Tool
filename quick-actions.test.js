/** @jest-environment jsdom */
const { initQuickActions, syncMonthSelector } = require('./js/quick-actions');

describe('QuickActionHelper', () => {
  let helper;
  let focusToday;
  let jumpNextFree;
  let exportOpenDaysTXT;
  let openOverview;
  let updateStatus;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="quick-today"></button>
      <button id="quick-next-free"></button>
      <button id="quick-open-export"></button>
      <select id="quick-month"></select>
      <button id="quick-month-overview"></button>
      <button id="quick-year-overview"></button>
    `;
    helper = { byId: id => document.getElementById(id) };
    focusToday = jest.fn();
    jumpNextFree = jest.fn();
    exportOpenDaysTXT = jest.fn();
    openOverview = jest.fn();
    updateStatus = jest.fn();
  });

  test('initQuickActions binds handlers and populates month select once', () => {
    const months = ['Januar', 'Februar', 'März'];
    initQuickActions({
      helper,
      focusToday,
      jumpNextFree,
      exportOpenDaysTXT,
      openOverview,
      updateStatus,
      months,
      defaultMonth: 1,
      getYear: () => 2025
    });

    document.getElementById('quick-today').click();
    document.getElementById('quick-next-free').click();
    document.getElementById('quick-open-export').click();
    document.getElementById('quick-month-overview').click();
    document.getElementById('quick-year-overview').click();

    expect(focusToday).toHaveBeenCalledTimes(1);
    expect(jumpNextFree).toHaveBeenCalledTimes(1);
    expect(exportOpenDaysTXT).toHaveBeenCalledTimes(1);
    expect(openOverview).toHaveBeenCalledWith('month', 1);
    expect(openOverview).toHaveBeenCalledWith('year');

    const statusMessages = updateStatus.mock.calls.map(call => call[0]);
    expect(statusMessages.some(msg => msg.includes('TXT mit freien Tagen gespeichert'))).toBe(true);
    expect(statusMessages.some(msg => msg.includes('Monatsübersicht geöffnet: Februar 2025'))).toBe(true);
    expect(statusMessages.some(msg => msg.includes('Jahresübersicht geöffnet: 2025'))).toBe(true);

    const select = document.getElementById('quick-month');
    expect(select.options).toHaveLength(months.length);
    expect(select.value).toBe('1');

    initQuickActions({
      helper,
      focusToday,
      jumpNextFree,
      exportOpenDaysTXT,
      openOverview,
      updateStatus,
      months,
      defaultMonth: 2,
      getYear: () => 2025
    });

    document.getElementById('quick-open-export').click();
    expect(exportOpenDaysTXT).toHaveBeenCalledTimes(2);
    expect(select.options).toHaveLength(months.length);
  });

  test('syncMonthSelector updates selection after year change', () => {
    const months = ['Januar', 'Februar'];
    initQuickActions({
      helper,
      focusToday,
      jumpNextFree,
      exportOpenDaysTXT,
      openOverview,
      updateStatus,
      months,
      defaultMonth: 0,
      getYear: () => 2024
    });
    const select = document.getElementById('quick-month');
    expect(select.value).toBe('0');

    const result = syncMonthSelector({ helper, months, defaultMonth: 1 });
    expect(result).toBe(1);
    expect(select.value).toBe('1');
  });
});
