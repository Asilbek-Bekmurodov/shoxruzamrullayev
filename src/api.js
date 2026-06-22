// Talks to the document API (server/index.js). Override the base in
// production by setting VITE_API_URL at build time.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TOKEN_KEY = "admin-token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Turn a server-relative file url (/files/..) into an absolute one.
export function fileUrl(url) {
  return url?.startsWith("http") ? url : `${API_URL}${url}`;
}

export async function login(password) {
  const r = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!r.ok) throw new Error("login failed");
  return r.json();
}

export async function listDocuments() {
  const r = await fetch(`${API_URL}/api/documents`);
  if (!r.ok) throw new Error("fetch failed");
  return r.json();
}

export async function uploadDocument(fields) {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => v != null && form.append(k, v));
  const r = await fetch(`${API_URL}/api/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  if (r.status === 401) throw new Error("unauthorized");
  if (!r.ok) throw new Error("upload failed");
  return r.json();
}

export async function deleteDocument(id) {
  const r = await fetch(`${API_URL}/api/documents/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (r.status === 401) throw new Error("unauthorized");
  if (!r.ok) throw new Error("delete failed");
  return r.json();
}
