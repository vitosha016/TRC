<script>
  let { value = $bindable(), placeholder = '', id = '', onfocus, oninput, onkeydown, onblur } = $props();
</script>

<input
  {id}
  type="text"
  bind:value
  {placeholder}
  autocomplete="off"
  {onfocus}
  {oninput}
  {onkeydown}
  {onblur}
/>

<style>
  input {
    width: 100%; padding: 7px 10px; border: 1px solid #e0e0e4;
    background: #f5f5f7; color: #1d1d1f; font: inherit; font-size: 13px; border-radius: 6px;
  }
  input:focus { outline: none; border-color: #86868b; }
</style>
