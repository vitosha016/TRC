<script>
  import { givers } from '../utils/stores.js';
  import { nowSec, formatSeconds } from '../utils/formulas.js';

  let donors = $derived(
    Object.entries($givers)
      .map(([n, d]) => ({
        nick: n,
        total: Number(d.total || 0),
        last: Number(d.last_buff || 0),
      }))
      .sort((a, b) => b.total - a.total || a.nick.localeCompare(b.nick, 'ru'))
  );

  let now = $state(nowSec());
  const cd = 259200;
  const medals = ['🥇', '🥈', '🥉'];

  $effect(() => {
    const t = setInterval(() => { now = nowSec(); }, 60_000);
    return () => clearInterval(t);
  });
</script>

{#if donors.length}
  <div class="donors">
    {#each donors.slice(0, 8) as g, i}
      {@const left = Math.max(0, cd - (now - g.last))}
      <div class="donor-chip">
        <span>{medals[i] || '🎖️'}</span>
        <span class="d-nick">{g.nick}</span>
        <span class="d-total">{g.total} б.</span>
        <span class={left ? 'd-cd' : 'd-ok'}>{left ? formatSeconds(left) : 'готов'}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .donors { margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap; }
  .donor-chip {
    background: #fff; border: 1px solid #e0e0e4; border-radius: 8px;
    padding: 8px; font-size: 12px; display: flex; align-items: center; gap: 8px;
  }
  .d-nick { font-weight: 600; }
  .d-total { color: #86868b; }
  .d-cd { color: #e8590c; font-size: 11px; }
  .d-ok { color: #2b8a3e; font-size: 11px; }
</style>
