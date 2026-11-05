const fallback = new Map();

export function getStored(key) {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) {
      fallback.set(key, value);
      return value;
    }
  } catch {
    // Sandboxed previews may deny storage access; keep this tab's state in memory.
  }
  return fallback.get(key) ?? null;
}

export function setStored(key, value) {
  const text = String(value);
  fallback.set(key, text);
  try {
    window.localStorage.setItem(key, text);
  } catch {
    // The in-memory value remains available until this page is closed.
  }
}

export function removeStored(key) {
  fallback.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage is optional in embedded/sandboxed contexts.
  }
}
