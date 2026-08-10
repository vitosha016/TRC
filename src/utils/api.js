const GAS = `https://script.google.com/macros/s/${import.meta.env.PUBLIC_PROD_GOOGLE_APPSCRIPT_ID}/exec`;

export async function gasGet(type = "all") {
  const r = await fetch(GAS + "?type=" + type, { redirect: "follow" });
  return r.json();
}

export async function gasSave(data) {
  const r = await fetch(GAS + "?type=save", {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data),
  });
  return r.json();
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

export function loadState() {
  return track(gasGet("state"));
}

export function loadHistory() {
  return track(gasGet("history"));
}

export function loadAll() {
  return track(gasGet("all"));
}

export function bgSave(data) {
  return track(gasSave(data));
}
