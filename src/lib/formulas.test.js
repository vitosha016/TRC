import { describe, it, expect } from 'vitest';
import {
  scoreBuff,
  getQueueFireIds,
  rankBuffsForQueue,
  calcNeeded,
  applyBuffMath,
  formatSeconds,
  formatTimeShort,
  generateCopyText,
} from './formulas.js';

// =========================================================
// ТЕСТОВЫЕ ДАННЫЕ (из таблицы)
// =========================================================

/**
 * Вспомогательная: парсим строку вида "27д 7ч 3м" в секунды
 */
function parseLeft(days, hours, minutes) {
  return days * 86400 + hours * 3600 + minutes * 60;
}

const MOCK_NOW = 1_700_000_000;

/**
 * ВСЕ 17 записей из предоставленной таблицы.
 * buff = 0 (как в таблице), queueReceived = (appliedCount > 0 ? 1 : 0)
 */
function makeFixture() {
  return [
    // ---- Стройка (9) ----
    { id: 'b1',  nick: 'Ваша честь', type: 'Стройка',      buff: 0, endAt: MOCK_NOW + parseLeft(18, 0, 41), createdAt: MOCK_NOW - 100000, applied: 0,  appliedCount: 0, queueReceived: 0, queueLastAt: 0 },
    { id: 'b2',  nick: 'Leaf',       type: 'Стройка',      buff: 0, endAt: MOCK_NOW + parseLeft(15, 4, 43), createdAt: MOCK_NOW - 100000, applied: 0,  appliedCount: 0, queueReceived: 0, queueLastAt: 0 },
    { id: 'b3',  nick: 'Ветеран',    type: 'Стройка',      buff: 0, endAt: MOCK_NOW + parseLeft(27, 7,  3), createdAt: MOCK_NOW - 100000, applied: 15, appliedCount: 1, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b4',  nick: 'Жони',       type: 'Стройка',      buff: 0, endAt: MOCK_NOW + parseLeft(25, 10, 57), createdAt: MOCK_NOW - 100000, applied: 30, appliedCount: 2, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b5',  nick: 'Т@нюша',     type: 'Стройка',      buff: 0, endAt: MOCK_NOW + parseLeft(22, 9,  14), createdAt: MOCK_NOW - 100000, applied: 30, appliedCount: 2, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b6',  nick: 'BORODA',     type: 'Стройка',      buff: 0, endAt: MOCK_NOW + parseLeft(21, 5,  42), createdAt: MOCK_NOW - 100000, applied: 15, appliedCount: 1, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b7',  nick: 'Vi007',      type: 'Стройка',      buff: 0, endAt: MOCK_NOW + parseLeft(12, 10, 52), createdAt: MOCK_NOW - 100000, applied: 15, appliedCount: 1, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b8',  nick: 'Sinnervzm',  type: 'Стройка',      buff: 0, endAt: MOCK_NOW + parseLeft(10, 19, 6),  createdAt: MOCK_NOW - 100000, applied: 40, appliedCount: 3, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b9',  nick: 'Полянк@',    type: 'Стройка',      buff: 0, endAt: MOCK_NOW + parseLeft(9,  10, 7),  createdAt: MOCK_NOW - 100000, applied: 25, appliedCount: 2, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },

    // ---- Исследования (8) ----
    { id: 'b10', nick: 'De Vito',    type: 'Исследования', buff: 0, endAt: MOCK_NOW + parseLeft(12, 7,  57), createdAt: MOCK_NOW - 100000, applied: 30, appliedCount: 2, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b11', nick: 'Jeka',       type: 'Исследования', buff: 0, endAt: MOCK_NOW + parseLeft(11, 21, 16), createdAt: MOCK_NOW - 100000, applied: 15, appliedCount: 1, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b12', nick: 'Leaf',       type: 'Исследования', buff: 0, endAt: MOCK_NOW + parseLeft(9,  21, 4),  createdAt: MOCK_NOW - 100000, applied: 40, appliedCount: 3, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b13', nick: 'Брюс Уэйн',  type: 'Исследования', buff: 0, endAt: MOCK_NOW + parseLeft(9,  13, 15), createdAt: MOCK_NOW - 100000, applied: 15, appliedCount: 1, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b14', nick: 'Mim',        type: 'Исследования', buff: 0, endAt: MOCK_NOW + parseLeft(9,  1,  22), createdAt: MOCK_NOW - 100000, applied: 15, appliedCount: 1, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b15', nick: 'самбоо5',    type: 'Исследования', buff: 0, endAt: MOCK_NOW + parseLeft(9,  1,  22), createdAt: MOCK_NOW - 100000, applied: 15, appliedCount: 1, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b16', nick: 'White_Snake',type: 'Исследования', buff: 0, endAt: MOCK_NOW + parseLeft(8,  3,  8),  createdAt: MOCK_NOW - 100000, applied: 15, appliedCount: 1, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
    { id: 'b17', nick: 'Peace_death',type: 'Исследования', buff: 0, endAt: MOCK_NOW + parseLeft(6,  19, 40), createdAt: MOCK_NOW - 100000, applied: 15, appliedCount: 1, queueReceived: 1, queueLastAt: MOCK_NOW - 10 },
  ];
}

// =========================================================
// scoreBuff
// =========================================================

describe('scoreBuff', () => {
  it('вычисляет left = endAt - currentTime (не ниже 0)', () => {
    const e = { endAt: MOCK_NOW + 1000, buff: 15, type: 'Стройка' };
    const { left } = scoreBuff(e, MOCK_NOW);
    expect(left).toBe(1000);
  });

  it('left не может быть отрицательным', () => {
    const e = { endAt: MOCK_NOW - 500, buff: 15, type: 'Стройка' };
    const { left } = scoreBuff(e, MOCK_NOW);
    expect(left).toBe(0);
  });

  it('saving = round(left * buff% / 100)', () => {
    const e = { endAt: MOCK_NOW + 100_000, buff: 15, type: 'Стройка' };
    const { saving } = scoreBuff(e, MOCK_NOW);
    expect(saving).toBe(15000); // 100_000 * 15 / 100 = 15_000
  });

  it('boost = 1.1 для Стройки', () => {
    const e = { endAt: MOCK_NOW + 100_000, buff: 15, type: 'Стройка' };
    const { score } = scoreBuff(e, MOCK_NOW);
    expect(score).toBe(Math.round(15000 * 1.1)); // 16500
  });

  it('boost = 1.05 для Исследований', () => {
    const e = { endAt: MOCK_NOW + 100_000, buff: 15, type: 'Исследования' };
    const { score } = scoreBuff(e, MOCK_NOW);
    expect(score).toBe(Math.round(15000 * 1.05)); // 15750
  });

  it('точные значения из таблицы: Ветеран (Стройка, buff=15)', () => {
    const left = parseLeft(27, 7, 3);
    const e = { endAt: MOCK_NOW + left, buff: 15, type: 'Стройка' };
    const { left: calcLeft, saving, score } = scoreBuff(e, MOCK_NOW);

    expect(calcLeft).toBe(left); // 2_358_180
    expect(saving).toBe(Math.round(left * 15 / 100)); // 353_727
    expect(score).toBe(Math.round(Math.round(left * 15 / 100) * 1.1)); // 389_100
  });

  it('точные значения из таблицы: De Vito (Исследования, buff=15)', () => {
    const left = parseLeft(12, 7, 57);
    const e = { endAt: MOCK_NOW + left, buff: 15, type: 'Исследования' };
    const { left: calcLeft, saving, score } = scoreBuff(e, MOCK_NOW);

    expect(calcLeft).toBe(left); // 1_065_420
    expect(saving).toBe(Math.round(left * 15 / 100)); // 159_813
    expect(score).toBe(Math.round(Math.round(left * 15 / 100) * 1.05)); // 167_804
  });

  it('buff=0 даёт saving=0 и score=0', () => {
    const e = { endAt: MOCK_NOW + 999_999, buff: 0, type: 'Стройка' };
    const { saving, score } = scoreBuff(e, MOCK_NOW);
    expect(saving).toBe(0);
    expect(score).toBe(0);
  });
});

// =========================================================
// getQueueFireIds
// =========================================================

describe('getQueueFireIds', () => {
  it('🔥 для категории с 1-2 неполучившими при наличии получивших', () => {
    const items = [
      { id: 'a', type: 'Стройка', queueReceived: 0 },
      { id: 'b', type: 'Стройка', queueReceived: 0 },
      { id: 'c', type: 'Стройка', queueReceived: 1 },
    ];
    const fires = getQueueFireIds(items);
    expect(fires.has('a')).toBe(true);
    expect(fires.has('b')).toBe(true);
    expect(fires.has('c')).toBe(false);
  });

  it('НЕ горит если нет получивших', () => {
    const items = [
      { id: 'a', type: 'Стройка', queueReceived: 0 },
      { id: 'b', type: 'Стройка', queueReceived: 0 },
    ];
    const fires = getQueueFireIds(items);
    expect(fires.size).toBe(0);
  });

  it('НЕ горит если неполучивших > 2', () => {
    const items = [
      { id: 'a', type: 'Стройка', queueReceived: 0 },
      { id: 'b', type: 'Стройка', queueReceived: 0 },
      { id: 'c', type: 'Стройка', queueReceived: 0 },
      { id: 'd', type: 'Стройка', queueReceived: 1 },
    ];
    const fires = getQueueFireIds(items);
    expect(fires.size).toBe(0);
  });

  it('🔥 на данных из таблицы: Стройка — Ваша честь и Leaf горят', () => {
    const all = makeFixture();
    const fires = getQueueFireIds(all);

    const fireNicks = all
      .filter(i => fires.has(i.id) && i.type === 'Стройка')
      .map(i => i.nick);

    expect(fireNicks).toEqual(['Ваша честь', 'Leaf']);
  });

  it('Исследования — никто не горит (все уже получили)', () => {
    const all = makeFixture();
    const fires = getQueueFireIds(all);

    const researchFires = all
      .filter(i => i.type === 'Исследования' && fires.has(i.id));

    expect(researchFires).toHaveLength(0);
  });
});

// =========================================================
// rankBuffsForQueue
// =========================================================

describe('rankBuffsForQueue', () => {
  it('сортировка: 🔥 → score DESC → left DESC', () => {
    const all = makeFixture().map(b => ({ ...b, buff: 15 })); // для ненулевых score
    const ranked = rankBuffsForQueue(all, MOCK_NOW);

    for (let i = 1; i < ranked.length; i++) {
      const prev = ranked[i - 1];
      const curr = ranked[i];

      if (prev.queueFire && !curr.queueFire) continue; // fire выше — ок
      if (prev.queueFire === curr.queueFire) {
        if (prev.score > curr.score) continue; // выше score — ок
        if (prev.score === curr.score) {
          expect(prev.left).toBeGreaterThanOrEqual(curr.left);
        } else {
          // score разный при равном fire — должен быть prev.score > curr.score
          // Этот блок не должен выполняться при правильной сортировке
          expect(prev.score).toBeGreaterThan(curr.score);
        }
      }
    }
  });

  it('порядок из таблицы совпадает (buff=0)', () => {
    const all = makeFixture(); // buff=0 → все score=0
    const ranked = rankBuffsForQueue(all, MOCK_NOW);

    const стройка = ranked.filter(i => i.type === 'Стройка');
    const исслед  = ranked.filter(i => i.type === 'Исследования');

    // Стройка: порядок по таблице
    expect(стройка.map(i => i.nick)).toEqual([
      'Ваша честь',  // 🔥, left=1_557_660
      'Leaf',        // 🔥, left=1_312_980
      'Ветеран',     // left=2_358_180
      'Жони',        // 2_199_420
      'Т@нюша',      // 1_934_040
      'BORODA',      // 1_834_920
      'Vi007',       // 1_075_920
      'Sinnervzm',   // 932_760
      'Полянк@',     // 814_020
    ]);

    // Исследования: все без 🔥, по left DESC
    expect(исслед.map(i => i.nick)).toEqual([
      'De Vito',     // 1_065_420
      'Jeka',        // 1_026_960
      'Leaf',        // 853_440
      'Брюс Уэйн',   // 825_300
      'Mim',         // 782_520
      'самбоо5',     // 782_520 (равный left, порядок вставки)
      'White_Snake', // 702_480
      'Peace_death', // 589_200
    ]);
  });

  it('порядок с buff=15: сортировка по score, не по left', () => {
    const all = makeFixture().map(b => ({ ...b, buff: 15 }));
    const ranked = rankBuffsForQueue(all, MOCK_NOW);

    const стройка = ranked.filter(i => i.type === 'Стройка');

    // С 🔥 первыми, затем по score DESC
    expect(стройка.map(i => i.nick)).toEqual([
      'Ваша честь',  // 🔥 score=257_014
      'Leaf',        // 🔥 score=216_642
      'Ветеран',     // score=389_100 ← выше из-за score, хотя раньше был после fire
      'Жони',        // score=362_904
      'Т@нюша',      // score=319_117
      'BORODA',      // score=302_762
      'Vi007',       // score=177_527
      'Sinnervzm',   // score=153_905
      'Полянк@',     // score=134_313
    ]);

    const исслед = ranked.filter(i => i.type === 'Исследования');
    expect(исслед.map(i => i.nick)).toEqual([
      'De Vito',     // score=167_804
      'Jeka',        // score=161_746
      'Leaf',        // score=134_417
      'Брюс Уэйн',   // score=129_985
      'Mim',         // score=123_247
      'самбоо5',     // score=123_247 (равный)
      'White_Snake', // score=110_641
      'Peace_death', // score=92_799
    ]);
  });

  it('каждая запись обогащена полями left, saving, score, queueFire', () => {
    const all = makeFixture();
    const ranked = rankBuffsForQueue(all, MOCK_NOW);

    for (const item of ranked) {
      expect(item).toHaveProperty('left');
      expect(item).toHaveProperty('saving');
      expect(item).toHaveProperty('score');
      expect(item).toHaveProperty('queueFire');
      expect(typeof item.queueFire).toBe('boolean');
      expect(item.left).toBeGreaterThanOrEqual(0);
    }
  });
});

// =========================================================
// calcNeeded
// =========================================================

describe('calcNeeded', () => {
  it('0 баффов если left <= target', () => {
    expect(calcNeeded(100, 200)).toBe(0);
    expect(calcNeeded(100, 100)).toBe(0);
  });

  it('1 бафф сокращает время на 15% (×0.85)', () => {
    // left=100, target=85 → после одного баффа: 100 * 0.85 = 85 ✓
    expect(calcNeeded(100, 85)).toBe(1);
  });

  it('2 баффа (target=73) / 3 баффа (target=72)', () => {
    // 100×0.85=85, 85×0.85=72.25. target=73 → 2 буста достаточно
    expect(calcNeeded(100, 73)).toBe(2);
    // target=72 → после 2 бустов 72.25>72, нужно 3: 72.25×0.85=61.41≤72
    expect(calcNeeded(100, 72)).toBe(3);
  });

  it('7 дней → 1 день: ceil(log(1/7) / log(0.85)) = 12', () => {
    const needed = calcNeeded(7 * 86400, 1 * 86400);
    // log(1/7)/log(0.85) = log(0.1428)/log(0.85) = -1.9459/-0.1625 = 11.975 → ceil = 12
    expect(needed).toBe(12);
  });

  it('30 дней → 1 день: около 21 баффа', () => {
    const needed = calcNeeded(30 * 86400, 1 * 86400);
    // log(1/30)/log(0.85) = (-3.401)/(-0.1625) = 20.93 → ceil = 21
    expect(needed).toBe(21);
  });

  it('30д → 7д: ceil(log(7/30)/log(0.85)) = 9', () => {
    const needed = calcNeeded(30 * 86400, 7 * 86400);
    // log(7/30)/log(0.85) = (-1.455)/(-0.1625) = 8.95 → ceil = 9
    expect(needed).toBe(9);
  });
});

// =========================================================
// applyBuffMath
// =========================================================

describe('applyBuffMath', () => {
  it('15% бафф сокращает оставшееся время на 15%', () => {
    const entry = {
      endAt: MOCK_NOW + 10000,
      applied: 0,
      appliedCount: 0,
    };
    const result = applyBuffMath(entry, 15, MOCK_NOW);
    // remaining = 10000, newEndAt = MOCK_NOW + 10000 * 0.85 = MOCK_NOW + 8500
    expect(result.endAt).toBe(MOCK_NOW + 8500);
    expect(result.applied).toBe(15);
    expect(result.appliedCount).toBe(1);
    expect(result.queueReceived).toBe(1);
    expect(result.queueLastAt).toBe(MOCK_NOW);
  });

  it('10% бафф сокращает время на 10%', () => {
    const entry = {
      endAt: MOCK_NOW + 10000,
      applied: 0,
      appliedCount: 0,
    };
    const result = applyBuffMath(entry, 10, MOCK_NOW);
    expect(result.endAt).toBe(MOCK_NOW + 9000);
    expect(result.applied).toBe(10);
  });

  it('суммирует applied и appliedCount', () => {
    const entry = {
      endAt: MOCK_NOW + 10000,
      applied: 30,
      appliedCount: 2,
    };
    const result = applyBuffMath(entry, 15, MOCK_NOW);
    expect(result.applied).toBe(45);
    expect(result.appliedCount).toBe(3);
  });

  it('если endAt уже прошёл — left=0, endAt не меняется', () => {
    const entry = {
      endAt: MOCK_NOW - 1000,
      applied: 0,
      appliedCount: 0,
    };
    const result = applyBuffMath(entry, 15, MOCK_NOW);
    expect(result.endAt).toBe(MOCK_NOW);
    expect(result.applied).toBe(15);
    expect(result.appliedCount).toBe(1);
  });

  it('реальный пример: Ветеран → 15% бафф', () => {
    const entry = {
      endAt: MOCK_NOW + parseLeft(27, 7, 3),
      applied: 15,
      appliedCount: 1,
    };
    const result = applyBuffMath(entry, 15, MOCK_NOW);
    // remaining = 2_358_180
    // newEndAt = MOCK_NOW + 2_358_180 * 0.85 = MOCK_NOW + 2_004_453
    expect(result.endAt).toBe(MOCK_NOW + Math.round(2_358_180 * 0.85));
    expect(result.applied).toBe(30);
    expect(result.appliedCount).toBe(2);
  });
});

// =========================================================
// formatSeconds / formatTimeShort
// =========================================================

describe('formatSeconds', () => {
  it('форматирует дни, часы, минуты, секунды', () => {
    expect(formatSeconds(0)).toBe('0с');
    expect(formatSeconds(5)).toBe('5с');
    expect(formatSeconds(65)).toBe('1м 5с');
    // секунды только если нет часов и дней (!d && !h)
    expect(formatSeconds(3665)).toBe('1ч 1м');
    expect(formatSeconds(90065)).toBe('1д 1ч 1м');
  });

  it('секунды показываются только при отсутствии дней и часов', () => {
    expect(formatSeconds(3600)).toBe('1ч');
    expect(formatSeconds(60)).toBe('1м 0с');
    expect(formatSeconds(3661)).toBe('1ч 1м');
  });
});

describe('formatTimeShort', () => {
  it('форматирует только дни и часы (сек скрыты когда есть дни)', () => {
    expect(formatTimeShort(0)).toBe('0ч');
    expect(formatTimeShort(3600)).toBe('1ч');
    expect(formatTimeShort(90000)).toBe('1д 1ч');
    expect(formatTimeShort(172800)).toBe('2д');
  });
});

// =========================================================
// generateCopyText
// =========================================================

describe('generateCopyText', () => {
  const defaultTemplate = {
    header_build: '#184 Стройка | {date}\r\n',
    limit_build: 15,
    header_research: '\r\n#173 Исследование\r\n',
    limit_research: 15,
    include_5: 0,
    header_5: '#186 Для ускорений стройки отдаём баффы 5%\r\n',
  };

  it('генерирует текст с заголовками и списком игроков', () => {
    const all = makeFixture().map(b => ({ ...b, buff: 15 }));
    const text = generateCopyText({
      buffs: all,
      template: defaultTemplate,
      currentTime: MOCK_NOW,
    });

    expect(text).toContain('#184 Стройка');
    expect(text).toContain('#173 Исследование');
    expect(text).toContain('Ваша честь');
    expect(text).toContain('De Vito');
    expect(text).toContain('#186 Спасибо за помощь!');
    expect(text).toContain('#199 Образец');
  });

  it('🔥-игроки помечены #256', () => {
    const all = makeFixture().map(b => ({ ...b, buff: 15 }));
    const text = generateCopyText({
      buffs: all,
      template: defaultTemplate,
      currentTime: MOCK_NOW,
    });

    expect(text).toContain('#256 Ваша честь');
    expect(text).toContain('#256 Leaf');
  });

  it('include_5 = 1: добавляет блок 5% для оставшихся', () => {
    const all = makeFixture().map(b => ({ ...b, buff: 15 }));
    const tpl = { ...defaultTemplate, include_5: 1 };
    const text = generateCopyText({
      buffs: all,
      template: tpl,
      currentTime: MOCK_NOW,
    });

    expect(text).toContain('#186 Для ускорений стройки');
    // Оставшиеся стройки после лимита (все помещаются в limit 15, так что remaining = 0)
    // Но include_5 проверяет remaining после отсечения лимитов
    // limit_build=15, а стройки всего 9 → все помещаются, remaining=0
    expect(text).toContain('(Нет доступных участников)');
  });

  it('соблюдает лимит записей (limit_build=3)', () => {
    const all = makeFixture().map(b => ({ ...b, buff: 15 }));
    const tpl = { ...defaultTemplate, limit_build: 3 };
    const text = generateCopyText({
      buffs: all,
      template: tpl,
      currentTime: MOCK_NOW,
    });

    // Должны быть только первые 3 из Стройки (после сортировки)
    const стройка = rankBuffsForQueue(all, MOCK_NOW).filter(i => i.type === 'Стройка');
    expect(text).toContain(стройка[0].nick);
    expect(text).toContain(стройка[2].nick);
    expect(text).not.toContain(стройка[3].nick); // 4-й не попал
  });
});
