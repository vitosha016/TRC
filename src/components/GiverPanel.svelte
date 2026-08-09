<script>
  import { nickList, givers } from '../utils/stores.js';
  import Suggest from './ui/Suggest.svelte';
  import Card from './ui/Card.svelte';
  import { nowSec, formatSeconds } from '../utils/formulas.js';

  let { giverNick = $bindable(), onsavegiver = () => {} } = $props();

  let donors = $derived(
    Object.entries($givers)
      .map(([n, d]) => ({ nick: n, total: Number(d.total || 0), last: Number(d.last_buff || 0) }))
      .sort((a, b) => b.total - a.total || a.nick.localeCompare(a.nick, 'ru'))
  );
  let now = $state(nowSec());
  const cd = 259200;
  const medals = ['🥇', '🥈', '🥉'];
  $effect(() => { const t = setInterval(() => now = nowSec(), 60_000); return () => clearInterval(t); });
</script>

<Card>
  <div class="giver-row">
    <span class="label">Кто наложил баф</span>
    <Suggest bind:value={giverNick} items={$nickList} placeholder="Ник игрока" onsave={onsavegiver} />
  </div>

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
  {:else}
    <div class="empty">Нет баферов</div>
  {/if}
</Card>

<style>
  .label { display: block; font-size: 11px; color: #86868b; margin-bottom: 4px; }
  .giver-row { margin-bottom: 12px; }

  .donors {
    display: flex; flex-direction: row; flex-wrap: nowrap; gap: 6px;
    overflow-x: auto; padding-bottom: 4px;
  }
  .donor-chip {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; padding: 4px 8px;     border-radius: 6px;
    background: #f5f5f7; border: 1px solid #e0e0e4;
    white-space: nowrap; flex-shrink: 0;
  }
  .d-nick { font-weight: 600; }
  .d-total { color: #86868b; margin-left: auto; }
  .d-cd { color: #e8590c; font-size: 11px; }
  .d-ok { color: #2b8a3e; font-size: 11px; }
  .empty { text-align: center; font-size: 12px; color: #86868b; padding: 16px 0; }
</style>
