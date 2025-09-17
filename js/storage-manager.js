(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./helper-util'));
  } else {
    root.StorageManager = factory(root.HelperUtil);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (HelperUtil) {
  'use strict';

  const DB_NAME = 'provoware_content_plan';
  const DB_VERSION = 2;
  const RELEASE_STORE = 'releaseChecklist';
  const SNAPSHOT_STORE = 'snapshots';
  const META_STORE = 'meta';
  const RELEASE_KEY = 'provoware_release_check';

  function hasIndexedDB() {
    try {
      return typeof indexedDB !== 'undefined';
    } catch (err) {
      return false;
    }
  }

  function hashString(input) {
    if (typeof input !== 'string') {
      input = JSON.stringify(input || '');
    }
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    const normalized = (hash >>> 0).toString(16).padStart(8, '0');
    return `h${normalized}`;
  }

  function sanitizeReleaseState(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const next = {};
    if (raw.notes && typeof raw.notes === 'object') {
      const notes = {};
      Object.keys(raw.notes).forEach(key => {
        const value = raw.notes[key];
        if (typeof value === 'string') {
          notes[key] = value;
        }
      });
      if (Object.keys(notes).length > 0) {
        next.notes = notes;
      }
    }
    ['docs', 'browsers', 'feedback'].forEach(taskId => {
      const entry = raw[taskId];
      if (typeof entry === 'object') {
        next[taskId] = { done: Boolean(entry.done) };
      } else if (entry) {
        next[taskId] = true;
      }
    });
    return next;
  }

  function readLegacyReleaseState(helper) {
    if (!helper || typeof helper.safeGet !== 'function') return {};
    try {
      const raw = helper.safeGet(RELEASE_KEY);
      if (typeof raw !== 'string' || raw === '') return {};
      const parsed = JSON.parse(raw);
      return sanitizeReleaseState(parsed);
    } catch (err) {
      return {};
    }
  }

  class StorageManager {
    constructor(options = {}) {
      this.helper = options.helper || HelperUtil || {};
      this.cache = {
        releaseState: sanitizeReleaseState(options.initialReleaseState || readLegacyReleaseState(this.helper))
      };
      this.listeners = {
        release: new Set(),
        status: new Set()
      };
      this.driver = 'memory';
      this.db = null;
      this.memory = {
        releaseChecklist: null,
        snapshots: []
      };
      this.lastHash = this.cache.releaseState ? hashString(JSON.stringify(this.cache.releaseState)) : null;
      this.initPromise = hasIndexedDB() ? this.openDatabase() : Promise.resolve({ driver: 'memory' });
      this.initPromise
        .then(info => {
          this.driver = info && info.driver ? info.driver : this.driver;
        })
        .catch(err => {
          this.reportStatus('error', `IndexedDB-Initialisierung fehlgeschlagen: ${err && err.message ? err.message : err}`);
          this.driver = 'memory';
        });
    }

    whenReady() {
      return this.initPromise.catch(() => ({ driver: 'memory' }));
    }

    reportStatus(level, message) {
      this.listeners.status.forEach(listener => {
        try {
          listener({ level, message });
        } catch (err) {
          // Ignorieren
        }
      });
    }

    emit(event, payload) {
      const listeners = this.listeners[event];
      if (!listeners) return;
      listeners.forEach(listener => {
        try {
          listener(payload);
        } catch (err) {
          // Ignorieren
        }
      });
    }

    subscribeRelease(listener) {
      if (typeof listener !== 'function') return () => {};
      this.listeners.release.add(listener);
      return () => this.listeners.release.delete(listener);
    }

    subscribeStatus(listener) {
      if (typeof listener !== 'function') return () => {};
      this.listeners.status.add(listener);
      return () => this.listeners.status.delete(listener);
    }

    openDatabase() {
      return new Promise(resolve => {
        let resolved = false;
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = event => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(RELEASE_STORE)) {
            db.createObjectStore(RELEASE_STORE);
          }
          if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
            db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id', autoIncrement: true }).createIndex('createdAt', 'createdAt');
          }
          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE);
          }
        };
        request.onerror = () => {
          this.driver = 'memory';
          this.reportStatus('warn', `IndexedDB deaktiviert, verwende Fallback (${request.error && request.error.message ? request.error.message : 'unbekannt'})`);
          if (!resolved) {
            resolved = true;
            resolve({ driver: 'memory' });
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            this.reportStatus('warn', 'IndexedDB-Version geändert, Verbindung geschlossen');
          };
          this.db = db;
          this.driver = 'indexeddb';
          this.migrateToIndexedDB(db)
            .then(migrated => {
              if (migrated) {
                this.cache.releaseState = sanitizeReleaseState(migrated);
                this.lastHash = hashString(JSON.stringify(this.cache.releaseState));
                this.emit('release', this.cache.releaseState);
              }
              if (!resolved) {
                resolved = true;
                resolve({ driver: 'indexeddb' });
              }
            })
            .catch(err => {
              this.reportStatus('error', `Migration fehlgeschlagen: ${err && err.message ? err.message : err}`);
              if (!resolved) {
                resolved = true;
                resolve({ driver: 'indexeddb' });
              }
            });
        };
      });
    }

    migrateToIndexedDB(db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction([RELEASE_STORE], 'readwrite');
        const store = tx.objectStore(RELEASE_STORE);
        const getReq = store.get('state');
        getReq.onsuccess = () => {
          const existing = getReq.result;
          if (existing && typeof existing === 'object' && typeof existing.payload === 'string') {
            try {
              const parsed = JSON.parse(existing.payload);
              resolve(parsed);
            } catch (err) {
              resolve({});
            }
            return;
          }
          const legacy = readLegacyReleaseState(this.helper);
          const payload = JSON.stringify(legacy || {});
          const hash = hashString(payload);
          const putReq = store.put({ payload, hash, updatedAt: Date.now() }, 'state');
          putReq.onsuccess = () => {
            this.addSnapshotRecord(db, payload, hash).finally(() => resolve(legacy));
          };
          putReq.onerror = () => reject(putReq.error || new Error('Legacy-Übernahme fehlgeschlagen'));
        };
        getReq.onerror = () => reject(getReq.error || new Error('Lesen aus IndexedDB fehlgeschlagen'));
        tx.onerror = () => reject(tx.error || new Error('IndexedDB-Transaktion fehlgeschlagen'));
      });
    }

    addSnapshotRecord(db, payload, hash, meta = {}) {
      return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          resolve(null);
          return;
        }
        const tx = db.transaction([SNAPSHOT_STORE], 'readwrite');
        const store = tx.objectStore(SNAPSHOT_STORE);
        const record = { payload, hash, createdAt: Date.now(), meta };
        const request = store.add(record);
        request.onsuccess = () => {
          record.id = request.result;
          resolve(record);
        };
        request.onerror = () => reject(request.error || new Error('Snapshot konnte nicht gespeichert werden'));
      });
    }

    removeSnapshotRecord(db, id) {
      return new Promise(resolve => {
        if (!db || !db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          resolve(false);
          return;
        }
        const tx = db.transaction([SNAPSHOT_STORE], 'readwrite');
        const store = tx.objectStore(SNAPSHOT_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    }

    getReleaseStateSync() {
      return this.cache.releaseState;
    }

    getReleaseState() {
      return this.whenReady().then(() => this.cache.releaseState);
    }

    saveReleaseState(state, meta = {}) {
      const sanitized = sanitizeReleaseState(state);
      this.cache.releaseState = sanitized;
      const payload = JSON.stringify(sanitized || {});
      const hash = hashString(payload);
      this.lastHash = hash;
      if (this.helper && typeof this.helper.safeSet === 'function') {
        try {
          this.helper.safeSet(RELEASE_KEY, payload);
        } catch (err) {
          // Ignorieren
        }
      }
      if (!this.initPromise || this.driver === 'memory' || !this.db) {
        this.memory.releaseChecklist = { payload, hash, updatedAt: Date.now(), meta };
        this.memory.snapshots.push({ id: this.memory.snapshots.length + 1, payload, hash, createdAt: Date.now(), meta });
        this.emit('release', sanitized);
        return Promise.resolve({ driver: 'memory', hash });
      }
      return this.initPromise.then(() => {
        if (!this.db) {
          this.memory.releaseChecklist = { payload, hash, updatedAt: Date.now(), meta };
          this.memory.snapshots.push({ id: this.memory.snapshots.length + 1, payload, hash, createdAt: Date.now(), meta });
          this.emit('release', sanitized);
          return { driver: 'memory', hash };
        }
        return this.addSnapshotRecord(this.db, payload, hash, meta)
          .then(snapshot => new Promise((resolve, reject) => {
            const tx = this.db.transaction([RELEASE_STORE], 'readwrite');
            tx.oncomplete = () => {
              this.emit('release', sanitized);
              this.reportStatus('ok', 'Release-Checkliste gespeichert');
              resolve({ driver: 'indexeddb', hash, snapshot });
            };
            tx.onerror = () => {
              const err = tx.error || new Error('Transaktion fehlgeschlagen');
              this.removeSnapshotRecord(this.db, snapshot && snapshot.id);
              this.reportStatus('error', `Speichern fehlgeschlagen: ${err.message || err}`);
              reject(err);
            };
            const store = tx.objectStore(RELEASE_STORE);
            store.put({ payload, hash, updatedAt: Date.now(), meta }, 'state');
          }))
          .catch(err => {
            this.reportStatus('error', `Snapshot-Speicherung fehlgeschlagen: ${err && err.message ? err.message : err}`);
            return { driver: 'indexeddb', hash, error: err };
          });
      });
    }

    getSnapshots(limit = 5) {
      if (!this.db || this.driver === 'memory') {
        return Promise.resolve(this.memory.snapshots.slice(-limit).reverse());
      }
      return this.initPromise.then(() => new Promise(resolve => {
        if (!this.db) {
          resolve(this.memory.snapshots.slice(-limit).reverse());
          return;
        }
        const tx = this.db.transaction([SNAPSHOT_STORE], 'readonly');
        const store = tx.objectStore(SNAPSHOT_STORE);
        const index = store.index('createdAt');
        const snapshots = [];
        index.openCursor(null, 'prev').onsuccess = event => {
          const cursor = event.target.result;
          if (cursor && snapshots.length < limit) {
            snapshots.push(cursor.value);
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve(snapshots);
        tx.onerror = () => resolve([]);
      }));
    }

    getDriver() {
      return this.driver;
    }

    getLastHash() {
      return this.lastHash;
    }
  }

  function create(options) {
    return new StorageManager(options);
  }

  return { create, StorageManager, hashString, sanitizeReleaseState };
});
