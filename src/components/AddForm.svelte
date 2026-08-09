<script>
  import { doAdd, nickList, buffs } from '../utils/stores.js';
  import Button from './ui/Button.svelte';
  import Suggest from './ui/Suggest.svelte';
  import Select from './ui/Select.svelte';
  import Card from './ui/Card.svelte';

  let { editId = $bindable('') } = $props();

  let nick = $state('');
  let type = $state('Стройка');
  let days = $state(0);
  let hours = $state(0);

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
    requestAnimationFrame(() => {
      const inp = document.querySelector('#snick');
      if (inp) inp.focus();
    });
  }

  let dayOpts = Array.from({length: 61}, (_, i) => ({ value: i, label: `${i} дн.` }));
  let hourOpts = Array.from({length: 24}, (_, i) => ({ value: i, label: `${i} ч.` }));
</script>

<Card>
  <form onsubmit={submit} autocomplete="off">
    <div class="row">
      <div class="field-nick">
        <Suggest id="snick" bind:value={nick} items={$nickList} placeholder="Ник игрока" />
      </div>

      <div class="field-type">
        <Select bind:value={type}>
          <option value="Стройка">🔨</option>
          <option value="Исследования">🔬</option>
        </Select>
      </div>

      <div class="field-num">
        <Select bind:value={days} options={dayOpts} />
      </div>
      <div class="field-num">
        <Select bind:value={hours} options={hourOpts} />
      </div>

      <input type="hidden" bind:value={editId} />
    </div>

    <div class="btn-row">
      <Button variant="main full" type="submit" disabled={submitting}>
        {submitting ? '...' : editId ? 'Обновить' : 'Добавить'}
      </Button>
    </div>
  </form>
</Card>

<style>
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .btn-row { margin-top: 8px; }
  .field-nick { flex: 1; min-width: 120px; }
  .field-type { width: 80px; flex-shrink: 0; }
  .field-num  { width: 80px; flex-shrink: 0; }

  @media (max-width: 700px) {
    .row { flex-direction: column; }
    .row > * { width: 100% !important; }
  }
</style>
