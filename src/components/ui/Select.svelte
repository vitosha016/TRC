<script>
  let { value = $bindable(), id = '', options = [], klass = '', children } = $props();
</script>

<select {id} bind:value class={klass}>
  {#if children}
    {@render children()}
  {:else}
    {#each options as opt}
      <option value={opt.value ?? opt}>{opt.label ?? opt}</option>
    {/each}
  {/if}
</select>

<style>
  select {
    width: 100%; padding: 7px 8px; border: 1px solid #e0e0e4;
    background: #f5f5f7; color: #1d1d1f; font: inherit; font-size: 13px; border-radius: 6px;
    appearance: none; padding-right: 24px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 6px center;
  }
  select:focus { outline: none; border-color: #86868b; }
</style>
