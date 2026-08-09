const GAS_ID = process.env.PUBLIC_PROD_GOOGLE_APPSCRIPT_ID;
if (!GAS_ID) throw new Error('PUBLIC_PROD_GOOGLE_APPSCRIPT_ID not set');
const BASE = `https://script.google.com/macros/s/${GAS_ID}/exec`;

const gasGet = () => fetch(BASE+'?type=all',{redirect:'follow'}).then(r=>r.json());
const gasSave = d => fetch(BASE+'?type=save',{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(d)}).then(r=>r.json());

(async()=>{
  const d = await gasGet();
  const updated = d.buffs.map(b => ({...b, buff: 15}));
  const r = await gasSave({ buffs: updated });
  console.log(`Обновлено: ${r.buffs.length} игроков → buff=15`);
})();
