<script>
  import { onMount } from 'svelte';
  import { doLoad, nowSec, addNick, nickList } from './utils/stores.js';
  import BuffTable from './components/BuffTable.svelte';
  import AddForm from './components/AddForm.svelte';
  import GiverPanel from './components/GiverPanel.svelte';
  import LogList from './components/LogList.svelte';
  import SyncSpinner from './components/ui/SyncSpinner.svelte';
  import Button from './components/ui/Button.svelte';
  import { generateCopyText } from './utils/formulas.js';
  import { buffs, history, template, syncing } from './utils/stores.js';

  let giverNick = $state('');
  let editId = $state('');

  onMount(() => {
    giverNick = localStorage.getItem('giver_nick') || '';
    doLoad();
    const loadTimer = setInterval(doLoad, 15_000);
    return () => clearInterval(loadTimer);
  });

  function saveGiver() { const v = giverNick.trim(); localStorage.setItem('giver_nick', v); if (v) addNick(v); }

  async function copy() {
    let b, h, t;
    buffs.subscribe(v => b = v)();
    history.subscribe(v => h = v)();
    template.subscribe(v => t = v)();
    const text = generateCopyText({ buffs: b, history: h, template: t, currentTime: nowSec() });
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      alert('Скопировано!');
    }
  }
</script>

<div class="wrap">
  <header class="header">
    <div>
      <h1>TRC · Баффы</h1>
      <div class="sub">Управление очередью</div>
    </div>
    <Button variant="main" onclick={copy}>Копировать в чат</Button>
  </header>

  <div class="panel-row">
    <AddForm bind:editId />
    <GiverPanel bind:giverNick onsavegiver={saveGiver} />
  </div>

  <BuffTable {giverNick} onedit={(id) => editId = id} />

  <LogList />

  <SyncSpinner visible={$syncing > 0} />
</div>

<style>
  :global(body) {
    background: #f5f5f7; color: #1d1d1f;
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0; padding: 0;
  }
  :global(*) { box-sizing: border-box; }

  .wrap { max-width: 1440px; margin: 0 auto; padding: 20px 24px 32px; }

  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .header h1 { font-size: 20px; font-weight: 700; margin: 0; }
  .sub { font-size: 12px; color: #86868b; margin-top: 2px; }

  .panel-row {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;
  }

  @media (max-width: 800px) {
    .panel-row { grid-template-columns: 1fr; }
  }

  @media (max-width: 600px) {
    .wrap { padding: 12px 10px 80px; }
    .header { flex-direction: column; align-items: flex-start; gap: 10px; }
    .header :global(.btn) { align-self: stretch; }
  }
</style>
