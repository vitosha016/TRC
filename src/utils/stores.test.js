import { describe, it, expect, vi, beforeEach } from "vitest";
import { get } from "svelte/store";

vi.mock("./api.js", () => ({
  loadState: vi.fn(),
  loadHistory: vi.fn(),
  loadVersion: vi.fn(),
  bgSave: vi.fn(),
  onSync: vi.fn(),
}));

const NOW = Math.floor(Date.now() / 1000);

function makeBuff(overrides = {}) {
  return {
    id: "b1",
    nick: "Alpha",
    type: "Стройка",
    buff: 15,
    endAt: NOW + 10 * 86400,
    createdAt: NOW - 1000,
    applied: 0,
    appliedCount: 0,
    queueReceived: 0,
    queueLastAt: 0,
    priority: 0,
    ...overrides,
  };
}

function makeState(overrides = {}) {
  return {
    ok: true,
    rev: 1,
    epoch: "e1",
    buffs: [],
    givers: {},
    nicks: [],
    template: {},
    ...overrides,
  };
}

async function boot() {
  vi.resetModules();
  const api = await import("./api.js");
  const stores = await import("./stores.js");
  vi.clearAllMocks();
  return { api, stores };
}

let ls;

beforeEach(() => {
  ls = new Map();
  globalThis.localStorage = {
    getItem: (key) => (ls.has(key) ? ls.get(key) : null),
    setItem: (key, value) => ls.set(key, String(value)),
    removeItem: (key) => ls.delete(key),
  };
});

describe("синхронизация", () => {
  it("загружает state при первом запуске и сохраняет rev", async () => {
    const { api, stores } = await boot();
    const buff = makeBuff();
    api.loadState.mockResolvedValue(makeState({ rev: 7, buffs: [buff] }));

    await stores.doLoad();

    expect(api.loadState).toHaveBeenCalledWith(true);
    expect(get(stores.buffs)).toHaveLength(1);
    expect(get(stores.rev)).toBe(7);
    expect(JSON.parse(ls.get("trc_cache")).rev).toBe(7);
  });

  it("использует свежий кеш без запроса state", async () => {
    const { api, stores } = await boot();
    ls.set(
      "trc_cache",
      JSON.stringify({
        buffs: [makeBuff()],
        givers: {},
        nicks: [],
        template: {},
        rev: 3,
        epoch: "e1",
        checkedAt: Math.floor(Date.now() / 1000),
      }),
    );
    api.loadVersion.mockResolvedValue({ ok: true, rev: 3 });

    await stores.doLoad();

    expect(api.loadVersion).toHaveBeenCalled();
    expect(api.loadState).not.toHaveBeenCalled();
    expect(get(stores.buffs)).toHaveLength(1);
    expect(get(stores.rev)).toBe(3);
  });

  it("не тянет state, если rev не изменился", async () => {
    const { api, stores } = await boot();
    api.loadState.mockResolvedValueOnce(makeState({ rev: 5 }));

    await stores.doLoad();
    api.loadVersion.mockResolvedValue({ ok: true, rev: 5 });
    api.loadState.mockClear();

    await stores.refreshFromServer();

    expect(api.loadVersion).toHaveBeenCalled();
    expect(api.loadState).not.toHaveBeenCalled();
    expect(get(stores.rev)).toBe(5);
  });

  it("не показывает ошибку при Server busy", async () => {
    const { api, stores } = await boot();
    api.loadState.mockResolvedValue({ ok: false, error: "Server busy, retry" });

    await stores.doLoad();

    expect(get(stores.error)).toBe("");
  });

  it("показывает ошибку при сбое сети", async () => {
    const { api, stores } = await boot();
    api.loadState.mockRejectedValue(new Error("network"));

    await stores.doLoad();

    expect(get(stores.error)).toBe("Ошибка синхронизации");
  });

  it("блокирует запись при старом бэкенде", async () => {
    const { api, stores } = await boot();
    api.loadState.mockResolvedValueOnce(makeState({ rev: undefined, epoch: undefined }));
    await stores.doLoad();

    expect(stores.doAdd("Alpha", "Стройка", 1, 0, "", false)).toBe(false);
    expect(api.bgSave).not.toHaveBeenCalled();
    expect(get(stores.error)).toContain("Бэкенд");
  });

  it("принимает state после сброса rev при смене epoch", async () => {
    const { api, stores } = await boot();
    api.loadState
      .mockResolvedValueOnce(makeState({ rev: 5, epoch: "e1" }))
      .mockResolvedValueOnce(makeState({ rev: 1, epoch: "e2", buffs: [makeBuff()] }));
    api.loadVersion.mockResolvedValue({ ok: true, rev: 1, epoch: "e2" });
    await stores.doLoad();

    await stores.refreshFromServer();

    expect(get(stores.rev)).toBe(1);
    expect(get(stores.buffs)).toHaveLength(1);
  });

  it("загружает state при смене rev", async () => {
    const { api, stores } = await boot();
    api.loadState
      .mockResolvedValueOnce(makeState({ rev: 5 }))
      .mockResolvedValueOnce(makeState({ rev: 6, buffs: [makeBuff()] }));
    await stores.doLoad();

    api.loadVersion.mockResolvedValue({ ok: true, rev: 6 });
    await stores.refreshFromServer();

    expect(api.loadState).toHaveBeenLastCalledWith(false);
    expect(get(stores.buffs)).toHaveLength(1);
    expect(get(stores.rev)).toBe(6);
  });

  it("при смене rev обновляет открытую историю", async () => {
    const { api, stores } = await boot();
    api.loadState
      .mockResolvedValueOnce(makeState({ rev: 5 }))
      .mockResolvedValueOnce(makeState({ rev: 6 }));
    api.loadHistory.mockResolvedValue({ ok: true, history: [{ id: "h1" }] });
    await stores.doLoad();

    await stores.doLoadHistory();
    api.loadVersion.mockResolvedValue({ ok: true, rev: 6 });
    await stores.refreshFromServer();

    expect(api.loadHistory).toHaveBeenCalledTimes(2);
    expect(get(stores.history)).toEqual([{ id: "h1" }]);
  });
});

describe("точечные операции", () => {
  it("doApply отправляет одну запись, историю и статистику", async () => {
    const { api, stores } = await boot();
    api.loadState.mockResolvedValueOnce(makeState({ rev: 1, buffs: [makeBuff()] }));
    await stores.doLoad();

    let body;
    api.bgSave.mockImplementation(async (data) => {
      body = data;
      return makeState({
        rev: 2,
        buffs: [data.buff],
        history: [data.historyEntry],
        givers: { Donor: { total: 1, last_buff: 1 } },
        nicks: ["Donor"],
      });
    });

    stores.doApply("b1", 15, "Donor");
    await vi.waitFor(() => expect(get(stores.rev)).toBe(2));

    expect(body.buffs).toBeUndefined();
    expect(body.buff.applied).toBe(15);
    expect(body.buff.appliedCount).toBe(1);
    expect(body.expectedAppliedCount).toBe(0);
    expect(body.historyEntry.recipient).toBe("Alpha");
    expect(body.giverStat.nick).toBe("Donor");
  });

  it("конфликт применения возвращает свежее состояние", async () => {
    const { api, stores } = await boot();
    api.loadState.mockResolvedValueOnce(makeState({ rev: 1, buffs: [makeBuff()] }));
    await stores.doLoad();

    const fresh = makeBuff({ applied: 15, appliedCount: 1 });
    api.bgSave.mockResolvedValue(
      makeState({
        ok: false,
        conflict: true,
        rev: 1,
        buffs: [fresh],
        history: [{ id: "h1" }],
      }),
    );

    stores.doApply("b1", 10, "Donor");
    await vi.waitFor(() => expect(get(stores.error)).toContain("Запись"));

    const buff = get(stores.buffs)[0];
    expect(buff.applied).toBe(15);
    expect(buff.appliedCount).toBe(1);
  });

  it("doAdd при редактировании передаёт expectedAppliedCount", async () => {
    const { api, stores } = await boot();
    api.loadState.mockResolvedValueOnce(
      makeState({ rev: 1, buffs: [makeBuff({ applied: 30, appliedCount: 2 })] }),
    );
    await stores.doLoad();

    let body;
    api.bgSave.mockImplementationOnce(async (data) => {
      body = data;
      return makeState({ rev: 2, buffs: [data.buff] });
    });
    expect(stores.doAdd("Alpha", "Стройка", 5, 0, "b1", false)).toBe(true);
    await vi.waitFor(() => expect(get(stores.rev)).toBe(2));

    expect(body.expectedAppliedCount).toBe(2);
    expect(body.buff.appliedCount).toBe(2);
  });

  it("doAdd и doDelete используют точечные операции", async () => {
    const { api, stores } = await boot();
    api.loadState.mockResolvedValueOnce(makeState({ rev: 1 }));
    await stores.doLoad();

    let addBody;
    api.bgSave.mockImplementationOnce(async (data) => {
      addBody = data;
      return makeState({ rev: 2, buffs: [data.buff], nicks: [data.nick] });
    });
    stores.doAdd("Alpha", "Стройка", 3, 0, "", true);
    await vi.waitFor(() => expect(get(stores.rev)).toBe(2));

    expect(addBody.buffs).toBeUndefined();
    expect(addBody.buff.priority).toBe(1);
    expect(addBody.expectedAppliedCount).toBeUndefined();
    expect(addBody.nick).toBe("Alpha");

    let deleteBody;
    api.bgSave.mockImplementationOnce(async (data) => {
      deleteBody = data;
      return makeState({ rev: 3 });
    });
    const id = get(stores.buffs)[0].id;
    stores.doDelete(id);
    await vi.waitFor(() => expect(get(stores.rev)).toBe(3));

    expect(deleteBody.deleteBuffId).toBe(id);
  });
});
