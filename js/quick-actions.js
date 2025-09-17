(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QuickActionHelper = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function getById(helper, id) {
    if (helper && typeof helper.byId === 'function') {
      return helper.byId(id);
    }
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      return document.getElementById(id);
    }
    return null;
  }

  function optionSignature(months) {
    return Array.isArray(months) ? months.join('|') : '';
  }

  function ensureMonthOptions(select, months) {
    if (!select || typeof select.innerHTML === 'undefined') return;
    const signature = optionSignature(months);
    if (select.dataset && select.dataset.qaOptions === signature) return;
    if (!Array.isArray(months) || months.length === 0) return;
    select.innerHTML = months.map((name, idx) => {
      const no = String(idx + 1).padStart(2, '0');
      return `<option value="${idx}">${no} – ${name}</option>`;
    }).join('');
    if (select.dataset) {
      select.dataset.qaOptions = signature;
    }
  }

  function resolveDefaultMonth(options) {
    if (options && typeof options.getDefaultMonth === 'function') {
      const value = options.getDefaultMonth();
      if (typeof value === 'number' && value >= 0) return value;
    }
    if (options && typeof options.defaultMonth === 'number' && options.defaultMonth >= 0) {
      return options.defaultMonth;
    }
    return 0;
  }

  function syncMonthSelector(options = {}) {
    const select = getById(options.helper, 'quick-month');
    if (!select) return null;
    ensureMonthOptions(select, options.months || []);
    const value = resolveDefaultMonth(options);
    select.value = String(value);
    return value;
  }

  function bindOnce(element, type, handler) {
    if (!element || typeof element.addEventListener !== 'function') return false;
    const key = `qaBound${type}`;
    if (element.dataset && element.dataset[key]) return false;
    element.addEventListener(type, handler);
    if (element.dataset) {
      element.dataset[key] = '1';
    }
    return true;
  }

  function initQuickActions(options = {}) {
    const { helper, focusToday, jumpNextFree, exportOpenDaysTXT, openOverview, updateStatus, months, getYear } = options;
    const defaultMonth = syncMonthSelector(options);

    const todayBtn = getById(helper, 'quick-today');
    bindOnce(todayBtn, 'click', () => {
      if (typeof focusToday === 'function') focusToday();
    });

    const freeBtn = getById(helper, 'quick-next-free');
    bindOnce(freeBtn, 'click', () => {
      if (typeof jumpNextFree === 'function') jumpNextFree();
    });

    const exportBtn = getById(helper, 'quick-open-export');
    bindOnce(exportBtn, 'click', () => {
      if (typeof exportOpenDaysTXT === 'function') exportOpenDaysTXT();
      if (typeof updateStatus === 'function') updateStatus('TXT mit freien Tagen gespeichert');
    });

    const monthSelect = getById(helper, 'quick-month');
    const monthBtn = getById(helper, 'quick-month-overview');
    bindOnce(monthBtn, 'click', () => {
      if (!monthSelect) return;
      const idx = parseInt(monthSelect.value, 10);
      if (Number.isNaN(idx)) return;
      if (typeof openOverview === 'function') openOverview('month', idx);
      if (typeof updateStatus === 'function' && Array.isArray(months)) {
        const label = months[idx] || `${idx + 1}. Monat`;
        const year = typeof getYear === 'function' ? getYear() : '';
        const suffix = year ? ` ${year}` : '';
        updateStatus(`Monatsübersicht geöffnet: ${label}${suffix}`);
      }
    });

    const yearBtn = getById(helper, 'quick-year-overview');
    bindOnce(yearBtn, 'click', () => {
      if (typeof openOverview === 'function') openOverview('year');
      if (typeof updateStatus === 'function') {
        const year = typeof getYear === 'function' ? getYear() : '';
        updateStatus(`Jahresübersicht geöffnet: ${year || 'unbekanntes Jahr'}`);
      }
    });

    return { defaultMonth };
  }

  return { initQuickActions, syncMonthSelector };
});
