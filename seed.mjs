import { writeFileSync } from 'fs';

const BASE = 'https://script.google.com/macros/s/AKfycbwKiUPJQkV32WLMfdiyApoAR8e2IimUOgvnzQYjuubjm-n7kNYYUIyD5etpXX6XX-WzOQ/exec';

async function gasGet() {
  const r = await fetch(`${BASE}?type=all`, { redirect: 'follow' });
  return r.json();
}

async function gasSave(data) {
  const r = await fetch(`${BASE}?type=save`, {
    method: 'POST', redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(data),
  });
  return r.json();
}

const now = Math.floor(Date.now() / 1000);

/* История из исходной таблицы:
   1 → 15%  = неизвестный giver
   vi007 → 15%  = конкретный giver
*/
const histData = [
  // Стройка
  { nick:'Ветеран',   giver:'Не указан', pct:15 },
  { nick:'Жони',      giver:'vi007',      pct:15 },
  { nick:'Жони',      giver:'Не указан', pct:15 },
  { nick:'Т@нюша',    giver:'Не указан', pct:15 },
  { nick:'Т@нюша',    giver:'Не указан', pct:15 },
  { nick:'BORODA',    giver:'Не указан', pct:15 },
  { nick:'Vi007',     giver:'Не указан', pct:15 },
  { nick:'Sinnervzm', giver:'Не указан', pct:15 },
  { nick:'Sinnervzm', giver:'Не указан', pct:10 },
  { nick:'Sinnervzm', giver:'Не указан', pct:15 },
  { nick:'Полянк@',   giver:'Не указан', pct:10 },
  { nick:'Полянк@',   giver:'Не указан', pct:15 },
  // Исследования
  { nick:'De Vito',    giver:'Не указан', pct:15 },
  { nick:'De Vito',    giver:'Не указан', pct:15 },
  { nick:'Jeka',       giver:'vi007',      pct:15 },
  { nick:'Leaf',       giver:'Не указан', pct:15 },
  { nick:'Leaf',       giver:'Не указан', pct:10 },
  { nick:'Leaf',       giver:'Не указан', pct:15 },
  { nick:'Брюс Уэйн',  giver:'Не указан', pct:15 },
  { nick:'Mim',        giver:'Не указан', pct:15 },
  { nick:'самбоо5',    giver:'Не указан', pct:15 },
  { nick:'White_Snake',giver:'Не указан', pct:15 },
  { nick:'Peace_death',giver:'Не указан', pct:15 },
];

(async () => {
  // Получаем текущих игроков чтобы узнать их id
  const data = await gasGet();
  const byNick = {};
  for (const b of data.buffs) {
    if (!byNick[b.nick]) byNick[b.nick] = b;
  }

  let t = now;
  const entries = [];
  for (const h of histData) {
    const buff = byNick[h.nick];
    if (!buff) { console.log('НЕ НАЙДЕН:', h.nick); continue; }
    entries.push({
      id: 'bh' + (t++) + Math.random().toString(36).slice(2),
      recipient_id: buff.id,
      recipient: h.nick,
      type: buff.type,
      giver: h.giver,
      percent: h.pct,
      time: t++,
    });
  }

  // Отправляем по одному (бекенд принимает historyEntry)
  for (const e of entries) {
    await gasSave({ historyEntry: e });
    console.log(`  + ${e.giver} → ${e.recipient} [${e.percent}%]`);
  }

  const check = await gasGet();
  console.log(`\nГотово: ${check.history.length} записей в истории`);
})();
