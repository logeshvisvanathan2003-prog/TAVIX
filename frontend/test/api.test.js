import assert from "node:assert/strict";
import test from "node:test";

const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
};

const { api, ApiError } = await import("../src/api.js");

test("API errors retain HTTP status so admin saves can explain authorization failures", async () => {
  const originalFetch = globalThis.fetch;
  let requestOptions;
  globalThis.fetch = async (_url, options) => {
    requestOptions = options;
    return new Response(JSON.stringify({ detail: "Admin only" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await assert.rejects(api("/admin/bookings/1", { method: "PATCH", body: { status: "delivered" } }), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 403);
      assert.equal(error.message, "Admin only");
      return true;
    });
    assert.equal(requestOptions.cache, "no-store");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
