import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import vm from "node:vm";

const SOURCE = fs.readFileSync(new URL("./googleAppScriptBackend.gs", import.meta.url), "utf8");

class Sheet {
  constructor(name) {
    this.name = name;
    this.data = [];
  }

  getLastRow() {
    let last = 0;
    for (let i = 0; i < this.data.length; i++) {
      if ((this.data[i] || []).some((c) => c !== "" && c !== null && c !== undefined)) last = i + 1;
    }
    return last;
  }

  getLastColumn() {
    let last = 0;
    for (const row of this.data) last = Math.max(last, (row || []).length);
    return last;
  }

  getDataRange() {
    stats.sheetReads++;
    return { getValues: () => this.data.map((r) => [...r]) };
  }

  getRange(row, col, numRows = 1, numCols = 1) {
    const sheet = this;
    return {
      getValues() {
        const out = [];
        for (let r = 0; r < numRows; r++) {
          const src = sheet.data[row - 1 + r] || [];
          const line = [];
          for (let c = 0; c < numCols; c++) {
            const v = src[col - 1 + c];
            line.push(v === undefined ? "" : v);
          }
          out.push(line);
        }
        return out;
      },
      setValues(values) {
        for (let r = 0; r < numRows; r++) {
          const idx = row - 1 + r;
          if (!sheet.data[idx]) sheet.data[idx] = [];
          for (let c = 0; c < numCols; c++) {
            sheet.data[idx][col - 1 + c] = values[r][c];
          }
        }
      },
      setValue(v) {
        if (!sheet.data[row - 1]) sheet.data[row - 1] = [];
        sheet.data[row - 1][col - 1] = v;
      },
    };
  }

  appendRow(row) {
    this.data.push([...row]);
  }

  clearContents() {
    this.data = [];
  }

  deleteRow(i) {
    this.data.splice(i - 1, 1);
  }
}

let sheets;
let cacheMap;
let props;
let stats;
let context;

beforeEach(() => {
  sheets = new Map();
  cacheMap = new Map();
  props = new Map();
  stats = { lockCalls: 0, sheetReads: 0 };

  const SpreadsheetApp = {
    getActiveSpreadsheet() {
      return {
        getSheetByName(name) {
          return sheets.get(name) || null;
        },
        insertSheet(name) {
          const sheet = new Sheet(name);
          sheets.set(name, sheet);
          return sheet;
        },
      };
    },
  };

  const LockService = {
    getScriptLock() {
      return {
        tryLock() {
          stats.lockCalls++;
          return true;
        },
        releaseLock() {},
      };
    },
  };

  const CacheService = {
    getScriptCache() {
      return {
        get(key) {
          return cacheMap.has(key) ? cacheMap.get(key) : null;
        },
        put(key, value) {
          cacheMap.set(key, value);
        },
        remove(key) {
          cacheMap.delete(key);
        },
      };
    },
  };

  const PropertiesService = {
    getScriptProperties() {
      return {
        getProperty(key) {
          return props.has(key) ? props.get(key) : null;
        },
        setProperty(key, value) {
          props.set(key, value);
        },
      };
    },
  };

  const ContentService = {
    MimeType: { JSON: "application/json" },
    createTextOutput(text) {
      return {
        text,
        setMimeType() {
          return this;
        },
      };
    },
  };

  context = {
    SpreadsheetApp,
    LockService,
    CacheService,
    PropertiesService,
    ContentService,
    JSON,
    Number,
    Object,
    Array,
    String,
    Math,
    Date,
  };

  vm.createContext(context);
  vm.runInContext(SOURCE, context);
});

const call = (fn, arg) => JSON.parse(fn(arg).text);
const getState = (force = false) =>
  call(context.doGet, { parameter: { type: "state", force: force ? "1" : "" } });
const getHistory = () => call(context.doGet, { parameter: { type: "history" } });
const getVersion = () => call(context.doGet, { parameter: { type: "version" } });
const save = (body) =>
  call(context.doPost, {
    parameter: { type: "save" },
    postData: { contents: JSON.stringify(body) },
  });

function makeBuff(overrides = {}) {
  const now = 1_700_000_000;
  return {
    id: "b1",
    nick: "Alpha",
    type: "Стройка",
    buff: 15,
    endAt: now + 5 * 86400,
    createdAt: now,
    applied: 0,
    appliedCount: 0,
    queueReceived: 0,
    queueLastAt: 0,
    priority: 0,
    ...overrides,
  };
}

describe("GAS-бэкенд", () => {
  it("создаёт листы, кеширует state и не берёт лок на попадании", () => {
    const state = getState();
    expect(state.ok).toBe(true);
    expect(state.buffs).toEqual([]);
    expect(sheets.get("Buffs").data[0]).toContain("priority");
    expect(stats.lockCalls).toBe(1);

    const locksBefore = stats.lockCalls;
    getState();
    expect(stats.lockCalls).toBe(locksBefore);
  });

  it("игнорирует кеш при другом rev", () => {
    getState();
    const readsBefore = stats.sheetReads;
    context.bumpRev();

    const state = getState();

    expect(stats.sheetReads).toBeGreaterThan(readsBefore);
    expect(state.rev).toBe(context.getRev());
  });

  it("игнорирует кеш при другом epoch", () => {
    getState();
    const readsBefore = stats.sheetReads;
    props.set("trc_epoch", "epoch_2");

    const state = getState();

    expect(stats.sheetReads).toBeGreaterThan(readsBefore);
    expect(state.epoch).toBe("epoch_2");
    expect(getVersion().epoch).toBe("epoch_2");
  });

  it("делает upsert, delete и legacy-замену", () => {
    const buff = makeBuff();
    let saved = save({ buff, nick: "Alpha" });
    expect(saved.buffs).toHaveLength(1);
    expect(saved.nicks).toContain("Alpha");

    saved = save({ buff: { ...buff, applied: 15, appliedCount: 1 }, expectedAppliedCount: 0 });
    expect(saved.buffs[0].appliedCount).toBe(1);

    saved = save({ deleteBuffId: buff.id });
    expect(saved.buffs).toHaveLength(0);

    saved = save({ buffs: [buff] });
    expect(saved.buffs).toHaveLength(1);
    expect(saved.buffs[0].priority).toBe(0);
  });

  it("возвращает конфликт при устаревшем appliedCount", () => {
    const buff = makeBuff();
    save({ buff });
    save({ buff: { ...buff, applied: 15, appliedCount: 1 }, expectedAppliedCount: 0 });
    const revBefore = getVersion().rev;

    const conflict = save({
      buff: { ...buff, applied: 30, appliedCount: 2 },
      expectedAppliedCount: 0,
      historyEntry: { id: "h_conflict", recipient_id: buff.id },
      nick: "Nope",
    });

    expect(conflict.ok).toBe(false);
    expect(conflict.conflict).toBe(true);
    expect(conflict.buffs[0].applied).toBe(15);
    expect(conflict.buffs[0].appliedCount).toBe(1);
    expect(getHistory().history).toHaveLength(0);
    expect(getVersion().rev).toBe(revBefore);

    const state = getState(true);
    const row = state.buffs.find((b) => b.id === buff.id);
    expect(row.applied).toBe(15);
    expect(row.appliedCount).toBe(1);
  });

  it("добавляет колонку priority в старый лист", () => {
    const old = new Sheet("Buffs");
    old.data = [
      [
        "id",
        "nick",
        "type",
        "buff",
        "endAt",
        "createdAt",
        "applied",
        "appliedCount",
        "queueReceived",
        "queueLastAt",
      ],
      ["b_old", "Old", "Стройка", 15, 1_700_000_000 + 86400, 1_700_000_000, 0, 0, 0, 0],
    ];
    sheets.set("Buffs", old);

    const state = getState(true);

    expect(old.data[0][10]).toBe("priority");
    expect(state.buffs[0].id).toBe("b_old");
    expect(state.buffs[0].priority).toBe(0);
  });
});
