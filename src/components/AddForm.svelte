<script>
  import { doAdd, nickList, buffs } from '../utils/stores.js';
  import Button from './ui/Button.svelte';
  import Suggest from './ui/Suggest.svelte';
  import Select from './ui/Select.svelte';

  let { giverNick = $bindable(), onsavegiver = () => {}, editId = $bindable('') } = $props();

  let nick = $state('');
  let type = $state('Стройка');
  let days = $state(0);
  let hours = $state(0);

  // Когда editId меняется — заполняем форму из buffs
  $effect(() => {
    if (!editId) { nick = ''; days = 0; hours = 0; return; }
    let entry;
    const unsub = buffs.subscribe(v => { entry = v.find(b => b.id === editId); });
    unsub();
    if (!entry) return;
    nick = entry.nick;
    type = entry.type;
    days = Math.floor((entry.endAt - entry.createdAt) / 86400);
    hours = Math.floor(((entry.endAt - entry.createdAt) % 86400) / 3600);
  });
  let submitting = $state(false);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    if (days === 0 && hours === 0) { alert('Укажи дни или часы'); return; }
    submitting = true;
    await doAdd(nick, type, days, hours, editId);
    nick = ''; days = 0; hours = 0; editId = '';
    submitting = false;
    // вернуть фокус для быстрого добавления следующих
    requestAnimationFrame(() => {
      const inp = document.querySelector('#snick');
      if (inp) inp.focus();
    });
  }

  let dayOpts = Array.from({length: 61}, (_, i) => ({ value: i, label: `${i} дн.` }));
  let hourOpts = Array.from({length: 24}, (_, i) => ({ value: i, label: `${i} ч.` }));
</script>

<div class="card">
  <form onsubmit={submit} autocomplete="off">
    <div class="row">
      <div class="field-nick">
        <Suggest id="snick" bind:value={nick} items={$nickList} placeholder="Ник игрока" />
      </div>

      <div class="field-type">
        <Select bind:value={type}>
          <option value="Стройка">🪚 Стройка</option>
          <option value="Исследования">🔬 Исследования</option>
        </Select>
      </div>

      <div class="field-num">
        <Select bind:value={days} options={dayOpts} />
      </div>
      <div class="field-num">
        <Select bind:value={hours} options={hourOpts} />
      </div>

      <input type="hidden" bind:value={editId} />
      <Button variant="main" type="submit" disabled={submitting}>
        {submitting ? '...' : editId ? 'Обновить' : 'Добавить'}
      </Button>
    </div>

    <div class="row giver-row">
      <div class="giver-wrap">
        <span class="giver-label">кто раздаёт</span>
        <Suggest bind:value={giverNick} items={$nickList} placeholder="Ваш ник" onsave={onsavegiver} />
      </div>
    </div>
  </form>
</div>

<style>
  .card {
    background: #fff; border: 1px solid #e0e0e4;
    border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;
  }

  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .giver-row { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e4; }

  .field-nick { flex: 1; min-width: 160px; }
  .field-type { width: 180px; flex-shrink: 0; }
  .field-num  { width: 80px; flex-shrink: 0; }

  .giver-wrap { max-width: 320px; display: flex; align-items: center; gap: 8px; flex: 1; }
  .giver-label { font-size: 11px; color: #86868b; white-space: nowrap; flex-shrink: 0; }

  @media (max-width: 700px) {
    .row { flex-direction: column; }
    .row > * { width: 100% !important; }
    .giver-wrap { max-width: 100%; }
  }
</style>
