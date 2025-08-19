function createHistory(limit = 50) {
  const undoStack = [];
  const redoStack = [];
  let current = null;
  function push(state) {
    if (current !== null) {
      undoStack.push(current);
      if (undoStack.length > limit) undoStack.shift();
    }
    current = state;
    redoStack.length = 0;
  }
  function undo() {
    if (!undoStack.length) return null;
    redoStack.push(current);
    current = undoStack.pop();
    return current;
  }
  function redo() {
    if (!redoStack.length) return null;
    undoStack.push(current);
    current = redoStack.pop();
    return current;
  }
  return {
    push,
    undo,
    redo,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    getCurrent: () => current
  };
}

if (typeof module !== 'undefined') {
  module.exports = { createHistory };
} else {
  window.createHistory = createHistory;
}
