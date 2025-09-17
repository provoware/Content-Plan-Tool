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
  const STATUS_LEVELS = [
    { min: 100, label: 'Bereit für Release', tone: 'ready' },
    { min: 67, label: 'Fast geschafft', tone: 'almost' },
    { min: 34, label: 'Gut unterwegs', tone: 'progress' },
    { min: 0, label: 'Noch Aufgaben offen', tone: 'open' }
  ];
  const TASKS = [
    {
      id: 'docs',
      title: 'Dokumentation finalisieren',
      description: 'README.md und ANLEITUNG.md auf den neuesten Stand bringen.',
      link: 'README.md',
      linkLabel: 'README',
      hint: 'Öffne README.md und ANLEITUNG.md, prüfe Inhalte und Screenshots, danach erneut speichern.',
      notePlaceholder: 'Änderungen an der Dokumentation festhalten…'
    },
    {
      id: 'browsers',
      title: 'Cross-Browser testen',
      description: 'Kalender in Chrome, Firefox und einem zweiten Browser deiner Wahl prüfen.',
      hint: 'Starte nacheinander Chrome, Firefox und z.\u00a0B. Edge oder Safari, öffne index.html und wiederhole die Kernabläufe.',
      notePlaceholder: 'Getestete Browser, Versionen und Auffälligkeiten notieren…'
    },
    {
      id: 'feedback',
      title: 'Live-Vorschau mit Feedback testen',
      description: 'Live-Vorschau im Einstellungsbereich mit Testpersonen ausprobieren und Rückmeldungen notieren.',
      hint: 'Bitte eine Testperson, Theme, Farbe und Schriftgröße zu ändern und notiere Feedback unter Notizen.',
      notePlaceholder: 'Feedback der Testpersonen dokumentieren…'
    }
  ];

  function readState(helper) {
    const getter = helper && typeof helper.safeGet === 'function' ? helper.safeGet : () => null;
    try {
      const raw = getter(STORAGE_KEY);
      if (typeof raw !== 'string' || raw === '') return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      if (parsed.notes && typeof parsed.notes !== 'object') {
        delete parsed.notes;
      }
      if (parsed.notes) {
        Object.keys(parsed.notes).forEach(key => {
          const value = parsed.notes[key];
          if (typeof value !== 'string') {
            delete parsed.notes[key];
          } else {
            parsed.notes[key] = value;
          }
        });
        if (Object.keys(parsed.notes).length === 0) {
          delete parsed.notes;
        }
      }
      return parsed;
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
    const completed = TASKS.reduce((count, task) => {
      const entry = state[task.id];
      const done = typeof entry === 'object' ? Boolean(entry && entry.done) : Boolean(entry);
      return count + (done ? 1 : 0);
    }, 0);
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
    if (state.notes && typeof state.notes === 'object') {
      next.notes = { ...state.notes };
    }
    if (done) {
      const entry = next[taskId];
      if (entry && typeof entry === 'object') {
        next[taskId] = { ...entry, done: true };
      } else {
        next[taskId] = true;
      }
    } else if (next[taskId] && typeof next[taskId] === 'object') {
      next[taskId] = { ...next[taskId], done: false };
    } else {
      delete next[taskId];
    }
    return next;
  }

  function formatPercent(value) {
    return `${value}${NBSP_NARROW}%`;
  }

  function describeStatus(percent) {
    return STATUS_LEVELS.find(level => percent >= level.min) || STATUS_LEVELS[STATUS_LEVELS.length - 1];
  }

  function setNote(state = {}, taskId, note) {
    const next = { ...state };
    const notes = { ...(state.notes && typeof state.notes === 'object' ? state.notes : {}) };
    const trimmed = typeof note === 'string' ? note.trim() : '';
    if (trimmed) {
      notes[taskId] = trimmed;
    } else {
      delete notes[taskId];
    }
    if (Object.keys(notes).length > 0) {
      next.notes = notes;
    } else {
      delete next.notes;
    }
    return next;
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
    titleBox.className = 'release-card__title-box';
    const title = document.createElement('p');
    title.className = 'release-card__title';
    title.textContent = 'Release-Checkliste';
    const statusBadge = document.createElement('span');
    statusBadge.className = 'release-card__status';
    const statusInfo = describeStatus(summary.percent);
    statusBadge.textContent = statusInfo.label;
    statusBadge.dataset.tone = statusInfo.tone;
    const progress = document.createElement('p');
    progress.className = 'release-card__progress';
    progress.textContent = summary.label;
    titleBox.appendChild(title);
    titleBox.appendChild(statusBadge);
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
      const entry = state[task.id];
      checkbox.checked = typeof entry === 'object' ? Boolean(entry.done) : Boolean(entry);
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

      const noteWrap = document.createElement('div');
      noteWrap.className = 'release-card__note-wrap';
      const noteLabel = document.createElement('label');
      noteLabel.className = 'release-card__note-label';
      const noteId = `${task.id}-note`;
      noteLabel.setAttribute('for', noteId);
      noteLabel.textContent = 'Notiz / Testergebnis';
      const noteField = document.createElement('textarea');
      noteField.id = noteId;
      noteField.className = 'release-card__note-field';
      noteField.rows = 2;
      noteField.placeholder = task.notePlaceholder || 'Kurznotiz erfassen…';
      const taskNotes = state.notes && typeof state.notes === 'object' ? state.notes[task.id] : '';
      noteField.value = typeof taskNotes === 'string' ? taskNotes : '';
      noteField.addEventListener('change', () => {
        state = setNote(state, task.id, noteField.value);
        writeState(helper, state);
        if (typeof onStatus === 'function') {
          if (noteField.value && noteField.value.trim()) {
            onStatus(`Notiz gespeichert: ${task.title}`);
          } else {
            onStatus(`Notiz entfernt: ${task.title}`);
          }
        }
        if (typeof onLog === 'function') {
          onLog(noteField.value && noteField.value.trim()
            ? `Release-Check: Notiz aktualisiert – ${task.title}`
            : `Release-Check: Notiz entfernt – ${task.title}`);
        }
      });
      noteWrap.appendChild(noteLabel);
      noteWrap.appendChild(noteField);
      item.appendChild(noteWrap);

      checkbox.addEventListener('change', () => {
        state = setTask(state, task.id, checkbox.checked);
        writeState(helper, state);
        const updated = computeSummary(state);
        meter.value = updated.completed;
        percentLabel.textContent = formatPercent(updated.percent);
        progress.textContent = updated.label;
        const statusData = describeStatus(updated.percent);
        statusBadge.textContent = statusData.label;
        statusBadge.dataset.tone = statusData.tone;
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

  return { init, computeSummary, setTask, setNote, loadState: readState, saveState: writeState };
});
