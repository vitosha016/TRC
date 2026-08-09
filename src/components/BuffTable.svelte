<script>
  import { build, research, doApply, doDelete, nowSec } from '../utils/stores.js';
  import { formatSeconds } from '../utils/formulas.js';
  import Button from './ui/Button.svelte';

  let { giverNick = '', onedit = (id) => {} } = $props();

  let now = $state(nowSec());
  $effect(() => {
    const t = setInterval(() => { now = nowSec(); }, 60_000);
    return () => clearInterval(t);
  });

  function left(endAt) { return Math.max(0, endAt - now); }
</script>

{#if $build.length === 0 && $research.length === 0}
  <div class="empty" role="status">Очередь пуста. Добавьте первого участника.</div>
{/if}

<div class="grid">
  {#if $build.length}
    <div class="card">
      <div class="card-title">🪚 Стройка <span class="cnt">{$build.length}</span></div>
      <table>
        <thead><tr><th scope="col">#</th><th scope="col">Игрок</th><th scope="col">Осталось</th><th scope="col">Экономия</th><th scope="col">Выдано</th><th scope="col" class="th-act">Действия</th></tr></thead>
        <tbody>
        {#each $build as e, i}
          {@const l = left(e.endAt)}
          <tr class:fire={e.queueFire}>
            <td class="rank">{e.queueFire ? '!' : i + 1}</td>
            <td class="name">{e.queueFire ? '🔥 ' : ''}{e.nick}</td>
            <td class="time">{formatSeconds(l)}</td>
            <td class="saving">{formatSeconds(e.saving)}</td>
            <td class="count">{e.applied}%<br>{e.appliedCount}/14</td>
            <td class="act">
              {#each [5, 10, 15] as p}
                <Button variant="small" onclick={() => doApply(e.id, p, giverNick)} title="Ускорить {e.nick} на {p}%">{p}%</Button>
              {/each}
              <Button variant="small" onclick={() => onedit(e.id)} title="Редактировать {e.nick}">✎</Button>
              <Button variant="danger small" onclick={() => doDelete(e.id)} title="Удалить {e.nick}">✕</Button>
            </td>
          </tr>
        {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if $research.length}
    <div class="card">
      <div class="card-title">🔬 Исследования <span class="cnt">{$research.length}</span></div>
      <table>
        <thead><tr><th scope="col">#</th><th scope="col">Игрок</th><th scope="col">Осталось</th><th scope="col">Экономия</th><th scope="col">Выдано</th><th scope="col" class="th-act">Действия</th></tr></thead>
        <tbody>
        {#each $research as e, i}
          {@const l = left(e.endAt)}
          <tr class:fire={e.queueFire}>
            <td class="rank">{e.queueFire ? '!' : i + 1}</td>
            <td class="name">{e.queueFire ? '🔥 ' : ''}{e.nick}</td>
            <td class="time">{formatSeconds(l)}</td>
            <td class="saving">{formatSeconds(e.saving)}</td>
            <td class="count">{e.applied}%<br>{e.appliedCount}/14</td>
            <td class="act">
              {#each [5, 10, 15] as p}
                <Button variant="small" onclick={() => doApply(e.id, p, giverNick)} title="Ускорить {e.nick} на {p}%">{p}%</Button>
              {/each}
              <Button variant="small" onclick={() => onedit(e.id)} title="Редактировать {e.nick}">✎</Button>
              <Button variant="danger small" onclick={() => doDelete(e.id)} title="Удалить {e.nick}">✕</Button>
            </td>
          </tr>
        {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  @media (max-width: 900px) {
    .grid { grid-template-columns: 1fr; }
  }

  .card {
    background: #fff; border: 1px solid #e0e0e4;
    border-radius: 10px; padding: 14px 16px; overflow-x: auto;
  }

  .card-title { font-size: 15px; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
  .cnt { font-size: 12px; color: #86868b; font-weight: 400; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 5px 6px; color: #86868b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 2px solid #e0e0e4; }
  td { padding: 6px; border-bottom: 1px solid #e0e0e4; vertical-align: middle; }
  .th-act { text-align: right; }

  tr.fire td { background: #fff4e6; }
  tr.fire td:first-child { border-left: 3px solid #e8590c; }

  .rank { width: 24px; text-align: center; font-weight: 700; color: #86868b; }
  tr.fire .rank { color: #e8590c; }
  .name { font-weight: 600; }
  .time { white-space: nowrap; }
  .saving { text-align: right; white-space: nowrap; font-weight: 600; }
  .count { text-align: center; white-space: nowrap; font-size: 11px; color: #86868b; }

  .act { text-align: right; white-space: nowrap; }

  .empty { text-align: center; padding: 40px; color: #86868b; grid-column: 1 / -1; }
</style>
