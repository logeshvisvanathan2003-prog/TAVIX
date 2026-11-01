import { getStored } from "./storage.js";

export const getToken = () => getStored("tavix_token");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const t = getToken();
  const r = await fetch("/api" + path, {
    method, cache: "no-store", headers: { "Content-Type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(typeof data.detail === "string" ? data.detail : "Request failed. Check the fields and try again.", r.status);
  return data;
}

export async function download(path, filename) {
  const t = getToken();
  const r = await fetch("/api" + path, { cache: "no-store", headers: t ? { Authorization: "Bearer " + t } : {} });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new ApiError(typeof data.detail === "string" ? data.detail : "Project download failed. Try again.", r.status);
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
