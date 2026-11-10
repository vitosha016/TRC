import { describe, it, expect } from "vitest";
import {
  rankBuffsForQueue,
  calcNeeded,
  applyBuffMath,
  formatSeconds,
  formatTimeShort,
  generateCopyText,
} from "./formulas.js";

const MOCK_NOW = 1_700_000_000;

function parseLeft(days, hours, minutes) {
  return days * 86400 + hours * 3600 + minutes * 60;
}

function makeFixture() {
  return [
    {
      id: "b1",
      nick: "Ваша честь",
      type: "Стройка",
      buff: 0,
      endAt: MOCK_NOW + parseLeft(18, 0, 41),
      createdAt: 1,
      applied: 0,
      appliedCount: 0,
      priority: 0,
    },
    {
      id: "b2",
      nick: "Leaf",
      type: "Стройка",
      buff: 0,
      endAt: MOCK_NOW + parseLeft(15, 4, 43),
      createdAt: 2,
      applied: 0,
      appliedCount: 0,
      priority: 0,
    },
    {
      id: "b3",
      nick: "Ветеран",
      type: "Стройка",
      buff: 0,
      endAt: MOCK_NOW + parseLeft(27, 7, 3),
      createdAt: 3,
      applied: 15,
      appliedCount: 1,
      priority: 0,
    },
    {
      id: "b4",
      nick: "Жони",
      type: "Стройка",
      buff: 0,
      endAt: MOCK_NOW + parseLeft(25, 10, 57),
      createdAt: 4,
      applied: 30,
      appliedCount: 2,
      priority: 1,
    },
    {
      id: "b5",
      nick: "De Vito",
      type: "Исследования",
      buff: 0,
      endAt: MOCK_NOW + parseLeft(12, 7, 57),
      createdAt: 5,
      applied: 30,
      appliedCount: 2,
      priority: 0,
    },
    {
      id: "b6",
      nick: "Jeka",
      type: "Исследования",
      buff: 0,
      endAt: MOCK_NOW + parseLeft(11, 21, 16),
      createdAt: 6,
      applied: 15,
      appliedCount: 1,
      priority: 0,
    },
    {
      id: "b7",
      nick: "Tiger",
      type: "Исследования",
      buff: 0,
      endAt: MOCK_NOW + parseLeft(9, 21, 4),
      createdAt: 7,
      applied: 40,
      appliedCount: 3,
      priority: 0,
    },
    {
      id: "b8",
      nick: "Брюс Уэйн",
      type: "Исследования",
      buff: 0,
      endAt: MOCK_NOW + parseLeft(9, 13, 15),
      createdAt: 8,
      applied: 15,
      appliedCount: 1,
      priority: 0,
    },
  ];
}

describe("rankBuffsForQueue", () => {
  it("сортирует по времени добавления", () => {
    const items = makeFixture().filter((i) => i.type === "Стройка" && !i.priority);
    const ranked = rankBuffsForQueue(items, MOCK_NOW);

    expect(ranked.map((i) => i.nick)).toEqual(["Ваша честь", "Leaf", "Ветеран"]);
  });

  it("приоритетные выше, внутри группы — по времени добавления", () => {
    const ranked = rankBuffsForQueue(makeFixture(), MOCK_NOW);
    const build = ranked.filter((i) => i.type === "Стройка");

    expect(build.map((i) => i.nick)).toEqual(["Жони", "Ваша честь", "Leaf", "Ветеран"]);
  });

  it("обогащает записи left и saving", () => {
    const items = [{ ...makeFixture()[0], endAt: MOCK_NOW + 100_000, applied: 15 }];
    const [item] = rankBuffsForQueue(items, MOCK_NOW);

    expect(item.left).toBe(100_000);
    expect(item.saving).toBe(15_000);
  });

  it("left не может быть отрицательным", () => {
    const items = [{ ...makeFixture()[0], endAt: MOCK_NOW - 500 }];
    const [item] = rankBuffsForQueue(items, MOCK_NOW);

    expect(item.left).toBe(0);
    expect(item.saving).toBe(0);
  });
});

describe("calcNeeded", () => {
  it("0 баффов если left <= target", () => {
    expect(calcNeeded(100, 200)).toBe(0);
    expect(calcNeeded(100, 100)).toBe(0);
  });

  it("1 бафф сокращает время на 15% (×0.85)", () => {
    expect(calcNeeded(100, 85)).toBe(1);
  });

  it("2 баффа (target=73) / 3 баффа (target=72)", () => {
    expect(calcNeeded(100, 73)).toBe(2);
    expect(calcNeeded(100, 72)).toBe(3);
  });

  it("7 дней → 1 день: ceil(log(1/7) / log(0.85)) = 12", () => {
    expect(calcNeeded(7 * 86400, 1 * 86400)).toBe(12);
  });

  it("30 дней → 1 день: около 21 баффа", () => {
    expect(calcNeeded(30 * 86400, 1 * 86400)).toBe(21);
  });

  it("30д → 7д: ceil(log(7/30)/log(0.85)) = 9", () => {
    expect(calcNeeded(30 * 86400, 7 * 86400)).toBe(9);
  });
});

describe("applyBuffMath", () => {
  it("15% бафф сокращает оставшееся время на 15%", () => {
    const entry = {
      endAt: MOCK_NOW + 10000,
      applied: 0,
      appliedCount: 0,
    };
    const result = applyBuffMath(entry, 15, MOCK_NOW);
    expect(result.endAt).toBe(MOCK_NOW + 8500);
    expect(result.applied).toBe(15);
    expect(result.appliedCount).toBe(1);
    expect(result.queueReceived).toBe(1);
    expect(result.queueLastAt).toBe(MOCK_NOW);
  });

  it("10% бафф сокращает время на 10%", () => {
    const entry = {
      endAt: MOCK_NOW + 10000,
      applied: 0,
      appliedCount: 0,
    };
    const result = applyBuffMath(entry, 10, MOCK_NOW);
    expect(result.endAt).toBe(MOCK_NOW + 9000);
    expect(result.applied).toBe(10);
  });

  it("суммирует applied и appliedCount", () => {
    const entry = {
      endAt: MOCK_NOW + 10000,
      applied: 30,
      appliedCount: 2,
    };
    const result = applyBuffMath(entry, 15, MOCK_NOW);
    expect(result.applied).toBe(45);
    expect(result.appliedCount).toBe(3);
  });

  it("если endAt уже прошёл — left=0, endAt не меняется", () => {
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

  it("сохраняет остальные поля записи", () => {
    const entry = {
      id: "b1",
      nick: "Ветеран",
      type: "Стройка",
      priority: 1,
      endAt: MOCK_NOW + 10000,
      applied: 15,
      appliedCount: 1,
    };
    const result = applyBuffMath(entry, 15, MOCK_NOW);

    expect(result.id).toBe("b1");
    expect(result.nick).toBe("Ветеран");
    expect(result.priority).toBe(1);
  });
});

describe("formatSeconds", () => {
  it("форматирует дни, часы, минуты, секунды", () => {
    expect(formatSeconds(0)).toBe("0с");
    expect(formatSeconds(5)).toBe("5с");
    expect(formatSeconds(65)).toBe("1м 5с");
    expect(formatSeconds(3665)).toBe("1ч 1м");
    expect(formatSeconds(90065)).toBe("1д 1ч 1м");
  });

  it("секунды показываются только при отсутствии дней и часов", () => {
    expect(formatSeconds(3600)).toBe("1ч");
    expect(formatSeconds(60)).toBe("1м 0с");
    expect(formatSeconds(3661)).toBe("1ч 1м");
  });
});

describe("formatTimeShort", () => {
  it("форматирует только дни и часы (сек скрыты когда есть дни)", () => {
    expect(formatTimeShort(0)).toBe("0ч");
    expect(formatTimeShort(3600)).toBe("1ч");
    expect(formatTimeShort(90000)).toBe("1д 1ч");
    expect(formatTimeShort(172800)).toBe("2д");
  });
});

describe("generateCopyText", () => {
  const defaultTemplate = {
    header_build: "#184 Стройка | {date}\r\n",
    limit_build: 15,
    header_research: "\r\n#173 Исследование\r\n",
    limit_research: 15,
    include_5: 0,
    header_5: "#186 Для ускорений стройки отдаём баффы 5%\r\n",
  };

  it("генерирует текст с заголовками и списком игроков", () => {
    const text = generateCopyText({
      buffs: makeFixture(),
      template: defaultTemplate,
      currentTime: MOCK_NOW,
    });

    expect(text).toContain("#184 Стройка");
    expect(text).toContain("#173 Исследование");
    expect(text).toContain("Ваша честь");
    expect(text).toContain("De Vito");
    expect(text).toContain("#186 Спасибо за помощь!");
    expect(text).toContain("#199 Образец");
  });

  it("не добавляет маркеры 🔥/#256", () => {
    const text = generateCopyText({
      buffs: makeFixture(),
      template: defaultTemplate,
      currentTime: MOCK_NOW,
    });

    expect(text).not.toContain("#256");
    expect(text).not.toContain("🔥");
  });

  it("приоритетные игроки идут первыми в своём блоке", () => {
    const text = generateCopyText({
      buffs: makeFixture(),
      template: defaultTemplate,
      currentTime: MOCK_NOW,
    });
    const buildBlock = text.split("#173")[0];

    expect(buildBlock.indexOf("Жони")).toBeLessThan(buildBlock.indexOf("Ваша честь"));
  });

  it("include_5 = 1: добавляет блок 5% для оставшихся", () => {
    const tpl = { ...defaultTemplate, include_5: 1 };
    const text = generateCopyText({
      buffs: makeFixture(),
      template: tpl,
      currentTime: MOCK_NOW,
    });

    expect(text).toContain("#186 Для ускорений стройки");
    expect(text).toContain("(Нет доступных участников)");
  });

  it("соблюдает лимит записей (limit_build=2)", () => {
    const tpl = { ...defaultTemplate, limit_build: 2 };
    const text = generateCopyText({
      buffs: makeFixture(),
      template: tpl,
      currentTime: MOCK_NOW,
    });
    const buildBlock = text.split("#173")[0];

    expect(buildBlock).toContain("Жони");
    expect(buildBlock).toContain("Ваша честь");
    expect(buildBlock).not.toContain("Leaf");
    expect(buildBlock).not.toContain("Ветеран");
  });
});
