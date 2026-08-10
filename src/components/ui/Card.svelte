<script>
  let { children, title = '' } = $props();
</script>

<div class="card">
  {#if title}
    <div class="card-label">{title}</div>
  {/if}
  {@render children?.()}
</div>

<style>
  .card {
    background: #fff; border: 1px solid #e0e0e4;
    border-radius: 10px;     padding: 12px 16px;
    min-width: 0;
  }
  .card-label {
    display: block; font-size: 11px; color: #86868b;
    margin-bottom: 4px;
  }
</style>
