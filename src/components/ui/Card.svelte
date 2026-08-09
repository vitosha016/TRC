<script>
  let { children } = $props();
</script>

<div class="card">
  {@render children?.()}
</div>

<style>
  .card {
    background: #fff; border: 1px solid #e0e0e4;
    border-radius: 10px; padding: 14px 16px;
    min-width: 0; overflow-y: auto;
  }
</style>
