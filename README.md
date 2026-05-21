# nearbytes-skeleton

Protocol foundation: crypto + log, reactive store, config, filesystem watcher, storage-root init.

## API

- **`createSkeleton(log)`** — wire crypto to an existing `Log`
- **`createFilesystemSkeleton(dataDir)`** — init root + filesystem log
- **`writable` / `derived`** — Svelte-store-compatible primitives (no Svelte dependency)
- **`readConfig`**, **`initializeStorageRoot`**, **`createFilesystemWatcher`**

## Example

```ts
import { createFilesystemSkeleton } from 'nearbytes-skeleton';

const skeleton = await createFilesystemSkeleton('/path/to/data');
// skeleton.crypto, skeleton.log
```
