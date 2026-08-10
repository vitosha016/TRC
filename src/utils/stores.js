import { writable, derived } from "svelte/store";
import { loadState, loadHistory, bgSave, onSync } from "./api.js";
import { scoreBuff, getQueueFireIds, makeId } from "./formulas.js";

export const buffs = writable([]);
export const history = writable([]);
export const givers = writable({});
export const nickList = writable([]);
export const template = writable({});
export const syncing = writable(0);
export const error = writable("");

onSync((v) => syncing.set(v));

const LS_KEY = "trc_cache";

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

function bgFail() {
  error.set("Ошибка синхронизации");
  doLoad().then(() => setTimeout(() => error.set(""), 4000));
  doLoadHistory();
}

function isExpired(b) {
  return b.endAt <= nowSec();
}

// Деривативы
export const ranked = derived([buffs, givers], ([$buffs, $givers]) => {
  const ns = nowSec();
  const active = $buffs.filter((b) => b.endAt > ns);
  const enr = active.map((b) => ({ ...b, ...scoreBuff(b, ns, $givers) }));
  const fireIds = getQueueFireIds(enr);
  return enr
    .map((b) => ({ ...b, queueFire: fireIds.has(b.id) }))
    .sort((a, b) => (b.queueFire | 0) - (a.queueFire | 0) || b.score - a.score || b.left - a.left);
});

export const build = derived(ranked, ($r) => $r.filter((i) => i.type === "Стройка"));
export const research = derived(ranked, ($r) => $r.filter((i) => i.type === "Исследования"));

// Действия — fire-and-forget, UI не блокируют
export function doApply(buffId, percent, giverNick) {
  buffs.update((arr) => {
    const idx = arr.findIndex((b) => b.id === buffId);
    if (idx === -1) return arr;
    const now = nowSec();
    const rem = Math.max(0, arr[idx].endAt - now);
    const updated = {
      ...arr[idx],
      endAt: Math.round(now + rem * (1 - percent / 100)),
      applied: (arr[idx].applied || 0) + percent,
      appliedCount: (arr[idx].appliedCount || 0) + 1,
      queueReceived: 1,
      queueLastAt: now,
    };
    const next = [...arr];
    next[idx] = updated;
    return next;
  });

  const now = nowSec();
  const histEntry = {
    id: "bh" + now + Math.random().toString(36).slice(2),
    recipient_id: buffId,
    recipient: "",
    type: "",
    giver: giverNick || "Не указан",
    percent,
    time: now,
  };

  let entry;
  buffs.update((arr) => {
    entry = arr.find((b) => b.id === buffId);
    return arr;
  });

  if (entry) {
    histEntry.recipient = entry.nick;
    histEntry.type = entry.type;
  }

  history.update((h) => [histEntry, ...h]);

  if (giverNick && giverNick !== "Не указан") {
    givers.update((g) => {
      if (!g[giverNick]) g[giverNick] = { total: 0, last_buff: 0 };
      g[giverNick] = { total: g[giverNick].total + 1, last_buff: now };
      return { ...g };
    });
  }

  let currentBuffs;
  buffs.subscribe((v) => (currentBuffs = v))();

  const body = { buffs: currentBuffs, historyEntry: histEntry };
  if (giverNick && giverNick !== "Не указан") {
    body.giverStat = { nick: giverNick, ts: now };
    body.nick = giverNick;
  }
  if (entry) body.nick2 = entry.nick;

  bgSave(body)
    .then((d) => {
      if (d.ok) {
        buffs.set(d.buffs || []);
        history.set(d.history || []);
        givers.set(d.givers || {});
        if (d.nicks) nickList.set(d.nicks);
      } else bgFail();
    })
    .catch(bgFail);
}

export function doDelete(buffId) {
  let filtered;
  buffs.update((arr) => {
    filtered = arr.filter((b) => b.id !== buffId);
    return filtered;
  });
  bgSave({ buffs: filtered })
    .then((d) => {
      if (d.ok) buffs.set(d.buffs || []);
      else bgFail();
    })
    .catch(bgFail);
}

export function doAdd(nick, type, days, hours, editId) {
  const now = nowSec();
  const endAt = now + (days * 1440 + hours * 60) * 60;

  if (editId) {
    buffs.update((arr) => {
      const idx = arr.findIndex((b) => b.id === editId);
      if (idx === -1) return arr;
      const updated = { ...arr[idx], nick, type, endAt, queueReceived: 0, queueLastAt: 0 };
      const next = [...arr];
      next[idx] = updated;
      return next;
    });
  } else {
    buffs.update((arr) => [
      {
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
      },
      ...arr,
    ]);
  }

  addNick(nick);

  let currentBuffs;
  buffs.subscribe((v) => (currentBuffs = v))();

  bgSave({ buffs: currentBuffs, nick })
    .then((d) => {
      if (d.ok) {
        buffs.set(d.buffs || []);
        if (d.nicks) nickList.set(d.nicks);
      } else bgFail();
    })
    .catch(bgFail);
}

export async function doLoad() {
  const cached = getFromLS();
  if (cached) {
    const cachedBuffs = (cached.buffs || []).filter(b => !isExpired(b));
    buffs.set(cachedBuffs);
    history.set(cached.history || []);
    givers.set(cached.givers || {});
    nickList.set(cached.nicks || []);
    template.set(cached.template || {});
  }

  const d = await loadState();
  if (d.ok) {
    const fresh = (d.buffs || []).filter(b => b.endAt > nowSec());
    buffs.set(fresh);
    if (fresh.length < (d.buffs || []).length) {
      bgSave({ buffs: fresh }).catch(() => {});
    }
    givers.set(d.givers || {});
    nickList.set(d.nicks || []);
    template.set(d.template || {});
    error.set("");
    saveToLS({
      buffs: fresh,
      givers: d.givers,
      nicks: d.nicks,
      template: d.template,
    });
  }
}

export async function doLoadHistory() {
  const d = await loadHistory();
  if (d.ok) {
    history.set(d.history || []);
    saveHistoryToLS(d.history);
  }
}

function saveHistoryToLS(h) {
  const cached = getFromLS() || {};
  cached.history = h;
  saveToLS(cached);
}

export function addNick(nick) {
  if (!nick) return;
  let current;
  nickList.subscribe((v) => (current = v))();
  if (!current.includes(nick)) {
    nickList.update((v) => (v.includes(nick) ? v : [...v, nick]));
    bgSave({ nick }).catch(() => {});
  }
}

export function nowSec() {
  return Math.floor(Date.now() / 1000);
}
