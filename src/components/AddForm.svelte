<script>
  import { doAdd, nickList } from '../lib/stores.js';

  let nick = $state('');
  let type = $state('Стройка');
  let pct  = $state(0);
  let days = $state(0);
  let hours = $state(0);
  let editId = $state('');
  let submitting = $state(false);

  let searching = $state('');
  let showDrop = $state(false);
  let matches = $derived(
    searching ? $nickList.filter(n => n.toLowerCase().includes(searching.toLowerCase())).slice(0, 10) : []
  );

  function pick(n) { nick = n; showDrop = false; }

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    submitting = true;
    await doAdd(nick, type, pct, days, hours, editId);
    nick = ''; pct = 0; days = 0; hours = 0; editId = '';
    submitting = false;
  }

  // Дни 0..60, Часы 0..23
  let dayOps = Array.from({length: 61}, (_, i) => i);
  let hourOps = Array.from({length: 24}, (_, i) => i);
</script>

<div class="add-form">
  <form onsubmit={submit} autocomplete="off">
    <div class="row">
      <div class="field-nick">
        <label for="nickInput">Ник</label>
        <div class="input-wrap">
          <input id="nickInput" bind:value={nick} placeholder="Имя игрока" required
            onfocus={() => showDrop = nick.trim().length > 0}
            oninput={() => { searching = nick; showDrop = true; }}
            onblur={() => setTimeout(() => showDrop = false, 150)} />
          {#if showDrop && matches.length}
            <div class="dropdown show">
              {#each matches as n}
                <div class="opt" role="button" tabindex="0" onmousedown={(e) => { e.preventDefault(); pick(n); }}><strong>{n}</strong></div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="field-type">
        <label for="typeSelect">Тип</label>
        <select id="typeSelect" bind:value={type}>
          <option value="Стройка">Стройка</option>
          <option value="Исследования">Исследования</option>
        </select>
      </div>

      <div class="field-pct">
        <label for="pctInput">%</label>
        <input id="pctInput" type="number" bind:value={pct} min="0" max="100" />
      </div>

      <div class="field-days">
        <label for="daysSelect">Дней</label>
        <select id="daysSelect" bind:value={days}>
          {#each dayOps as d}
            <option value={d}>{d} дн.</option>
          {/each}
        </select>
      </div>

      <div class="field-hours">
        <label for="hoursSelect">Часов</label>
        <select id="hoursSelect" bind:value={hours}>
          {#each hourOps as h}
            <option value={h}>{h} ч.</option>
          {/each}
        </select>
      </div>

      <div class="field-btn">
        <input type="hidden" bind:value={editId} />
        <button class="btn btn-main" type="submit" disabled={submitting}>
          {submitting ? '...' : editId ? 'Обновить' : 'Добавить'}
        </button>
      </div>
    </div>
  </form>
</div>

<style>
  .add-form { background: #fff; border: 1px solid #e0e0e4; padding: 14px; margin-bottom: 16px; }
  .row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
  .field-nick { flex: 1; min-width: 120px; }
  .field-type { width: 144px; flex-shrink: 0; }
  .field-pct  { width: 64px; flex-shrink: 0; }
  .field-days { width: 82px; flex-shrink: 0; }
  .field-hours{ width: 82px; flex-shrink: 0; }
  .field-btn  { width: 110px; flex-shrink: 0; }

  label { font-size: 11px; font-weight: 600; color: #86868b; text-transform: uppercase; letter-spacing: .3px; display: block; margin-bottom: 3px; }
  input, select { width: 100%; padding: 7px 8px; border: 1px solid #e0e0e4; background: #f5f5f7; color: #1d1d1f; font: inherit; font-size: 13px; border-radius: 6px; }
  select { appearance: none; padding-right: 24px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 6px center; }
  input:focus, select:focus { outline: none; border-color: #86868b; }

  .input-wrap { position: relative; }
  .input-wrap input { width: 100%; }
  .dropdown {
    display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
    background: #fff; border: 1px solid #e0e0e4; border-radius: 6px;
    max-height: 180px; overflow-y: auto;
  }
  .dropdown.show { display: block; }
  .opt { padding: 7px 10px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #e0e0e4; }
  .opt:hover { background: #e0e0e4; }
  .opt:last-child { border-bottom: 0; }

  .btn {
    display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px;
    border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    border: 1px solid #e0e0e4; background: #fff; color: #1d1d1f;
    transition: all .12s; white-space: nowrap; width: 100%;
  }
  .btn:hover { background: #e0e0e4; }
  .btn-main { background: #1d1d1f; color: #f5f5f7; border-color: #1d1d1f; }
  .btn-main:hover { opacity: .85; }

  @media (max-width: 600px) {
    .row { flex-direction: column; }
    .row > * { min-width: 100% !important; }
  }
</style>
