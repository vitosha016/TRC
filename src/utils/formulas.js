// Чистые формулы без сайд-эффектов
// Используются на фронте; бекенд только хранит данные

/**
 * Текущее unix-время в секундах
 */
export function nowSec() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Генерация уникального id для buff-записи
 */
export function makeId() {
  return "b" + Date.now() + Math.random().toString(36).slice(2);
}

/**
 * rankBuffsForQueue — обогащение и сортировка очереди
 * 1. Приоритетные (📌) — выше
 * 2. По времени добавления (createdAt ASC)
 * @param {Array} items — сырой массив buff-объектов
 * @param {number} currentTime
 * @returns {Array} обогащённый и отсортированный массив
 */
export function rankBuffsForQueue(items, currentTime) {
  return items
    .map((item) => {
      const left = Math.max(0, item.endAt - currentTime);
      const saving = Math.round((left * (item.applied || 0)) / 100);
      return { ...item, left, saving };
    })
    .sort((a, b) => {
      const priorityDiff = (b.priority ? 1 : 0) - (a.priority ? 1 : 0);
      if (priorityDiff !== 0) return priorityDiff;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
}

/**
 * calcNeeded — сколько баффов 15% нужно чтобы сократить leftSec до targetSec
 * Каждый бафф 15% умножает оставшееся время на 0.85
 * @param {number} leftSec
 * @param {number} targetSec
 * @returns {number}
 */
export function calcNeeded(leftSec, targetSec) {
  if (leftSec <= targetSec) return 0;
  return Math.ceil(Math.log(targetSec / leftSec) / Math.log(0.85));
}

/**
 * applyBuffMath — вычисляет новое состояние после применения баффа
 * Новое endAt = now + remaining * (1 - percent/100)
 * @param {{ endAt: number, applied: number, appliedCount: number }} entry
 * @param {number} percent — процент применяемого баффа
 * @param {number} currentTime
 * @returns {{ endAt: number, applied: number, appliedCount: number, queueReceived: 1, queueLastAt: number }}
 */
export function applyBuffMath(entry, percent, currentTime) {
  const remaining = Math.max(0, entry.endAt - currentTime);
  const newEndAt = currentTime + remaining * (1 - percent / 100);
  return {
    ...entry,
    endAt: Math.round(newEndAt),
    applied: (entry.applied || 0) + percent,
    appliedCount: (entry.appliedCount || 0) + 1,
    queueReceived: 1,
    queueLastAt: currentTime,
  };
}

/**
 * Форматирование секунд в читаемый вид
 */
export function formatSeconds(total) {
  total = Math.max(0, Math.round(total));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = [];
  if (d) p.push(d + "д");
  if (h) p.push(h + "ч");
  if (m) p.push(m + "м");
  if (!d && !h) p.push(s + "с");
  return p.join(" ") || "0с";
}

/**
 * Форматирование для чата (д + ч)
 */
export function formatTimeShort(sec) {
  sec = Math.max(0, Math.round(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const parts = [];
  if (d > 0) parts.push(d + "д");
  if (h > 0 || d === 0) parts.push(h + "ч");
  return parts.join(" ");
}

/**
 * Генерация текста для копирования в чат
 */
export function generateCopyText({ buffs, template, currentTime }) {
  const ranked = rankBuffsForQueue(buffs, currentTime);
  const dateStr = new Date(currentTime * 1000).toLocaleDateString("ru-RU");

  function fmt(sec) {
    return formatTimeShort(sec);
  }

  function prepareList(type, limit) {
    return ranked.filter((item) => item.type === type).slice(0, limit);
  }

  function renderLines(items) {
    return items.map((item) => "\u2022 " + item.nick + " \u2014 " + fmt(item.left) + "\n").join("");
  }

  let text = (template.header_build || "").replace("{date}", dateStr);
  text += renderLines(prepareList("Стройка", template.limit_build || 15));

  text += (template.header_research || "").replace("{date}", dateStr);
  text += renderLines(prepareList("Исследования", template.limit_research || 15));

  if (template.include_5) {
    text += (template.header_5 || "").replace("{date}", dateStr);

    const usedIds = new Set();
    ranked
      .filter((item) => item.type === "Стройка")
      .slice(0, template.limit_build || 15)
      .forEach((i) => usedIds.add(i.id));
    ranked
      .filter((item) => item.type === "Исследования")
      .slice(0, template.limit_research || 15)
      .forEach((i) => usedIds.add(i.id));

    const remaining = ranked.filter((item) => item.type === "Стройка" && !usedIds.has(item.id));

    if (remaining.length > 0) {
      const minApplied = Math.min(...remaining.map((item) => item.appliedCount || 0));
      const candidates = remaining.filter((item) => (item.appliedCount || 0) === minApplied);
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const needed = calcNeeded(chosen.left, 7 * 86400);
      text +=
        "1. " +
        chosen.nick +
        " - " +
        fmt(chosen.left) +
        " - " +
        (chosen.appliedCount || 0) +
        "/" +
        ((chosen.appliedCount || 0) + needed) +
        " шт.\n";
    } else {
      text += "(Нет доступных участников)\n";
    }
  }

  text += "\n#186 Спасибо за помощь!\n#199 Образец:\nНик | Процент | Тип\nVi007 10% Стройка";

  return text;
}
