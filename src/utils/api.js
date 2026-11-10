const GAS = `https://script.google.com/macros/s/${import.meta.env.PUBLIC_PROD_GOOGLE_APPSCRIPT_ID}/exec`;
const TIMEOUT_MS = 20_000;

async function request(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...opts, redirect: "follow", signal: ctrl.signal });
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function gasGet(type = "all", force = false) {
  const suffix = force ? "&force=1" : "";
  return request(GAS + "?type=" + type + suffix);
}

export async function gasSave(data) {
  return request(GAS + "?type=save", {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data),
  });
}

let syncing = 0;
let syncCb = null;
export function onSync(fn) {
  syncCb = fn;
}

export function getSyncing() {
  return syncing > 0;
}

async function track(p) {
  syncing++;
  syncCb?.(syncing);
  try {
    return await p;
  } finally {
    syncing--;
    syncCb?.(syncing);
  }
}

export function loadState(force = false) {
  return track(gasGet("state", force));
}

export function loadHistory(force = false) {
  return track(gasGet("history", force));
}

export function loadVersion() {
  return gasGet("version");
}

export function loadAll() {
  return track(gasGet("all"));
}

export function bgSave(data) {
  return track(gasSave(data));
}
