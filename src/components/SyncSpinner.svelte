<script>
  import { syncing } from '../lib/stores.js';
</script>

{#if $syncing > 0}
  <div class="sync-spinner">Синхронизация...</div>
{/if}

<style>
  .sync-spinner {
    position: fixed; bottom: 12px; right: 16px; z-index: 99;
    background: #1d1d1f; color: #f5f5f7; font-size: 11px;
    padding: 5px 12px 5px 26px; border-radius: 6px;
    pointer-events: none;
  }
  .sync-spinner::before {
    content: ''; position: absolute; left: 8px; top: 50%; margin-top: -5px;
    width: 10px; height: 10px; border: 2px solid transparent;
    border-top-color: #f5f5f7; border-radius: 50%;
    animation: spin .6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
