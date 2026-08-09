import { writable, derived } from "svelte/store";
import { loadAll, bgSave, onSync } from "./api.js";
import { scoreBuff, getQueueFireIds, makeId } from "./formulas.js";

export const buffs = writable([]);
export const history = writable([]);
export const givers = writable({});
export const nickList = writable([]);
export const template = writable({});
export const syncing = writable(0);

onSync((v) => syncing.set(v));

// Деривативы
export const ranked = derived(buffs, ($buffs) => {
  const ns = nowSec();
  const enr = $buffs.map((b) => ({ ...b, ...scoreBuff(b, ns) }));
  const fireIds = getQueueFireIds(enr);
  return enr
    .map((b) => ({ ...b, queueFire: fireIds.has(b.id) }))
    .sort((a, b) => (b.queueFire | 0) - (a.queueFire | 0) || b.score - a.score || b.left - a.left);
});

export const build = derived(ranked, ($r) => $r.filter((i) => i.type === "Стройка"));
export const research = derived(ranked, ($r) => $r.filter((i) => i.type === "Исследования"));

// Действия
export async function doApply(buffId, percent, giverNick) {
  buffs.update((arr) => {
    const entry = arr.find((b) => b.id === buffId);
    if (!entry) return arr;
    const now = nowSec();
    const rem = Math.max(0, entry.endAt - now);
    entry.endAt = Math.round(now + rem * (1 - percent / 100));
    entry.applied = (entry.applied || 0) + percent;
    entry.appliedCount = (entry.appliedCount || 0) + 1;
    entry.queueReceived = 1;
    entry.queueLastAt = now;
    return arr;
  });

  const now = nowSec();
  const histEntry = {
    id: "bh" + now + Math.random().toString(36).slice(2),
    recipient_id: buffId,
    recipient: "", // will be filled from store
    type: "",
    giver: giverNick || "Не указан",
    percent,
    time: now,
  };

  // Заполняем из текущего состояния
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
  history.subscribe((v) => (_currentHistory = v))();
  givers.subscribe((v) => (_currentGivers = v))();
  nickList.subscribe((v) => (_currentNicks = v))();

  const body = { buffs: currentBuffs, historyEntry: histEntry };
  if (giverNick && giverNick !== "Не указан") {
    body.giverStat = { nick: giverNick, ts: now };
    body.nick = giverNick;
  }
  if (entry) body.nick2 = entry.nick;

  try {
    const d = await bgSave(body);
    if (d.ok) {
      buffs.set(d.buffs || []);
      history.set(d.history || []);
      givers.set(d.givers || {});
      if (d.nicks) nickList.set(d.nicks);
    } else {
      await doLoad();
    }
  } catch {
    await doLoad();
  }
}

export async function doDelete(buffId) {
  let filtered;
  buffs.update((arr) => {
    filtered = arr.filter((b) => b.id !== buffId);
    return filtered;
  });
  try {
    const d = await bgSave({ buffs: filtered });
    if (d.ok) buffs.set(d.buffs || []);
    else await doLoad();
  } catch {
    await doLoad();
  }
}

export async function doAdd(nick, type, days, hours, editId) {
  const now = nowSec();
  const endAt = now + (days * 1440 + hours * 60) * 60;

  if (editId) {
    buffs.update((arr) => {
      const entry = arr.find((b) => b.id === editId);
      if (entry) {
        entry.nick = nick;
        entry.type = type;
        entry.buff = 15;
        entry.endAt = endAt;
        entry.queueReceived = 0;
        entry.queueLastAt = 0;
      }
      return arr;
    });
  } else {
    buffs.update((arr) => {
      arr.unshift({
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
      });
      return arr;
    });
  }

  addNick(nick);

  let currentBuffs;
  buffs.subscribe((v) => (currentBuffs = v))();

  try {
    const d = await bgSave({ buffs: currentBuffs, nick });
    if (d.ok) {
      buffs.set(d.buffs || []);
      if (d.nicks) nickList.set(d.nicks);
    } else {
      await doLoad();
    }
  } catch {
    await doLoad();
  }
}

export async function doLoad() {
  const d = await loadAll();
  if (d.ok) {
    buffs.set(d.buffs || []);
    history.set(d.history || []);
    givers.set(d.givers || {});
    nickList.set(d.nicks || []);
    template.set(d.template || {});
  }
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
