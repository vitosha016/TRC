<script>
  import { doAdd, nickList } from '../lib/stores.js';

  let { giverNick = $bindable(), onsavegiver = () => {} } = $props();

  let nick = $state('');
  let type = $state('Стройка');
  let days = $state(0);
  let hours = $state(0);
  let editId = $state('');
  let submitting = $state(false);

  let nickSearch = $state('');
  let nickDrop = $state(false);
  let nickFocus = $state(-1);
  let nickMatches = $derived(
    nickSearch ? $nickList.filter(n => n.toLowerCase().includes(nickSearch.toLowerCase())).slice(0, 10) : []
  );

  let giverSearch = $state('');
  let giverDrop = $state(false);
  let giverFocus = $state(-1);
  let giverMatches = $derived(
    giverSearch ? $nickList.filter(n => n.toLowerCase().includes(giverSearch.toLowerCase())).slice(0, 8) : []
  );

  function nickPick(n) { nick = n; nickDrop = false; nickFocus = -1; }
  function giverPick(n) { giverNick = n; giverDrop = false; giverFocus = -1; onsavegiver(); }

  function nickKey(e) {
    if (!nickDrop || !nickMatches.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); nickFocus = (nickFocus + 1) % nickMatches.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nickFocus = (nickFocus - 1 + nickMatches.length) % nickMatches.length; }
    else if (e.key === 'Enter' && nickFocus >= 0) { e.preventDefault(); nickPick(nickMatches[nickFocus]); }
    else if (e.key === 'Escape') { nickDrop = false; nickFocus = -1; }
    else { nickFocus = -1; }
  }

  function giverKey(e) {
    if (!giverDrop || !giverMatches.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); giverFocus = (giverFocus + 1) % giverMatches.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); giverFocus = (giverFocus - 1 + giverMatches.length) % giverMatches.length; }
    else if (e.key === 'Enter' && giverFocus >= 0) { e.preventDefault(); giverPick(giverMatches[giverFocus]); }
    else if (e.key === 'Escape') { giverDrop = false; giverFocus = -1; }
    else { giverFocus = -1; }
  }

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    if (days === 0 && hours === 0) { alert('Укажи дни или часы'); return; }
    submitting = true;
    await doAdd(nick, type, days, hours, editId);
    nick = ''; days = 0; hours = 0; editId = '';
    submitting = false;
  }

  let dayOps = Array.from({length: 61}, (_, i) => i);
  let hourOps = Array.from({length: 24}, (_, i) => i);
</script>

<div class="card">
  <form onsubmit={submit} autocomplete="off">
    <div class="row">
      <div class="field-nick">
        <div class="input-wrap">
          <input placeholder="Ник игрока" required
            bind:value={nick}
            onfocus={() => nickDrop = nick.trim().length > 0}
            oninput={() => { nickSearch = nick; nickDrop = true; nickFocus = -1; }}
            onkeydown={nickKey}
            onblur={() => setTimeout(() => nickDrop = false, 150)} />
          {#if nickDrop && nickMatches.length}
            <div class="dropdown show">
              {#each nickMatches as n, i}
                <div class="opt" class:focused={i === nickFocus} role="option" tabindex="0" aria-selected={i === nickFocus} onmousedown={(e) => { e.preventDefault(); nickPick(n); }}>{n}</div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <select class="field-type" bind:value={type}>
        <option value="Стройка">🪚 Стройка</option>
        <option value="Исследования">🔬 Исследования</option>
      </select>

      <select class="field-num" bind:value={days}>
        {#each dayOps as d}
          <option value={d}>{d} дн.</option>
        {/each}
      </select>

      <select class="field-num" bind:value={hours}>
        {#each hourOps as h}
          <option value={h}>{h} ч.</option>
        {/each}
      </select>

      <input type="hidden" bind:value={editId} />
      <button class="btn btn-main" type="submit" disabled={submitting}>
        {submitting ? '...' : editId ? 'Обновить' : 'Добавить'}
      </button>
    </div>

    <div class="row giver-row">
      <div class="input-wrap giver-wrap">
        <span class="giver-label">кто раздаёт</span>
        <input
          placeholder="Ваш ник"
          bind:value={giverNick}
          onfocus={() => giverDrop = giverNick.trim().length > 0}
          oninput={() => { giverSearch = giverNick; giverDrop = true; giverFocus = -1; }}
          onkeydown={giverKey}
          onblur={() => { setTimeout(() => giverDrop = false, 150); onsavegiver(); }}
        />
        {#if giverDrop && giverMatches.length}
          <div class="dropdown show">
            {#each giverMatches as n, i}
              <div class="opt" class:focused={i === giverFocus} role="option" tabindex="0" aria-selected={i === giverFocus} onmousedown={(e) => { e.preventDefault(); giverPick(n); }}>{n}</div>
            {/each}
          </div>
        {/if}
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
  .field-type { width: 160px; flex-shrink: 0; }
  .field-num  { width: 80px; flex-shrink: 0; }

  .giver-wrap { max-width: 300px; display: flex; align-items: center; gap: 8px; }
  .giver-label { font-size: 11px; color: #86868b; white-space: nowrap; flex-shrink: 0; }

  .input-wrap { position: relative; }
  .input-wrap input { width: 100%; padding: 7px 10px; border: 1px solid #e0e0e4; background: #f5f5f7; color: #1d1d1f; font: inherit; font-size: 13px; border-radius: 6px; }
  .input-wrap input:focus { outline: none; border-color: #86868b; }

  select { padding: 7px 8px; border: 1px solid #e0e0e4; background: #f5f5f7; color: #1d1d1f; font: inherit; font-size: 13px; border-radius: 6px; appearance: none; padding-right: 24px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 6px center;
  }
  select:focus { outline: none; border-color: #86868b; }

  .dropdown {
    display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
    background: #fff; border: 1px solid #e0e0e4; border-radius: 6px;
    max-height: 180px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,.08);
  }
  .dropdown.show { display: block; }
  .opt { padding: 7px 10px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #e0e0e4; }
  .opt:hover, .opt.focused { background: #e0e0e4; }
  .opt:last-child { border-bottom: 0; }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 5px;
    padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    border: 1px solid #e0e0e4; background: #fff; color: #1d1d1f;
    transition: all .12s; white-space: nowrap; flex-shrink: 0;
  }
  .btn:hover { background: #e0e0e4; }
  .btn-main { background: #1d1d1f; color: #f5f5f7; border-color: #1d1d1f; }
  .btn-main:hover { opacity: .85; }
  .btn:disabled { opacity: .5; cursor: default; }

  @media (max-width: 700px) {
    .row { flex-direction: column; }
    .row > * { width: 100% !important; }
    .giver-wrap { max-width: 100%; }
    .btn { width: 100%; }
  }
</style>
