import type { Buff, EnrichedBuff } from "./types";

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function makeId(): string {
  return "b" + Date.now() + Math.random().toString(36).slice(2);
}

// --- Оценка приоритета ---

export function scoreBuff(e: Buff): Pick<EnrichedBuff, "left" | "saving" | "score"> {
  const left = Math.max(0, e.endAt - nowSec());
  const saving = Math.round(left * Number(e.buff || 0) / 100);
  const boost = e.type === "Стройка" ? 1.1 : 1.05;
  return { left, saving, score: Math.round(saving * boost) };
}

// --- Кому срочно нужен бафф ---

export function getQueueFireIds(items: Buff[]): Set<string> {
  const fireIds = new Set<string>();

  (["Стройка", "Исследования"] as const).forEach((type) => {
    const category = items.filter((item) => item.type === type);
    const pending = category.filter((item) => !item.queueReceived);
    const alreadyReceived = category.length - pending.length;

    if (alreadyReceived > 0 && pending.length > 0 && pending.length <= 2) {
      pending.forEach((item) => fireIds.add(item.id));
    }
  });

  return fireIds;
}

// --- Сортировка очереди ---

export function rankBuffsForQueue(source: Buff[]): EnrichedBuff[] {
  const enriched = source.map((item) => ({ ...item, ...scoreBuff(item) }));
  const fireIds = getQueueFireIds(enriched);

  return enriched
    .map((item) => ({ ...item, queueFire: fireIds.has(item.id) }))
    .sort(
      (a, b) =>
        Number(b.queueFire) - Number(a.queueFire) ||
        b.score - a.score ||
        b.left - a.left,
    );
}

// --- Сколько баффов 15% нужно до цели ---

export function calcNeeded(leftSec: number, targetSec: number): number {
  if (leftSec <= targetSec) return 0;
  return Math.ceil(Math.log(targetSec / leftSec) / Math.log(0.85));
}

// --- Формирование текста для чата ---

import type { BuffHistory, CopyTemplate } from "./types";

interface CopyParams {
  buffs: Buff[];
  template: CopyTemplate;
  history: BuffHistory[];
}

export function generateCopyText(params: CopyParams): string {
  const { buffs, template, history } = params;
  const ranked = rankBuffsForQueue(buffs);
  const dateStr = new Date().toLocaleDateString("ru-RU");

  function fmt(sec: number): string {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const parts: string[] = [];
    if (d > 0) parts.push(d + "д");
    if (h > 0 || d === 0) parts.push(h + "ч");
    return parts.join(" ");
  }

  function prepareList(type: "Стройка" | "Исследования", limit: number): EnrichedBuff[] {
    return ranked.filter((item) => item.type === type).slice(0, limit);
  }

  function renderLines(items: EnrichedBuff[]): string {
    return items
      .map((item) => {
        const left = Math.max(0, item.endAt - nowSec());
        const marker = item.queueFire ? "#256" : "•";
        return `${marker} ${item.nick} — ${fmt(left)}\n`;
      })
      .join("");
  }

  let text = (template.header_build || "").replace("{date}", dateStr);
  text += renderLines(prepareList("Стройка", template.limit_build || 15));

  text += (template.header_research || "").replace("{date}", dateStr);
  text += renderLines(prepareList("Исследования", template.limit_research || 15));

  if (template.include_5) {
    text += (template.header_5 || "").replace("{date}", dateStr);

    const usedIds = new Set<string>();
    ranked.filter((item) => item.type === "Стройка").slice(0, template.limit_build || 15).forEach((i) => usedIds.add(i.id));
    ranked.filter((item) => item.type === "Исследования").slice(0, template.limit_research || 15).forEach((i) => usedIds.add(i.id));

    const remaining = ranked.filter(
      (item) => item.type === "Стройка" && !usedIds.has(item.id),
    );

    if (remaining.length > 0) {
      const minApplied = Math.min(...remaining.map((item) => item.appliedCount || 0));
      const candidates = remaining.filter((item) => (item.appliedCount || 0) === minApplied);
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const left = Math.max(0, chosen.endAt - nowSec());
      const needed = calcNeeded(left, 7 * 86400);
      text += `1. ${chosen.nick} - ${fmt(left)} - ${(chosen.appliedCount || 0)}/${(chosen.appliedCount || 0) + needed} шт.\n`;
    } else {
      text += "(Нет доступных участников)\n";
    }
  }

  text += `\n#186 Спасибо за помощь!\n#199 Образец:\nНик | Процент | Тип\nVi007 10% Стройка`;

  return text;
}
