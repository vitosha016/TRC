<script>
  import { build, research, doApply, doDelete, nowSec } from '../lib/stores.js';
  import { formatSeconds } from '../lib/formulas.js';

  let { oncopy } = $props();

  let now = $state(nowSec());
  $effect(() => {
    const t = setInterval(() => { now = nowSec(); }, 60_000);
    return () => clearInterval(t);
  });

  function left(endAt) { return Math.max(0, endAt - now); }
</script>

{#if $build.length === 0 && $research.length === 0}
  <div class="empty">Очередь пуста. Добавьте первого участника.</div>
{/if}

{#if $build.length}
  <div class="section">
    <div class="section-title">🪚 Стройка <span class="cnt">{$build.length}</span></div>
    <table>
      <thead><tr><th>#</th><th>Игрок</th><th>Тип · boost</th><th>Осталось</th><th>%</th><th>Экономия</th><th>Выдано</th><th></th><th>Действия</th></tr></thead>
      <tbody>
      {#each $build as e, i}
        {@const l = left(e.endAt)}
        <tr class:fire={e.queueFire}>
          <td class="rank">{e.queueFire ? '!' : i + 1}</td>
          <td class="name">{e.queueFire ? '🔥 ' : ''}{e.nick}</td>
          <td class="info">Стройка{e.appliedCount ? ` [${e.appliedCount}/14]` : ''} · ×1.1</td>
          <td class="time">{formatSeconds(l)}</td>
          <td class="pct">{e.buff}%</td>
          <td class="saving">{formatSeconds(e.saving)}</td>
          <td class="count">{e.applied}%<br>{e.appliedCount}/14</td>
          <td class="bar-cell">
            <div class="bar-wrap"><div class="bar-fill" style="width:{Math.max(5, Math.min(100, e.score))}%"></div></div>
          </td>
          <td class="act">
            {#each [5, 10, 15] as p}
              <button class="btn btn-small" onclick={() => doApply(e.id, p)}>{p}%</button>
            {/each}
            <button class="btn btn-small btn-danger" onclick={() => doDelete(e.id)}>✕</button>
          </td>
        </tr>
      {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if $research.length}
  <div class="section">
    <div class="section-title">🔬 Исследования <span class="cnt">{$research.length}</span></div>
    <table>
      <thead><tr><th>#</th><th>Игрок</th><th>Тип · boost</th><th>Осталось</th><th>%</th><th>Экономия</th><th>Выдано</th><th></th><th>Действия</th></tr></thead>
      <tbody>
      {#each $research as e, i}
        {@const l = left(e.endAt)}
        <tr class:fire={e.queueFire}>
          <td class="rank">{e.queueFire ? '!' : i + 1}</td>
          <td class="name">{e.queueFire ? '🔥 ' : ''}{e.nick}</td>
          <td class="info">Исследования{e.appliedCount ? ` [${e.appliedCount}/14]` : ''} · ×1.05</td>
          <td class="time">{formatSeconds(l)}</td>
          <td class="pct">{e.buff}%</td>
          <td class="saving">{formatSeconds(e.saving)}</td>
          <td class="count">{e.applied}%<br>{e.appliedCount}/14</td>
          <td class="bar-cell">
            <div class="bar-wrap"><div class="bar-fill" style="width:{Math.max(5, Math.min(100, e.score))}%"></div></div>
          </td>
          <td class="act">
            {#each [5, 10, 15] as p}
              <button class="btn btn-small" onclick={() => doApply(e.id, p)}>{p}%</button>
            {/each}
            <button class="btn btn-small btn-danger" onclick={() => doDelete(e.id)}>✕</button>
          </td>
        </tr>
      {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .section { margin-bottom: 24px; }
  .section-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .cnt { font-size: 12px; color: #86868b; font-weight: 400; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 6px 8px; color: #86868b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 2px solid #e0e0e4; }
  td { padding: 7px 8px; border-bottom: 1px solid #e0e0e4; vertical-align: middle; }

  tr.fire td { background: #fff4e6; }
  tr.fire td:first-child { border-left: 3px solid #e8590c; }

  .rank { width: 28px; text-align: center; font-weight: 700; color: #86868b; }
  tr.fire .rank { color: #e8590c; }
  .name { font-weight: 600; }
  .info { font-size: 12px; color: #86868b; }
  .time { white-space: nowrap; }
  .saving { text-align: right; white-space: nowrap; font-weight: 600; }
  .pct { text-align: center; }
  .count { text-align: center; white-space: nowrap; font-size: 12px; color: #86868b; }
  .bar-cell { width: 50px; }
  .bar-wrap { width: 100%; height: 3px; border-radius: 2px; background: #e0e0e4; }
  .bar-fill { height: 100%; border-radius: 2px; background: #86868b; }
  tr.fire .bar-fill { background: #e8590c; }

  .act { text-align: right; white-space: nowrap; }

  .btn {
    display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px;
    border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    border: 1px solid #e0e0e4; background: #fff; color: #1d1d1f;
    transition: all .12s; white-space: nowrap;
  }
  .btn:hover { background: #e0e0e4; }
  .btn-small { padding: 4px 8px; font-size: 11px; border-radius: 4px; }
  .btn-danger { color: #e03131; border-color: transparent; }
  .btn-danger:hover { background: rgba(224,49,49,.12); }

  .empty { text-align: center; padding: 24px; color: #86868b; }

  @media (max-width: 600px) {
    th, td { padding: 5px 4px; font-size: 11px; }
    .btn-small { padding: 3px 6px; font-size: 10px; }
  }
</style>
