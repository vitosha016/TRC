<script>
  let { variant = '', onclick, type = 'button', disabled = false, title = '', children } = $props();

  let variants = $derived(variant.split(' ').filter(Boolean));
  let isMain = $derived(variants.includes('main'));
  let isDanger = $derived(variants.includes('danger'));
  let isSmall = $derived(variants.includes('small'));
  let isInvert = $derived(variants.includes('invert'));
  let isFull = $derived(variants.includes('full'));
  let extra = $derived(variants.filter(v => !['main','danger','small','invert','full'].includes(v)).join(' '));
</script>

<button
  class={['btn', extra].filter(Boolean).join(' ')}
  class:main={isMain}
  class:danger={isDanger}
  class:small={isSmall}
  class:invert={isInvert}
  class:full={isFull}
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
    display: inline-flex; align-items: center; justify-content: center; gap: 4px;
    padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    border: 1px solid #e0e0e4; background: #fff; color: #1d1d1f;
    transition: all .12s; white-space: nowrap; flex-shrink: 0;
    font-family: inherit; line-height: 1.5;
  }
  .btn:hover { background: #e0e0e4; }
  .btn:active { background: #e8e8ed; transform: scale(.98); }
  .btn:focus-visible { outline: 2px solid #4263eb; outline-offset: 1px; }
  .btn:disabled { opacity: .5; cursor: default; transform: none; }
  .btn:disabled:active { background: #fff; transform: none; }

  .main { background: #f5f5f7; color: #1d1d1f; border-color: #e0e0e4; }
  .main:hover { background: #e8e8ed; border-color: #86868b; }

  .danger { color: #e03131; border-color: #e0e0e4; }
  .danger:hover { background: rgba(224,49,49,.08); border-color: #e03131; }

  .small { padding: 4px 8px; font-size: 11px; border-radius: 4px; }
  .invert { background: #1d1d1f; color: #fff; border-color: #1d1d1f; }
  .invert:hover { opacity: .85; background: #1d1d1f; }
  .pct5 { background: #fff; }
  .pct10 { background: #f5f5f7; }
  .pct15 { background: #e8e8ed; }
  .full { width: 100%; display: flex; }
</style>
