import assert from "node:assert/strict";
import test from "node:test";

const storage = new Map();
const events = [];
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};
globalThis.dispatchEvent = (event) => events.push(event);

const { availableXp, levelOf, rankProgress, award, spend, unlocked } = await import("../src/gamify.js");
const { removeStored, setStored } = await import("../src/storage.js");

function resetGame(value = { xp: 0, spent: 0, done: [], unlocks: [], log: [] }) {
  removeStored("tavix_game");
  setStored("tavix_game", JSON.stringify(value));
  events.length = 0;
}

test("rank progress caps at the highest rank", () => {
  assert.equal(levelOf(0), 0);
  assert.equal(levelOf(100), 1);
  assert.equal(levelOf(500), 5);
  assert.equal(rankProgress(499), 99);
  assert.equal(rankProgress(500), 100);
  assert.equal(rankProgress(900), 100);
});

test("XP is awarded once per action and spending never reduces rank progress", () => {
  resetGame();
  award("mission-1", 100, "Mission launched");
  award("mission-1", 100, "Mission launched");
  assert.equal(availableXp(), 100);
  assert.equal(events.length, 1);
  assert.deepEqual(spend("hud-pulse"), { ok: true });
  assert.equal(availableXp(), 60);
  assert.equal(levelOf(JSON.parse(window.localStorage.getItem("tavix_game")).xp), 1);
  assert.equal(unlocked("hud-pulse"), true);
});

test("XP rewards cannot be spent twice", () => {
  resetGame({ xp: 100, spent: 0, done: [], unlocks: [], log: [] });
  assert.equal(spend("hud-pulse").ok, true);
  assert.equal(spend("hud-pulse").ok, false);
  assert.equal(availableXp(), 60);
});
