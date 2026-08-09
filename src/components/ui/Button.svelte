<script>
  let { variant = '', onclick, type = 'button', disabled = false, title = '', children } = $props();

  let variants = $derived(variant.split(' ').filter(Boolean));
  let isMain = $derived(variants.includes('main'));
  let isDanger = $derived(variants.includes('danger'));
  let isSmall = $derived(variants.includes('small'));
</script>

<button
  class="btn"
  class:main={isMain}
  class:danger={isDanger}
  class:small={isSmall}
  {type}
  {disabled}
  {onclick}
  aria-label={title || undefined}
  {title}
>
  {@render children?.()}
</button>

<style>
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 5px;
    padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    border: 1px solid #e0e0e4; background: #fff; color: #1d1d1f;
    transition: all .12s; white-space: nowrap; flex-shrink: 0;
    font-family: inherit; line-height: 1.5;
  }
  .btn:hover { background: #e0e0e4; }
  .btn:active { background: #d0d0d5; transform: scale(.98); }
  .btn:focus-visible { outline: 2px solid #4263eb; outline-offset: 1px; }
  .btn:disabled { opacity: .5; cursor: default; transform: none; }
  .btn:disabled:active { background: #fff; transform: none; }

  .main { background: #1d1d1f; color: #f5f5f7; border-color: #1d1d1f; }
  .main:hover { opacity: .85; background: #1d1d1f; }
  .main:active { opacity: .75; background: #1d1d1f; transform: scale(.98); }

  .danger { color: #e03131; border-color: transparent; }
  .danger:hover { background: rgba(224,49,49,.12); }
  .danger:active { background: rgba(224,49,49,.2); transform: scale(.98); }

  .small { padding: 3px 7px; font-size: 11px; border-radius: 4px; }
</style>
