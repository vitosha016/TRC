const GAS_ID = process.env.PUBLIC_PROD_GOOGLE_APPSCRIPT_ID;
if (!GAS_ID) throw new Error('PUBLIC_PROD_GOOGLE_APPSCRIPT_ID not set in environment');
const BASE = `https://script.google.com/macros/s/${GAS_ID}/exec`;

async function api(type, method = 'GET', body = null) {
  const url = `${BASE}?type=${type}`;
  const opts = { method, redirect: 'follow' };
  if (body) {
    opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  return JSON.parse(text);
}

const ok = (name, cond) => console.log(cond ? `  ✅ ${name}` : `  ❌ ${name}`);
const log = (label, data) => console.log(`  ${label}:`, JSON.stringify(data).substring(0, 150));

(async () => {
  const now = Math.floor(Date.now() / 1000);

  console.log('=== 1. Чистая таблица ===');
  await api('save', 'POST', { buffs: [] });
  let data = await api('all');
  ok('buffs пуст', data.buffs.length === 0);

  console.log('\n=== 2. Добавляем 2 игроков ===');
  const b1 = { id:'b_a', nick:'Alpha',   type:'Стройка',      buff:15, endAt:now+10*86400, createdAt:now, applied:0, appliedCount:0, queueReceived:0, queueLastAt:0 };
  const b2 = { id:'b_b', nick:'Bravo',   type:'Исследования', buff:15, endAt:now+5*86400,  createdAt:now, applied:0, appliedCount:0, queueReceived:0, queueLastAt:0 };
  let save = await api('save', 'POST', { buffs:[b1,b2], nick:'Alpha', nick2:'Bravo' });
  ok('2 buffs', save.buffs.length === 2);
  ok('Bravo в nicks', save.nicks.includes('Bravo'));   // требует nick2 в GAS

  console.log('\n=== 3. Применяем бафф 15% к Alpha ===');
  let entry = save.buffs.find(b=>b.id==='b_a');
  const rem = Math.max(0, entry.endAt - now);
  entry.endAt = Math.round(now + rem * 0.85);
  entry.applied = 15; entry.appliedCount = 1; entry.queueReceived = 1; entry.queueLastAt = now;
  const hist1 = { id:'bh_1', recipient_id:'b_a', recipient:'Alpha', type:'Стройка', giver:'Donor_X', percent:15, time:now };
  save = await api('save', 'POST', { buffs: save.buffs, historyEntry: hist1, giverStat: { nick:'Donor_X', ts:now }, nick:'Donor_X' });
  ok('applied=15', save.buffs.find(b=>b.id==='b_a').applied === 15);
  ok('count=1',    save.buffs.find(b=>b.id==='b_a').appliedCount === 1);
  ok('history=1',  save.history.length === 1);
  ok('Donor_X=1',  save.givers['Donor_X'].total === 1);

  console.log('\n=== 4. Второй бафф 10% к Alpha ===');
  entry = save.buffs.find(b=>b.id==='b_a');
  const rem2 = Math.max(0, entry.endAt - now);
  entry.endAt = Math.round(now + rem2 * 0.90);
  entry.applied = 25; entry.appliedCount = 2;
  const hist2 = { id:'bh_2', recipient_id:'b_a', recipient:'Alpha', type:'Стройка', giver:'Donor_X', percent:10, time:now+1 };
  save = await api('save', 'POST', { buffs: save.buffs, historyEntry: hist2, giverStat: { nick:'Donor_X', ts:now+1 } });
  ok('applied=25', save.buffs.find(b=>b.id==='b_a').applied === 25);
  ok('count=2',    save.buffs.find(b=>b.id==='b_a').appliedCount === 2);
  ok('Donor_X=2',  save.givers['Donor_X'].total === 2);

  console.log('\n=== 5. Админка: обновляем Alpha → Alpha_New ===');
  entry = save.buffs.find(b=>b.id==='b_a');
  log('ДО', entry);
  entry.nick = 'Alpha_New';
  entry.endAt = now + 15 * 86400;
  entry.queueReceived = 0;
  entry.queueLastAt = 0;
  log('ПОСЛЕ', entry);
  save = await api('save', 'POST', { buffs: save.buffs, nick: 'Alpha_New' });
  const updated = save.buffs.find(b=>b.id==='b_a');
  log('ВЕРНУЛОСЬ', updated);
  ok('ник = Alpha_New', updated && updated.nick === 'Alpha_New');
  ok('endAt новый', updated && updated.endAt === now + 15 * 86400);

  console.log('\n=== 6. Удаляем Bravo ===');
  save = await api('save', 'POST', { buffs: save.buffs.filter(b=>b.id!=='b_b') });
  ok('1 buff', save.buffs.length === 1);

  console.log('\n=== 7. Шаблон ===');
  const tpl = { header_build:'#X | {date}\r\n', limit_build:10, header_research:'\r\n#Y\r\n', limit_research:20, include_5:1, header_5:'#Z\r\n' };
  save = await api('save', 'POST', { template: tpl });
  ok('limit_build=10', +save.template.limit_build === 10);
  ok('include_5=1',    +save.template.include_5 === 1);

  console.log('\n=== 8. Очистка ===');
  await api('save', 'POST', { buffs: [] });
  data = await api('all');
  ok('чисто', data.buffs.length === 0);

  console.log('\n🎉 ГОТОВО');
})();
