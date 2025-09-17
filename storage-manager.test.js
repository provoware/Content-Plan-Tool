const path = require('path');

describe('StorageManager', () => {
  let helper;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete global.indexedDB;
    delete global.IDBKeyRange;
    helper = {
      safeGet: jest.fn(),
      safeSet: jest.fn()
    };
  });

  test('migrates legacy state into IndexedDB and creates snapshots', async () => {
    require('fake-indexeddb/auto');
    helper.safeGet.mockReturnValue(JSON.stringify({
      docs: { done: true },
      notes: { docs: 'Done' }
    }));
    const storageModulePath = path.resolve(__dirname, 'js/storage-manager.js');
    const { create } = require(storageModulePath);
    const manager = create({ helper });
    await manager.whenReady();
    expect(manager.getDriver()).toBe('indexeddb');
    const state = await manager.getReleaseState();
    expect(state.docs).toBeTruthy();
    expect(state.notes.docs).toBe('Done');
    await manager.saveReleaseState({ browsers: true });
    const snapshots = await manager.getSnapshots(5);
    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots[0].hash).toBe(manager.getLastHash());
  });

  test('falls back to memory driver when IndexedDB is unavailable', async () => {
    helper.safeGet.mockReturnValue(null);
    const storageModulePath = path.resolve(__dirname, 'js/storage-manager.js');
    const { create } = require(storageModulePath);
    const manager = create({ helper });
    await manager.whenReady();
    expect(manager.getDriver()).toBe('memory');
    await manager.saveReleaseState({ feedback: true });
    const state = await manager.getReleaseState();
    expect(state.feedback).toBe(true);
    const snapshots = await manager.getSnapshots(3);
    expect(snapshots.length).toBeGreaterThan(0);
  });
});
