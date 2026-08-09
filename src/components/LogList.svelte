<script>
  import { history } from '../utils/stores.js';

  let items = $derived([...$history].sort((a, b) => b.time - a.time).slice(0, 50));

  function dt(t) {
    const d = new Date(t * 1000);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
      + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
</script>

<details class="log" open={items.length > 0 && items.length < 5}>
  <summary>История транзакций</summary>
  {#if items.length === 0}
    <div class="empty">Пока транзакций нет</div>
  {:else}
    <table>
      <thead><tr><th>Время</th><th>От кого</th><th>Кому</th><th>Тип</th><th>%</th></tr></thead>
      <tbody>
      {#each items as h}
        <tr>
          <td class="l-time">{dt(h.time)}</td>
          <td class="l-giver">{h.giver}</td>
          <td>{h.recipient}</td>
          <td class="l-type">{h.type}</td>
          <td class="l-pct">{h.percent}%</td>
        </tr>
      {/each}
      </tbody>
    </table>
  {/if}
</details>

<style>
  .log { margin-bottom: 16px; }
  .log summary { font-size: 13px; font-weight: 600; color: #86868b; cursor: pointer; padding: 6px 0; user-select: none; }
  .log table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .log th { text-align: left; padding: 4px 8px; color: #86868b; font-size: 10px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e0e0e4; }
  .log td { padding: 4px 8px; border-bottom: 1px solid #e0e0e4; }
  .l-giver { font-weight: 600; }
  .l-pct { color: #4263eb; font-weight: 600; }
  .l-time { white-space: nowrap; font-size: 11px; color: #86868b; }
  .l-type { font-size: 11px; color: #86868b; }
  .empty { text-align: center; padding: 24px; color: #86868b; }
</style>
