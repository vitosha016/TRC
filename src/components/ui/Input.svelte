<script>
  let {
    value = $bindable(), placeholder = '', label = '',
    id = '', onfocus, oninput, onkeydown, onblur,
    role = '', ariaExpanded = undefined, ariaControls = '', ariaActiveDescendant = '',
  } = $props();

  let cid = $derived(id || 'i_' + Math.random().toString(36).slice(2, 8));
</script>

{#if label}
  <label for={cid}>{label}</label>
{/if}
<input
  id={cid}
  type="text"
  bind:value
  {placeholder}
  aria-label={!label ? placeholder : undefined}
  role={role || undefined}
  aria-expanded={ariaExpanded}
  aria-controls={ariaControls || undefined}
  aria-activedescendant={ariaActiveDescendant || undefined}
  autocomplete="off"
  {onfocus}
  {oninput}
  {onkeydown}
  {onblur}
/>

<style>
  label {
    display: block; font-size: 11px; font-weight: 600; color: #86868b;
    text-transform: uppercase; letter-spacing: .3px; margin-bottom: 3px;
  }
  input {
    width: 100%; padding: 7px 10px; border: 1px solid #e0e0e4;
    background: #f5f5f7; color: #1d1d1f; font: inherit; font-size: 13px; border-radius: 6px;
  }
  input:focus { outline: none; border-color: #86868b; }
</style>
