import { getStored, setStored } from "./storage.js";

const CURRENT_CHAT_KEY = "tavix_sid";

export function createChatSessionId() {
  const id = globalThis.crypto?.randomUUID?.().replace(/-/g, "") || `${Date.now()}${Math.random().toString(36).slice(2)}`;
  setStored(CURRENT_CHAT_KEY, id);
  return id;
}

export function currentChatSessionId() {
  return getStored(CURRENT_CHAT_KEY);
}

export function setCurrentChatSessionId(id) {
  setStored(CURRENT_CHAT_KEY, id);
}
