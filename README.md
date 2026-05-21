# nearbytes-skeleton

Protocol foundation layer for Nearbytes: wires a storage backend into a crypto
+ log pair, and provides the generic reactive-store primitives, config,
filesystem watcher, and storage-root initialisation shared by higher layers.

**Future scope:** inter-device routing and sync coordination will be added here.
Higher-level concerns (file storage, CLI) live in `nearbytes-files`.

## What's inside

- **`createSkeleton(storage)`** — returns `{ crypto: CryptoOperations, log: Log }`; the starting point for any Nearbytes application
- **`writable(initial)` / `derived(source, fn)`** — minimal framework-agnostic reactive store (Svelte-store-compatible)
- **`createFilesystemWatcher(dataDir, refreshable)`** — debounced `fs.watch` that calls `.refresh()` on any change (Node.js only; no-op in browser)
- **`initializeStorageRoot(dataDir)`** — creates `blocks/` and `channels/`, writes `Nearbytes.html`, removes obsolete `Nearbytes.json`
- **`readConfig(path?)`** — loads `~/.nearbytes/config.json`; respects `NEARBYTES_CONFIG` and `NEARBYTES_STORAGE_DIR` env vars

## Install

```sh
yarn add nearbytes/nearbytes-skeleton#main
```

## Quick start

```ts
import { createSkeleton } from 'nearbytes-skeleton';
import { FilesystemStorageBackend } from 'nearbytes-storage';

const storage  = new FilesystemStorageBackend('/path/to/data');
const skeleton = createSkeleton(storage);
// skeleton.crypto — CryptoOperations (sign, verify, derive keys, encrypt)
// skeleton.log    — Log (events + blocks, wired to storage)
```

Pass `skeleton.log` and `skeleton.crypto` to `createFileService` from
`nearbytes-files` to add file-storage and CLI capabilities.

## Package structure

```
src/
  skeleton.ts  — NearbytesSkeleton interface + createSkeleton() factory
  store.ts     — writable(), derived(), Readable<T>, Writable<T>
  watcher.ts   — createFilesystemWatcher(), VolumeWatcher, Refreshable
  rootInit.ts  — initializeStorageRoot()
  config.ts    — NearbytesConfig, VolumeConfig, readConfig(), defaultDataDir()
```
