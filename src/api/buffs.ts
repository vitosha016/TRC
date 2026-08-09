import { Hono } from "hono";
import { getBuffs, getHistory, addHistory, addGiverStat, addNick, getTemplate, getGivers, getNicks } from "../lib/db";
import { nowSec, generateCopyText } from "../lib/formulas";

export const buffsRoutes = new Hono();

buffsRoutes.get("/", (c) => {
  return c.json({ ok: true, buffs: getBuffs(), history: getHistory() });
});

buffsRoutes.get("/givers", (c) => {
  return c.json({ ok: true, givers: getGivers() });
});

buffsRoutes.get("/nicks", (c) => {
  return c.json({ ok: true, nicks: getNicks() });
});

buffsRoutes.post("/nicks", async (c) => {
  const body = await c.req.json<{ nick: string }>();
  addNick(body.nick);
  return c.json({ ok: true, nicks: getNicks() });
});

buffsRoutes.post("/apply", async (c) => {
  try {
    const body = await c.req.json<{ id: string; percent: number; giver?: string }>();
    const { id, percent, giver } = body;

    if (!id || !percent) {
      return c.json({ ok: false, error: "id и percent обязательны" }, 400);
    }

    const buffsArr = getBuffs();
    const entry = buffsArr.find((b) => b.id === id);

    if (!entry) {
      return c.json({ ok: false, error: "Участник не найден" }, 404);
    }

    if (percent <= 0 || entry.applied + percent > 210) {
      return c.json({ ok: false, error: "Недопустимый процент" }, 400);
    }

    const now = nowSec();
    const remaining = Math.max(0, entry.endAt - now);
    entry.endAt = now + remaining * (1 - percent / 100);
    entry.applied = (entry.applied || 0) + percent;
    entry.appliedCount = (entry.appliedCount || 0) + 1;
    entry.queueReceived = 1;
    entry.queueLastAt = now;

    const donor = (giver || "").trim() || "Не указан";

    addHistory({
      id: "bh" + now + Math.random().toString(36).slice(2),
      recipient_id: entry.id,
      recipient: entry.nick,
      type: entry.type,
      giver: donor,
      percent,
      time: now,
    });

    if (donor !== "Не указан") {
      addGiverStat(donor, now);
      addNick(donor);
    }
    addNick(entry.nick);

    return c.json({ ok: true, buffs: buffsArr, history: getHistory(), givers: getGivers() });
  } catch {
    return c.json({ ok: false, error: "Ошибка при применении баффа" }, 500);
  }
});

buffsRoutes.get("/copy", (c) => {
  const text = generateCopyText({
    buffs: getBuffs(),
    template: getTemplate(),
    history: getHistory(),
  });
  return c.json({ ok: true, text });
});
