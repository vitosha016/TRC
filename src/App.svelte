<script>
  import { onMount } from 'svelte';
  import { doLoad, nowSec, addNick, nickList } from './lib/stores.js';
  import BuffTable from './components/BuffTable.svelte';
  import AddForm from './components/AddForm.svelte';
  import DonorsBar from './components/DonorsBar.svelte';
  import LogList from './components/LogList.svelte';
  import SyncSpinner from './components/SyncSpinner.svelte';
  import { generateCopyText } from './lib/formulas.js';
  import { buffs, history, template } from './lib/stores.js';

  let giverNick = $state('');

  let giverSearch = $state('');
  let giverDrop = $state(false);
  let giverFocus = $state(-1);
  let giverMatches = $derived(
    giverSearch ? $nickList.filter(n => n.toLowerCase().includes(giverSearch.toLowerCase())).slice(0, 8) : []
  );

  function pickGiver(n) { giverNick = n; giverDrop = false; giverFocus = -1; saveGiver(); }

  function giverKey(e) {
    if (!giverDrop || !giverMatches.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); giverFocus = (giverFocus + 1) % giverMatches.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); giverFocus = (giverFocus - 1 + giverMatches.length) % giverMatches.length; }
    else if (e.key === 'Enter' && giverFocus >= 0) { e.preventDefault(); pickGiver(giverMatches[giverFocus]); }
    else if (e.key === 'Escape') { giverDrop = false; giverFocus = -1; }
    else { giverFocus = -1; }
  }
  function saveGiver() { const v = giverNick.trim(); localStorage.setItem('giver_nick', v); if (v) addNick(v); }

  onMount(() => {
    giverNick = localStorage.getItem('giver_nick') || '';
    doLoad();
    const loadTimer = setInterval(doLoad, 15_000);
    return () => clearInterval(loadTimer);
  });

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
    <div class="input-wrap">
      <input
        type="text"
        placeholder="Кто раздаёт (ваш ник)"
        autocomplete="off"
        bind:value={giverNick}
        onfocus={() => giverDrop = giverNick.trim().length > 0}
        oninput={() => { giverSearch = giverNick; giverDrop = true; giverFocus = -1; }}
        onkeydown={giverKey}
        onblur={() => { setTimeout(() => giverDrop = false, 150); saveGiver(); }}
      />
      {#if giverDrop && giverMatches.length}
        <div class="dropdown show">
          {#each giverMatches as n, i}
            <div class="opt" class:focused={i === giverFocus} role="option" tabindex="0" aria-selected={i === giverFocus} onmousedown={(e) => { e.preventDefault(); pickGiver(n); }}>{n}</div>
          {/each}
        </div>
      {/if}
    </div>
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
  .input-wrap { position: relative; flex: 1; min-width: 160px; }
  .input-wrap input { width: 100%; padding: 7px 10px; border: 1px solid #e0e0e4; background: #fff; color: #1d1d1f; font: inherit; font-size: 13px; border-radius: 6px; }
  .input-wrap input:focus { outline: none; border-color: #86868b; }

  .dropdown {
    display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
    background: #fff; border: 1px solid #e0e0e4; border-radius: 6px;
    max-height: 180px; overflow-y: auto;
  }
  .dropdown.show { display: block; }
  .opt { padding: 7px 10px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #e0e0e4; }
  .opt:hover, .opt.focused { background: #e0e0e4; }
  .opt:last-child { border-bottom: 0; }

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
