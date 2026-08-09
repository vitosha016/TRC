<script>
  import { onMount } from 'svelte';
  import { doLoad, nowSec } from './lib/stores.js';
  import BuffTable from './components/BuffTable.svelte';
  import AddForm from './components/AddForm.svelte';
  import DonorsBar from './components/DonorsBar.svelte';
  import LogList from './components/LogList.svelte';
  import SyncSpinner from './components/SyncSpinner.svelte';
  import { generateCopyText } from './lib/formulas.js';
  import { buffs, history, template } from './lib/stores.js';

  let giverNick = $state('');
  let giverSaved = '';

  onMount(() => {
    giverNick = localStorage.getItem('giver_nick') || '';
    giverSaved = giverNick;
    doLoad();
    const loadTimer = setInterval(doLoad, 15_000);
    return () => clearInterval(loadTimer);
  });

  function saveGiver() {
    const v = giverNick.trim();
    localStorage.setItem('giver_nick', v);
    giverSaved = v;
  }

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
  <div class="head">
    <h1>TRC × FRC · Баффы</h1>
    <div class="sub">Управление очередью</div>
  </div>

  <div class="topbar">
    <input
      type="text"
      placeholder="Кто раздаёт (ваш ник)"
      autocomplete="off"
      bind:value={giverNick}
      onblur={saveGiver}
    />
    <button class="btn btn-main" onclick={copy}>Копировать в чат</button>
  </div>

  <DonorsBar />
  <LogList />
  <AddForm />
  <BuffTable />
  <SyncSpinner />
</div>

<style>
  :global(body) {
    background: #f5f5f7; color: #1d1d1f;
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0; padding: 0;
  }
  :global(*) { box-sizing: border-box; }

  .wrap { max-width: 900px; margin: 0 auto; padding: 16px 12px 80px; }

  .head { margin-bottom: 14px; }
  .head h1 { font-size: 18px; font-weight: 700; margin: 0; }
  .head .sub { font-size: 12px; color: #86868b; }

  .topbar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .topbar input { flex: 1; min-width: 160px; padding: 7px 10px; border: 1px solid #e0e0e4; background: #fff; color: #1d1d1f; font: inherit; font-size: 13px; border-radius: 6px; }
  .topbar input:focus { outline: none; border-color: #86868b; }

  .btn {
    display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px;
    border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    border: 1px solid #e0e0e4; background: #fff; color: #1d1d1f;
    transition: all .12s; white-space: nowrap;
  }
  .btn:hover { background: #e0e0e4; }
  .btn-main { background: #1d1d1f; color: #f5f5f7; border-color: #1d1d1f; }
  .btn-main:hover { opacity: .85; }
</style>
