<script>
  import { onMount } from 'svelte';
  import {
    doLoad, refreshFromServer, startSync, addNick,
    buffs, template, syncing, error, lastSyncAt,
  } from './utils/stores.js';
  import BuffTable from './components/BuffTable.svelte';
  import AddForm from './components/AddForm.svelte';
  import GiverPanel from './components/GiverPanel.svelte';
  import LogList from './components/LogList.svelte';
  import SyncSpinner from './components/ui/SyncSpinner.svelte';
  import Button from './components/ui/Button.svelte';
  import { generateCopyText, nowSec } from './utils/formulas.js';

  let giverNick = $state('');
  let editId = $state('');
  let clock = $state(nowSec());

  let updatedText = $derived.by(() => {
    if (!$lastSyncAt) return '…';
    const s = Math.max(0, clock - $lastSyncAt);
    return s < 5 ? 'только что' : `${s}с назад`;
  });

  $effect(() => {
    const t = setInterval(() => { clock = nowSec(); }, 10_000);
    return () => clearInterval(t);
  });

  onMount(() => {
    giverNick = localStorage.getItem('giver_nick') || '';
    doLoad();
    return startSync();
  });

  function saveGiver() { const v = giverNick.trim(); localStorage.setItem('giver_nick', v); if (v) addNick(v); }

  async function copy() {
    let b, t;
    buffs.subscribe(v => b = v)();
    template.subscribe(v => t = v)();
    const text = generateCopyText({ buffs: b, template: t, currentTime: nowSec() });
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
      <div class="sub">Управление очередью · обновлено {updatedText}</div>
    </div>
    <div class="header-actions">
      <Button variant="small" onclick={() => refreshFromServer(true)} title="Обновить">↻</Button>
      <Button variant="main invert" onclick={copy}>📋 Копировать в чат</Button>
    </div>
  </header>

  <div class="panel-row">
    <AddForm bind:editId />
    <GiverPanel bind:giverNick onsavegiver={saveGiver} />
  </div>

  <BuffTable {giverNick} onedit={(id) => editId = id} />

  <LogList />

  <SyncSpinner visible={$syncing > 0} error={$error} />
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
  .header-actions { display: flex; align-items: center; gap: 8px; }
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
    .header-actions { width: 100%; }
    .header :global(.btn) { align-self: stretch; }
  }
</style>
