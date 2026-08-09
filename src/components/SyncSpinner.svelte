<script>
  import SyncSpinner from './ui/SyncSpinner.svelte';
  import { syncing } from '../lib/stores.js';
</script>

<SyncSpinner visible={$syncing > 0} />
