// ============================================================
// TRC x FRC — Google AppScript Backend (только хранение данных)
// ВСЯ ЛОГИКА ПОДСЧЁТА — НА ФРОНТЕНДЕ
// Кеш CacheService + ревизия для быстрой синхронизации
// ============================================================

var BUFF_HEADERS = [
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
  "priority",
];

var HISTORY_HEADERS = ["id", "recipient_id", "recipient", "type", "giver", "percent", "time"];

var REV_KEY = "trc_rev";
var EPOCH_KEY = "trc_epoch";
var STATE_CACHE_KEY = "trc_state_v2";
var HISTORY_CACHE_KEY = "trc_history_v2";
var STATE_TTL = 3600;
var HISTORY_TTL = 1800;

// === HTTP ОБРАБОТЧИКИ ======================================

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return json({ ok: false, error: "Server busy, retry" });
  }

  try {
    var params = e.parameter || {};
    var postData = e.postData ? JSON.parse(e.postData.contents) : {};

    switch (params.type) {
      case "save":
        return json(handleSave(postData));
      default:
        return json({ ok: false, error: "Unknown type: " + params.type });
    }
  } catch (error) {
    return json({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var params = e.parameter || {};
  var force = params.force === "1";

  switch (params.type) {
    case "version":
      return json({ ok: true, rev: getRev(), epoch: getEpoch() });
    case "state":
      return json(cachedGet(STATE_CACHE_KEY, handleGetState, STATE_TTL, force));
    case "history":
      return json(cachedGet(HISTORY_CACHE_KEY, handleGetHistory, HISTORY_TTL, force));
    case "all":
      return json(withLock(handleGetAll));
    default:
      return json({ ok: false, error: "Unknown type: " + params.type });
  }
}

// === CACHE / LOCK ==========================================

function cachedGet(key, handler, ttlSec, force) {
  var cache = CacheService.getScriptCache();
  if (!force) {
    var cached = readFreshCache(cache, key);
    if (cached) return cached;
  }

  return withLock(function () {
    if (!force) {
      var cached2 = readFreshCache(cache, key);
      if (cached2) return cached2;
    }
    var data = handler();
    data.rev = getRev();
    if (!data.epoch) data.epoch = getEpoch();
    writeCache(cache, key, data, ttlSec);
    return data;
  });
}

function readFreshCache(cache, key) {
  var cached = readCache(cache, key);
  if (!cached) return null;
  if (typeof cached.rev !== "number" || cached.rev !== getRev()) return null;
  if (cached.epoch !== getEpoch()) return null;
  return cached;
}

function withLock(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { ok: false, error: "Server busy, retry" };
  }

  try {
    return fn();
  } catch (error) {
    return { ok: false, error: String(error) };
  } finally {
    lock.releaseLock();
  }
}

function readCache(cache, key) {
  var raw = cache.get(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function writeCache(cache, key, data, ttlSec) {
  try {
    cache.put(key, JSON.stringify(data), ttlSec);
  } catch (error) {}
}

function getRev() {
  return Number(PropertiesService.getScriptProperties().getProperty(REV_KEY) || 0);
}

function bumpRev() {
  var props = PropertiesService.getScriptProperties();
  var rev = Number(props.getProperty(REV_KEY) || 0) + 1;
  props.setProperty(REV_KEY, String(rev));
  return rev;
}

function getEpoch() {
  return PropertiesService.getScriptProperties().getProperty(EPOCH_KEY) || "";
}

function ensureEpoch() {
  var props = PropertiesService.getScriptProperties();
  var epoch = props.getProperty(EPOCH_KEY);
  if (!epoch) {
    epoch = String(Date.now()) + Math.random().toString(36).slice(2);
    props.setProperty(EPOCH_KEY, epoch);
  }
  return epoch;
}

// === HANDLERS ==============================================

function handleGetAll() {
  return {
    ok: true,
    rev: getRev(),
    epoch: ensureEpoch(),
    buffs: getBuffs(),
    history: getHistory(),
    givers: getGivers(),
    nicks: getNicks(),
    template: getTemplate(),
  };
}

function handleGetHistory() {
  return {
    ok: true,
    epoch: ensureEpoch(),
    history: getHistory(),
  };
}

function handleGetState() {
  return {
    ok: true,
    epoch: ensureEpoch(),
    buffs: getBuffs(),
    givers: getGivers(),
    nicks: getNicks(),
    template: getTemplate(),
  };
}

function handleSave(postData) {
  if (postData.buff) {
    var matched = true;

    if (typeof postData.expectedAppliedCount === "number") {
      matched = upsertBuffIfUnchanged(postData.buff, postData.expectedAppliedCount);
    } else {
      upsertBuff(postData.buff);
    }

    if (!matched) {
      var current = handleGetState();
      return {
        ok: false,
        conflict: true,
        error: "Buff changed",
        rev: getRev(),
        epoch: current.epoch,
        buffs: current.buffs,
        history: getHistory(),
        givers: current.givers,
        nicks: current.nicks,
        template: current.template,
      };
    }
  }

  if (postData.buffs) setBuffs(postData.buffs);
  if (postData.deleteBuffId) deleteBuff(postData.deleteBuffId);
  if (postData.historyEntry) addHistory(postData.historyEntry);
  if (postData.giverStat) addGiverStat(postData.giverStat.nick, postData.giverStat.ts);
  if (postData.nick) addNick(postData.nick);
  if (postData.nick2) addNick(postData.nick2);
  if (postData.template) setTemplate(postData.template);

  var rev = bumpRev();
  var state = handleGetState();
  state.rev = rev;
  var history = handleGetHistory();
  history.rev = rev;

  var cache = CacheService.getScriptCache();
  writeCache(cache, STATE_CACHE_KEY, state, STATE_TTL);
  writeCache(cache, HISTORY_CACHE_KEY, history, HISTORY_TTL);

  return {
    ok: true,
    rev: rev,
    epoch: state.epoch,
    buffs: state.buffs,
    history: history.history,
    givers: state.givers,
    nicks: state.nicks,
    template: state.template,
  };
}

// === SHEET: Buffs ==========================================

function getBuffs() {
  var sheet = getOrCreateSheet("Buffs", BUFF_HEADERS);
  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) result.push(rowToBuff(data[i]));
  }

  return result;
}

function setBuffs(buffsArray) {
  var sheet = getOrCreateSheet("Buffs", BUFF_HEADERS);
  sheet.clearContents();
  sheet.appendRow(BUFF_HEADERS);

  if (buffsArray.length === 0) return;

  var rows = buffsArray.map(buffToRow);
  sheet.getRange(2, 1, rows.length, BUFF_HEADERS.length).setValues(rows);
}

function upsertBuff(buff) {
  var sheet = getOrCreateSheet("Buffs", BUFF_HEADERS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === buff.id) {
      sheet.getRange(i + 1, 1, 1, BUFF_HEADERS.length).setValues([buffToRow(buff)]);
      return;
    }
  }

  sheet.appendRow(buffToRow(buff));
}

function upsertBuffIfUnchanged(buff, expectedAppliedCount) {
  var sheet = getOrCreateSheet("Buffs", BUFF_HEADERS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === buff.id) {
      var current = rowToBuff(data[i]);
      if ((current.appliedCount || 0) !== expectedAppliedCount) return false;

      sheet.getRange(i + 1, 1, 1, BUFF_HEADERS.length).setValues([buffToRow(buff)]);
      return true;
    }
  }

  return false;
}

function deleteBuff(id) {
  var sheet = getOrCreateSheet("Buffs", BUFF_HEADERS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function rowToBuff(row) {
  return {
    id: row[0],
    nick: row[1],
    type: row[2],
    buff: Number(row[3]),
    endAt: Number(row[4]) || 0,
    createdAt: Number(row[5]) || 0,
    applied: Number(row[6]) || 0,
    appliedCount: Number(row[7]) || 0,
    queueReceived: Number(row[8]) || 0,
    queueLastAt: Number(row[9]) || 0,
    priority: Number(row[10]) || 0,
  };
}

function buffToRow(b) {
  return [
    b.id,
    b.nick,
    b.type,
    b.buff,
    b.endAt,
    b.createdAt,
    b.applied,
    b.appliedCount,
    b.queueReceived,
    b.queueLastAt,
    b.priority || 0,
  ];
}

// === SHEET: History ========================================

function getHistory() {
  var sheet = getOrCreateSheet("History", HISTORY_HEADERS);
  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    result.push({
      id: row[0],
      recipient_id: row[1],
      recipient: row[2],
      type: row[3],
      giver: row[4],
      percent: Number(row[5]) || 0,
      time: Number(row[6]) || 0,
    });
  }

  return result;
}

function addHistory(entry) {
  var sheet = getOrCreateSheet("History", HISTORY_HEADERS);
  sheet.appendRow([
    entry.id,
    entry.recipient_id,
    entry.recipient,
    entry.type,
    entry.giver,
    entry.percent,
    entry.time,
  ]);
}

// === SHEET: Givers =========================================

function getGivers() {
  var sheet = getOrCreateSheet("Givers", ["nick", "total", "last_buff"]);
  var data = sheet.getDataRange().getValues();
  var result = {};

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    result[row[0]] = {
      total: Number(row[1]) || 0,
      last_buff: Number(row[2]) || 0,
    };
  }

  return result;
}

function addGiverStat(nick, ts) {
  var sheet = getOrCreateSheet("Givers", ["nick", "total", "last_buff"]);
  var data = sheet.getDataRange().getValues();
  var found = false;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === nick) {
      sheet.getRange(i + 1, 2).setValue((Number(data[i][1]) || 0) + 1);
      sheet.getRange(i + 1, 3).setValue(ts);
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([nick, 1, ts]);
  }
}

// === SHEET: Nicks ==========================================

function getNicks() {
  var sheet = getOrCreateSheet("Nicks", ["nick"]);
  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) result.push(data[i][0]);
  }

  return result;
}

function addNick(nick) {
  if (!nick) return;
  var nicks = getNicks();
  if (nicks.indexOf(nick) === -1) {
    var sheet = getOrCreateSheet("Nicks", ["nick"]);
    sheet.appendRow([nick]);
  }
}

// === SHEET: Template =======================================

function getTemplate() {
  var sheet = getOrCreateSheet("Template", ["key", "value"]);
  var data = sheet.getDataRange().getValues();
  var result = {};

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0]) result[row[0]] = row[1];
  }

  return result;
}

function setTemplate(template) {
  var sheet = getOrCreateSheet("Template", ["key", "value"]);
  sheet.clearContents();
  sheet.appendRow(["key", "value"]);

  var keys = Object.keys(template);
  var rows = keys.map(function (key) {
    return [key, template[key]];
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
}

// === УТИЛИТЫ ===============================================

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function getOrCreateSheet(name, titlesArr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (isSheetEmpty(sheet)) {
    sheet.appendRow(titlesArr);
  } else {
    ensureHeaders(sheet, titlesArr);
  }

  return sheet;
}

function ensureHeaders(sheet, titlesArr) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;

  var current = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  for (var i = 0; i < titlesArr.length; i++) {
    var title = titlesArr[i];
    if (current[i] !== title && current.indexOf(title) === -1) {
      sheet.getRange(1, i + 1).setValue(title);
    }
  }
}

function isSheetEmpty(sheet) {
  return sheet.getLastRow() === 0;
}
