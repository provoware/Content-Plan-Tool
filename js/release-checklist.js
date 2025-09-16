(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ReleaseChecklist = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'provoware_release_check';
  const NBSP_NARROW = '\u202f';
  const TASKS = [
    {
      id: 'docs',
      title: 'Dokumentation finalisieren',
      description: 'README.md und ANLEITUNG.md auf den neuesten Stand bringen.',
      link: 'README.md',
      linkLabel: 'README',
      hint: 'Öffne README.md und ANLEITUNG.md, prüfe Inhalte und Screenshots, danach erneut speichern.'
    },
    {
      id: 'browsers',
      title: 'Cross-Browser testen',
      description: 'Kalender in Chrome, Firefox und einem zweiten Browser deiner Wahl prüfen.',
      hint: 'Starte nacheinander Chrome, Firefox und z.\u00a0B. Edge oder Safari, öffne index.html und wiederhole die Kernabläufe.'
    },
    {
      id: 'feedback',
      title: 'Live-Vorschau mit Feedback testen',
      description: 'Live-Vorschau im Einstellungsbereich mit Testpersonen ausprobieren und Rückmeldungen notieren.',
      hint: 'Bitte eine Testperson, Theme, Farbe und Schriftgröße zu ändern und notiere Feedback unter Notizen.'
    }
  ];

  function readState(helper) {
    const getter = helper && typeof helper.safeGet === 'function' ? helper.safeGet : () => null;
    try {
      const raw = getter(STORAGE_KEY);
      if (typeof raw !== 'string' || raw === '') return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function writeState(helper, state) {
    const setter = helper && typeof helper.safeSet === 'function' ? helper.safeSet : () => false;
    try {
      setter(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      try {
        setter(STORAGE_KEY, '{}');
      } catch (e) {
        // Ignorieren, wenn auch der Fallback scheitert
      }
    }
  }

  function computeSummary(state = {}) {
    const total = TASKS.length;
    const completed = TASKS.reduce((count, task) => count + (state[task.id] ? 1 : 0), 0);
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return {
      total,
      completed,
      percent,
      label: `${completed} von ${total} erledigt (${percent}${NBSP_NARROW}%)`
    };
  }

  function setTask(state = {}, taskId, done) {
    const next = { ...state };
    if (done) next[taskId] = true; else delete next[taskId];
    return next;
  }

  function formatPercent(value) {
    return `${value}${NBSP_NARROW}%`;
  }

  function init(options = {}) {
    const { container, helper, onStatus, onLog } = options;
    if (!container || typeof container !== 'object') {
      return { summary: computeSummary({}) };
    }
    let state = readState(helper);
    const summary = computeSummary(state);

    container.innerHTML = '';
    if (container.classList) container.classList.add('release-card');

    const header = document.createElement('div');
    header.className = 'release-card__header';

    const titleBox = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'release-card__title';
    title.textContent = 'Release-Checkliste';
    const progress = document.createElement('p');
    progress.className = 'release-card__progress';
    progress.textContent = summary.label;
    titleBox.appendChild(title);
    titleBox.appendChild(progress);

    const meterBox = document.createElement('div');
    meterBox.className = 'release-card__meter';
    const meter = document.createElement('progress');
    meter.max = summary.total;
    meter.value = summary.completed;
    meter.setAttribute('aria-label', 'Fortschritt Release-Checkliste');
    const percentLabel = document.createElement('span');
    percentLabel.className = 'release-card__percent';
    percentLabel.textContent = formatPercent(summary.percent);
    meterBox.appendChild(meter);
    meterBox.appendChild(percentLabel);

    header.appendChild(titleBox);
    header.appendChild(meterBox);
    container.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'release-card__list';

    TASKS.forEach(task => {
      const item = document.createElement('li');
      item.className = 'release-card__item';

      const label = document.createElement('label');
      label.className = 'release-card__label';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.task = task.id;
      checkbox.checked = Boolean(state[task.id]);
      checkbox.setAttribute('aria-describedby', `${task.id}-hint`);

      const textWrap = document.createElement('span');
      textWrap.className = 'release-card__text';
      const taskTitle = document.createElement('span');
      taskTitle.className = 'release-card__item-title';
      taskTitle.textContent = task.title;
      const taskDesc = document.createElement('span');
      taskDesc.className = 'release-card__item-desc';
      taskDesc.id = `${task.id}-hint`;
      taskDesc.textContent = task.description;
      textWrap.appendChild(taskTitle);
      textWrap.appendChild(taskDesc);

      label.appendChild(checkbox);
      label.appendChild(textWrap);
      item.appendChild(label);

      const actions = document.createElement('div');
      actions.className = 'release-card__actions';
      if (task.link) {
        const anchor = document.createElement('a');
        anchor.href = task.link;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        anchor.className = 'link-btn';
        anchor.textContent = task.linkLabel || 'Öffnen';
        actions.appendChild(anchor);
      }
      if (task.hint) {
        const hintBtn = document.createElement('button');
        hintBtn.type = 'button';
        hintBtn.className = 'secondary small';
        hintBtn.textContent = 'Tipp';
        hintBtn.addEventListener('click', () => {
          if (typeof onStatus === 'function') onStatus(task.hint);
        });
        actions.appendChild(hintBtn);
      }
      if (actions.childNodes.length > 0) {
        item.appendChild(actions);
      }

      checkbox.addEventListener('change', () => {
        state = setTask(state, task.id, checkbox.checked);
        writeState(helper, state);
        const updated = computeSummary(state);
        meter.value = updated.completed;
        percentLabel.textContent = formatPercent(updated.percent);
        progress.textContent = updated.label;
        if (typeof onStatus === 'function') {
          onStatus(checkbox.checked
            ? `Release-Aufgabe erledigt: ${task.title}`
            : `Release-Aufgabe reaktiviert: ${task.title}`);
        }
        if (typeof onLog === 'function') {
          onLog(checkbox.checked
            ? `Release-Check: erledigt – ${task.title}`
            : `Release-Check: erneut offen – ${task.title}`);
        }
      });

      list.appendChild(item);
    });

    container.appendChild(list);

    const footer = document.createElement('div');
    footer.className = 'release-card__footer';
    const footerText = document.createElement('p');
    footerText.className = 'release-card__footer-text';
    footerText.textContent = 'Tipp: Nach jedem Haken einen kurzen manuellen Funktionstest durchführen.';
    const guideLink = document.createElement('a');
    guideLink.href = 'ANLEITUNG.md';
    guideLink.target = '_blank';
    guideLink.rel = 'noopener';
    guideLink.className = 'link-btn';
    guideLink.textContent = 'Anleitung öffnen';
    footer.appendChild(footerText);
    footer.appendChild(guideLink);
    container.appendChild(footer);

    return { summary };
  }

  return { init, computeSummary, setTask, loadState: readState, saveState: writeState };
});
