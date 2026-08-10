// ============================================================
// TRC x FRC — Google AppScript Backend (только хранение данных)
// ВСЯ ЛОГИКА ПОДСЧЁТА — НА ФРОНТЕНДЕ
// Никаких дефолтов — бек возвращает ровно то, что в таблице
// ============================================================

// === HTTP ОБРАБОТЧИКИ ======================================

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(5000);

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
  var lock = LockService.getScriptLock();
  lock.tryLock(5000);

  try {
    var params = e.parameter || {};

    switch (params.type) {
      case "all":
        return json(handleGetAll());
      case "history":
        return json(handleGetHistory());
      case "state":
        return json(handleGetState());
      default:
        return json({ ok: false, error: "Unknown type: " + params.type });
    }
  } catch (error) {
    return json({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

// === HANDLERS ==============================================

function handleGetAll() {
  return {
    ok: true,
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
    history: getHistory(),
  };
}

function handleGetState() {
  return {
    ok: true,
    buffs: getBuffs(),
    givers: getGivers(),
    nicks: getNicks(),
    template: getTemplate(),
  };
}

function handleSave(postData) {
  if (postData.buffs) setBuffs(postData.buffs);
  if (postData.historyEntry) addHistory(postData.historyEntry);
  if (postData.giverStat) addGiverStat(postData.giverStat.nick, postData.giverStat.ts);
  if (postData.nick) addNick(postData.nick);
  if (postData.nick2) addNick(postData.nick2);
  if (postData.template) setTemplate(postData.template);

  return {
    ok: true,
    buffs: getBuffs(),
    history: getHistory(),
    givers: getGivers(),
    nicks: getNicks(),
    template: getTemplate(),
  };
}

// === SHEET: Buffs ==========================================

function getBuffs() {
  var headers = [
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
  ];
  var sheet = getOrCreateSheet("Buffs", headers);
  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    result.push({
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
    });
  }

  return result;
}

function setBuffs(buffsArray) {
  var headers = [
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
  ];
  var sheet = getOrCreateSheet("Buffs", headers);
  sheet.clearContents();
  sheet.appendRow(headers);

  if (buffsArray.length === 0) return;

  var rows = buffsArray.map(function (b) {
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
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

// === SHEET: History ========================================

function getHistory() {
  var headers = ["id", "recipient_id", "recipient", "type", "giver", "percent", "time"];
  var sheet = getOrCreateSheet("History", headers);
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
  var headers = ["id", "recipient_id", "recipient", "type", "giver", "percent", "time"];
  var sheet = getOrCreateSheet("History", headers);
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
  }

  return sheet;
}

function isSheetEmpty(sheet) {
  var data = sheet.getDataRange().getValues();
  return data.join("") === "";
}
