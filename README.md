# nearbytes-skeleton

Protocol foundation: crypto + log + sync, reactive store, config, filesystem watcher, storage-root init.

## API

- **`createFilesystemSkeletonFromConfig(config)`** — init root, log, and `start(log, config.friends)`
- **`createFilesystemSkeleton(dataDir, friends?)`** — same without reading config file
- **`createSkeleton(log, friends)`** — wire crypto + sync to an existing `Log`
- **`readConfig`** — returns `NearbytesConfig` with required `friends` (may be `[]`)
- **`writable` / `derived`**, **`createFilesystemWatcher`**, **`initializeStorageRoot`**

## Config

```json
{
  "dataDir": "~/nearbytes/local",
  "volumes": [],
  "friends": ["<profile-public-key-hex>"]
}
```

## Example

```ts
import { readConfig, createFilesystemSkeletonFromConfig } from 'nearbytes-skeleton';

const config = await readConfig();
const skeleton = await createFilesystemSkeletonFromConfig(config);
// skeleton.crypto, skeleton.log, skeleton.sync
await skeleton.destroy();
```
