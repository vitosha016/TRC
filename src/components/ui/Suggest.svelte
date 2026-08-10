<script>
  import Input from './Input.svelte';

  let { value = $bindable(), items = [], placeholder = '', label = '', id = '', onpick, onsave } = $props();

  let cid = $derived(id || 'sg_' + Math.random().toString(36).slice(2, 8));
  let listId = $derived(cid + '_list');

  let searching = $state('');
  let open = $state(false);
  let focusing = $state(-1);
  let matches = $derived(
    searching
      ? items.filter(i => i.toLowerCase().includes(searching.toLowerCase())).slice(0, 10)
      : []
  );

  function pick(n) { value = n; open = false; focusing = -1; onpick?.(n); }

  let actId = $derived(focusing >= 0 && focusing < matches.length ? listId + '_' + focusing : '');

  function onKey(e) {
    if (!open || !matches.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); focusing = (focusing + 1) % matches.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusing = (focusing - 1 + matches.length) % matches.length; }
    else if (e.key === 'Enter' && focusing >= 0) { e.preventDefault(); pick(matches[focusing]); }
    else if (e.key === 'Escape') { open = false; focusing = -1; }
    else { focusing = -1; }
  }
</script>

<div class="wrap">
  <Input
    id={cid}
    {label}
    role="combobox"
    bind:value
    {placeholder}
    ariaExpanded={open}
    ariaControls={open ? listId : ''}
    ariaActiveDescendant={open ? actId : ''}
    onfocus={() => { if (items.length) open = true; }}
    oninput={() => { searching = value; open = true; focusing = -1; }}
    onkeydown={onKey}
    onblur={() => { setTimeout(() => open = false, 150); onsave?.(); }}
  />
  {#if open && matches.length}
    <div class="dropdown show" id={listId} role="listbox">
      {#each matches as n, i}
        <div
          class="opt" class:focused={i === focusing}
          id={listId + '_' + i}
          role="option" tabindex="0"
          aria-selected={i === focusing}
          onmousedown={(e) => { e.preventDefault(); pick(n); }}
        >{n}</div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .wrap { position: relative; }
  .dropdown {
    display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
    background: #fff; border: 1px solid #e0e0e4; border-radius: 6px;
    max-height: 180px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,.08);
  }
  .dropdown.show { display: block; }
  .opt { padding: 7px 10px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #e0e0e4; }
  .opt:hover, .opt.focused { background: #e0e0e4; }
  .opt:last-child { border-bottom: 0; }
</style>
