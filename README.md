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

### Config-file permissions

`profiles[].secret` and `volumes[].secret` are stored in cleartext (they ARE the inputs to `crypto.deriveKeys`), so the config file is treated as a credential file:

- `writeConfig` always lands the file at POSIX mode `0o600` (owner read+write only), atomically via unique tmp + rename — even when overwriting an existing world-readable copy.
- `readConfig` (and the daemon's `readDaemonConfig`) `stat`s the file and throws `Config file <path> is group/world-accessible (mode 0NNN). Refusing to load …` if the mode has any group/world bits set or the file is not owned by your UID.

If you wrote the config by hand, fix it with:

```sh
chmod 600 ~/.nearbytes/config.json
```

The check is POSIX-only and no-ops on Windows.

## Example

```ts
import { readConfig, createFilesystemSkeletonFromConfig } from 'nearbytes-skeleton';

const config = await readConfig();
const skeleton = await createFilesystemSkeletonFromConfig(config);
// skeleton.crypto, skeleton.log, skeleton.sync
await skeleton.destroy();
```

## Daemon-aware boot

`bootSync` (and therefore `createSkeleton` / `createFilesystemSkeleton*`) probes the dataDir sync-singleton lock before calling `start()`. Two outcomes:

| State of `dataDir` | What you get back |
|---|---|
| No daemon active | Full `SyncHandle` — discovery joins, peer-loop, outbound block pump. The skeleton holds the sync-singleton lock until `destroy()`. |
| `nbsync` daemon already holding the lock | Writer-only `SyncHandle` stub — opens no swarm sockets, registers no peer-loop callbacks. Local writes go straight to `nearbytes-log`; the running daemon notices them via its filesystem watcher (DISC-27.4) and broadcasts `have` to peers on your behalf. |

This is what lets the `nbf` CLI run alongside a long-lived `nbsync` daemon against the same `dataDir` without IPC, lock contention, or duplicate peer-loop bookkeeping. See [`requirements/sync-discovery-v1.md`](https://github.com/nearbytes/nearbytes-specs/blob/main/requirements/sync-discovery-v1.md) DISC-27.1.

## Storage-root initialisation

`initializeStorageRoot(dataDir)` (called by every `createFilesystemSkeleton*` entrypoint) creates the standard layout (`blocks/`, `channels/`, `peer-id`) and reaps stale `*.tmp` scratch files left by crashed writers. The reaper uses a safety window long enough to never disturb a concurrent in-flight `link(2)` publish from another writer process.
