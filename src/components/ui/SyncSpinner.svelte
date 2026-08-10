<script>
  let { visible = false, error = '' } = $props();

  let showError = $state(false);
  let errorText = $state('');

  $effect(() => {
    if (error) { showError = true; errorText = error; setTimeout(() => showError = false, 5000); }
  });
</script>

{#if visible}
  <div class="sync-spinner" class:error={showError} role="status" aria-live="polite" aria-label={showError ? errorText : 'Идёт синхронизация с сервером'}>
    {showError ? errorText : 'Синхронизация...'}
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
