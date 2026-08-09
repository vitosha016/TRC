import { Hono } from "hono";
import { getBuffs, setBuffs, getTemplate, setTemplate, addNick } from "../lib/db";
import { nowSec, makeId } from "../lib/formulas";

export const adminRoutes = new Hono();

// POST /api/admin/buff — добавить/обновить
adminRoutes.post("/buff", async (c) => {
  try {
    const body: {
      buff_id?: string;
      nick: string;
      type: "Стройка" | "Исследования";
      buff?: number;
      days: number;
      hours: number;
      minutes: number;
    } = await c.req.json();

    const buffsArr = getBuffs();
    const now = nowSec();
    const totalMinutes =
      (Number(body.days) || 0) * 1440 +
      (Number(body.hours) || 0) * 60 +
      (Number(body.minutes) || 0);
    const endAt = now + totalMinutes * 60;

    if (body.buff_id) {
      const idx = buffsArr.findIndex((b) => b.id === body.buff_id);
      if (idx !== -1) {
        buffsArr[idx] = {
          ...buffsArr[idx],
          nick: body.nick,
          type: body.type,
          buff: body.buff ?? 15,
          endAt,
          queueReceived: 0,
          queueLastAt: 0,
        };
      }
    } else {
      buffsArr.unshift({
        id: makeId(),
        nick: body.nick,
        type: body.type,
        buff: body.buff ?? 15,
        endAt,
        createdAt: now,
        applied: 0,
        appliedCount: 0,
        queueReceived: 0,
        queueLastAt: 0,
      });
    }

    setBuffs(buffsArr);
    addNick(body.nick);
    return c.json({ ok: true, buffs: buffsArr });
  } catch {
    return c.json({ ok: false, error: "Неверный формат данных" }, 400);
  }
});

// DELETE /api/admin/buff/:id
adminRoutes.delete("/buff/:id", (c) => {
  const id = c.req.param("id");
  const before = getBuffs();
  const filtered = before.filter((b) => b.id !== id);

  if (filtered.length === before.length) {
    return c.json({ ok: false, error: "Участник не найден" }, 404);
  }

  setBuffs(filtered);
  return c.json({ ok: true, buffs: filtered });
});

// GET /api/admin/template
adminRoutes.get("/template", (c) => {
  return c.json({ ok: true, template: getTemplate() });
});

// POST /api/admin/template
adminRoutes.post("/template", async (c) => {
  const body = await c.req.json();
  const t = setTemplate(body);
  return c.json({ ok: true, template: t });
});
