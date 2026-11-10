import { writable, derived, get } from "svelte/store";
import { loadState, loadHistory, loadVersion, bgSave, onSync } from "./api.js";
import { applyBuffMath, makeId, rankBuffsForQueue, nowSec } from "./formulas.js";

export const buffs = writable([]);
export const history = writable([]);
export const givers = writable({});
export const nickList = writable([]);
export const template = writable({});
export const syncing = writable(0);
export const error = writable("");
export const rev = writable(0);
export const lastSyncAt = writable(0);

onSync((v) => syncing.set(v));

const LS_KEY = "trc_cache";
const FULL_REFRESH_SEC = 300;
const BUSY_ERROR = "Server busy, retry";
const BACKEND_ERROR = "Бэкенд не обновлён. Обновите Google Apps Script.";

let hasData = false;
let lastFullFetchAt = 0;
let historyWasLoaded = false;
let refreshPromise = null;
let forceQueued = false;
let failures = 0;
let retryAt = 0;
let backendReady = false;
let serverEpoch = "";

function resetBackoff() {
  failures = 0;
  retryAt = 0;
}

function bumpBackoff() {
  failures += 1;
  retryAt = nowSec() + Math.min(60, 5 * 2 ** (failures - 1));
}

function isBusy(d) {
  return d && d.error === BUSY_ERROR;
}

function ensureBackend() {
  if (backendReady) return true;
  error.set(BACKEND_ERROR);
  return false;
}

function checkEpoch(d) {
  if (!d.epoch) return false;

  if (!serverEpoch) {
    serverEpoch = d.epoch;
    if (get(rev) > 0) {
      rev.set(0);
      return true;
    }
    return false;
  }

  if (d.epoch === serverEpoch) return false;

  serverEpoch = d.epoch;
  rev.set(0);
  return true;
}

function saveToLS(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

function getFromLS() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY));
  } catch {
    return null;
  }
}

function persistState() {
  const cached = getFromLS() || {};
  saveToLS({
    ...cached,
    buffs: get(buffs),
    givers: get(givers),
    nicks: get(nickList),
    template: get(template),
    rev: get(rev),
    epoch: serverEpoch,
    checkedAt: lastFullFetchAt,
  });
}

function saveHistoryToLS(h) {
  const cached = getFromLS() || {};
  cached.history = h;
  saveToLS(cached);
}

function applyHistory(h) {
  history.set(h || []);
  saveHistoryToLS(h || []);
}

function isExpired(b) {
  return b.endAt <= nowSec();
}

function rememberNick(nick) {
  if (!nick) return;
  nickList.update((v) => (v.includes(nick) ? v : [...v, nick]));
}

function bgFail() {
  error.set("Ошибка синхронизации");
  refreshFromServer(true).catch(() => {});
  doLoadHistory();
}

// Деривативы
export const ranked = derived(buffs, ($buffs) => {
  const ns = nowSec();
  return rankBuffsForQueue(
    $buffs.filter((b) => b.endAt > ns),
    ns,
  );
});

export const build = derived(ranked, ($r) => $r.filter((i) => i.type === "Стройка"));
export const research = derived(ranked, ($r) => $r.filter((i) => i.type === "Исследования"));

// === СИНХРОНИЗАЦИЯ =========================================

function applyData(d, sheetRead, withHistory) {
  const epochChanged = checkEpoch(d);
  if (!epochChanged && typeof d.rev === "number" && d.rev < get(rev)) return false;

  const ns = nowSec();
  buffs.set((d.buffs || []).filter((b) => b.endAt > ns));
  if (withHistory) applyHistory(d.history || []);
  givers.set(d.givers || {});
  nickList.set(d.nicks || []);
  template.set(d.template || {});
  if (typeof d.rev === "number") {
    rev.set(d.rev);
    backendReady = true;
  }
  if (sheetRead) lastFullFetchAt = ns;
  hasData = true;
  lastSyncAt.set(ns);
  persistState();
  return true;
}

function applyState(d, sheetRead) {
  if (!applyData(d, sheetRead, false)) return;

  if (typeof d.rev === "number") {
    backendReady = true;
    error.set("");
  } else {
    backendReady = false;
    error.set(BACKEND_ERROR);
  }

  if (historyWasLoaded) doLoadHistory(sheetRead);
}

function applySaveResponse(d) {
  if (d.conflict) {
    applyData(d, true, true);
    error.set("Запись уже изменилась. Повторите.");
    return;
  }

  if (!d.ok) {
    bgFail();
    return;
  }

  if (!applyData(d, true, true)) return;

  if (typeof d.rev === "number") {
    error.set("");
  } else {
    backendReady = false;
    error.set(BACKEND_ERROR);
  }
}

async function doRefresh(bypassCache) {
  if (!bypassCache && nowSec() < retryAt) return;

  try {
    const needsFull = bypassCache || nowSec() - lastFullFetchAt > FULL_REFRESH_SEC;

    if (!hasData || needsFull) {
      const d = await loadState(needsFull);
      if (d.ok) {
        applyState(d, needsFull);
        resetBackoff();
      } else if (!isBusy(d)) {
        bumpBackoff();
        error.set("Ошибка синхронизации");
      }
      return;
    }

    const v = await loadVersion();
    if (!v.ok) {
      if (v.error === "Unknown type: version") {
        backendReady = false;
        error.set(BACKEND_ERROR);
      } else if (!isBusy(v)) {
        bumpBackoff();
        error.set("Ошибка синхронизации");
      }
      return;
    }

    backendReady = true;
    const epochChanged = checkEpoch(v);

    if (epochChanged || v.rev !== get(rev)) {
      const d = await loadState(false);
      if (d.ok) {
        applyState(d, false);
        resetBackoff();
      } else if (!isBusy(d)) {
        bumpBackoff();
        error.set("Ошибка синхронизации");
      }
    } else {
      error.set("");
      lastSyncAt.set(nowSec());
      resetBackoff();
    }
  } catch {
    bumpBackoff();
    error.set("Ошибка синхронизации");
  }
}

export function refreshFromServer(bypassCache = false) {
  if (refreshPromise) {
    if (bypassCache) forceQueued = true;
    return refreshPromise.then(() => {
      if (!forceQueued) return;
      forceQueued = false;
      return refreshFromServer(true);
    });
  }

  refreshPromise = doRefresh(bypassCache).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export function startSync(intervalMs = 20_000) {
  let timer = null;
  let stopped = false;

  function schedule() {
    if (timer || stopped) return;
    timer = setInterval(() => refreshFromServer(), intervalMs);
  }

  function pause() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  function onVisibilityChange() {
    if (document.visibilityState === "visible") {
      schedule();
      retryAt = 0;
      refreshFromServer();
    } else {
      pause();
    }
  }

  function onFocus() {
    if (document.visibilityState !== "hidden") {
      retryAt = 0;
      refreshFromServer();
    }
  }

  function onOnline() {
    if (document.visibilityState !== "hidden") {
      retryAt = 0;
      refreshFromServer();
    }
  }

  if (document.visibilityState === "visible") schedule();
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onOnline);
  window.addEventListener("pageshow", onFocus);
  refreshFromServer();

  return () => {
    stopped = true;
    pause();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("pageshow", onFocus);
  };
}

// === ДЕЙСТВИЯ ==============================================

export function doApply(buffId, percent, giverNick) {
  if (!ensureBackend()) return;

  const now = nowSec();
  let updated = null;
  let baseCount = 0;

  buffs.update((arr) => {
    const idx = arr.findIndex((b) => b.id === buffId);
    if (idx === -1) return arr;
    baseCount = arr[idx].appliedCount || 0;
    updated = applyBuffMath(arr[idx], percent, now);
    const next = [...arr];
    next[idx] = updated;
    return next;
  });

  if (!updated) return;

  const histEntry = {
    id: "bh" + now + Math.random().toString(36).slice(2),
    recipient_id: buffId,
    recipient: updated.nick,
    type: updated.type,
    giver: giverNick || "Не указан",
    percent,
    time: now,
  };

  history.update((h) => [histEntry, ...h]);

  if (giverNick && giverNick !== "Не указан") {
    givers.update((g) => {
      const stat = g[giverNick] || { total: 0, last_buff: 0 };
      return { ...g, [giverNick]: { total: stat.total + 1, last_buff: now } };
    });
  }

  const body = {
    buff: updated,
    expectedAppliedCount: baseCount,
    historyEntry: histEntry,
  };
  if (giverNick && giverNick !== "Не указан") {
    body.giverStat = { nick: giverNick, ts: now };
    body.nick = giverNick;
  }
  body.nick2 = updated.nick;

  bgSave(body).then(applySaveResponse).catch(bgFail);
}

export function doDelete(buffId) {
  if (!ensureBackend()) return;

  buffs.update((arr) => arr.filter((b) => b.id !== buffId));
  bgSave({ deleteBuffId: buffId }).then(applySaveResponse).catch(bgFail);
}

export function doAdd(nick, type, days, hours, editId, priority = false) {
  if (!ensureBackend()) return false;

  const now = nowSec();
  const endAt = now + (days * 1440 + hours * 60) * 60;
  const prio = priority ? 1 : 0;
  let saved = null;
  let expectedCount = null;

  if (editId) {
    buffs.update((arr) => {
      const idx = arr.findIndex((b) => b.id === editId);
      if (idx === -1) return arr;
      expectedCount = arr[idx].appliedCount || 0;
      saved = {
        ...arr[idx],
        nick,
        type,
        endAt,
        priority: prio,
        queueReceived: 0,
        queueLastAt: 0,
      };
      const next = [...arr];
      next[idx] = saved;
      return next;
    });
  } else {
    saved = {
      id: makeId(),
      nick,
      type,
      buff: 15,
      endAt,
      createdAt: now,
      applied: 0,
      appliedCount: 0,
      queueReceived: 0,
      queueLastAt: 0,
      priority: prio,
    };
    buffs.update((arr) => [...arr, saved]);
  }

  if (!saved) return false;
  rememberNick(nick);

  const body = { buff: saved, nick };
  if (expectedCount !== null) body.expectedAppliedCount = expectedCount;

  bgSave(body).then(applySaveResponse).catch(bgFail);
  return true;
}

export async function doLoad(bypassCache = false) {
  const cached = getFromLS();
  if (cached) {
    buffs.set((cached.buffs || []).filter((b) => !isExpired(b)));
    history.set(cached.history || []);
    givers.set(cached.givers || {});
    nickList.set(cached.nicks || []);
    template.set(cached.template || {});
    if (typeof cached.rev === "number") rev.set(cached.rev);
    if (typeof cached.epoch === "string" && cached.epoch) serverEpoch = cached.epoch;
    if (typeof cached.checkedAt === "number") lastFullFetchAt = cached.checkedAt;
    hasData = true;
  }

  await refreshFromServer(bypassCache);
}

export async function doLoadHistory(force = false) {
  historyWasLoaded = true;
  try {
    const d = await loadHistory(force);
    if (d.ok) applyHistory(d.history || []);
    else if (!isBusy(d)) error.set("Ошибка синхронизации");
  } catch {
    error.set("Ошибка синхронизации");
  }
}

export function addNick(nick) {
  if (!nick || get(nickList).includes(nick)) return;
  rememberNick(nick);
  bgSave({ nick }).then(applySaveResponse).catch(bgFail);
}
