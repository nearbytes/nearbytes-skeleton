# nearbytes-skeleton

Protocol foundation: crypto + log + sync, reactive store, config, filesystem watcher, storage-root init.

## API

- **`createFilesystemSkeletonFromConfig(config)`** — init root, log, and `start(log, config.friends, { profiles, activeProfile })`
- **`createFilesystemSkeleton(dataDir, friends?, spec?)`** — same without reading config file (`spec = { profiles, activeProfile }`)
- **`createSkeleton(log, friends, spec)`** — wire crypto + sync to an existing `Log`
- **`readConfig`** — returns `NearbytesConfig` with required `friends`, `profiles`, `activeProfile`
- **`writable` / `derived`**, **`createFilesystemWatcher`**, **`initializeStorageRoot`**

## Config

```json
{
  "dataDir": "~/nearbytes/local",
  "volumes": [],
  "friends": ["<friend-profile-public-key-hex>"],
  "profiles": [
    { "name": "alice", "secret": "alice:hunter2" },
    { "name": "work",  "secret": "work:s3cr3t" }
  ],
  "activeProfile": "alice"
}
```

A node MAY serve $K \ge 0$ local profiles simultaneously (see `requirements/sync-protocol-v1.md` SYNC-00). Sync keeps syncing **all** profiles; the active profile is the one used to sign `profile publish` and as the follower identity for outbound dials. The legacy `profileSecret: string` field is migrated in-place to `[{ name: "default", secret: profileSecret }]` on first read.

## Example

```ts
import { readConfig, createFilesystemSkeletonFromConfig } from 'nearbytes-skeleton';

const config = await readConfig();
const skeleton = await createFilesystemSkeletonFromConfig(config);
// skeleton.crypto, skeleton.log, skeleton.sync
await skeleton.destroy();
```
