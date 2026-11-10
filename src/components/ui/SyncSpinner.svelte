<script>
  let { visible = false, error = '' } = $props();
</script>

{#if visible || error}
  <div
    class="sync-spinner"
    class:error={!!error}
    role="status"
    aria-live="polite"
    aria-label={error || 'Идёт синхронизация с сервером'}
  >
    {error || 'Синхронизация...'}
  </div>
{/if}

<style>
  .sync-spinner {
    position: fixed; bottom: 12px; right: 16px; z-index: 99;
    display: flex; align-items: center; gap: 8px;
    background: #1d1d1f; color: #fff; font-size: 11px;
    padding: 4px 12px; border-radius: 6px;
    pointer-events: none; white-space: nowrap;
  }
  .sync-spinner::before {
    content: ''; flex-shrink: 0;
    width: 10px; height: 10px; border: 2px solid transparent;
    border-top-color: #fff; border-radius: 50%;
    animation: spin .6s linear infinite;
  }
  .sync-spinner.error { background: #e03131; }
  .sync-spinner.error::before { border-top-color: #fff; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
