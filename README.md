# nearbytes-skeleton

Application skeleton for Nearbytes — reactive volume state, configuration, filesystem watching, and a full CLI / REPL.

## What's inside

- **`createSkeleton(storage)`** — wires `nearbytes-crypto`, `nearbytes-log`, and `nearbytes-files` into a single `NearbytesSkeleton` handle; manages an open-volume cache
- **`ReactiveVolume`** — Svelte-store-compatible (`subscribe`, `get`) view over `VolumeFileSystemState`; call `refresh()` after any write
- **`createFilesystemWatcher(dataDir, volume)`** — debounced `fs.watch` wrapper that refreshes a `ReactiveVolume` on disk changes (Node.js only)
- **`initializeStorageRoot(dataDir)`** — creates `blocks/` and `channels/`, writes `Nearbytes.html`, removes obsolete `Nearbytes.json`
- **`readConfig(path?)`** — loads `~/.nearbytes/config.json`; respects `NEARBYTES_CONFIG` and `NEARBYTES_STORAGE_DIR` env vars
- **`writable(initial)` / `derived(source, fn)`** — minimal framework-agnostic reactive store primitives
- **`nbf` CLI** — immediate mode (`nbf <command>`) and interactive REPL (`nbf repl`)

## Install

```sh
yarn add nearbytes/nearbytes-skeleton#main
```

## CLI quick start

```sh
# Build first
yarn build

# Initialise a channel and display the public key
nbf setup -s "myvol:password"

# Add a file
nbf file add -p ./hello.txt -s "myvol:password"

# List files
nbf file list -s "myvol:password"

# Retrieve a file
nbf file get -n hello.txt -s "myvol:password" -o ./out.txt

# Remove a file
nbf file remove -n hello.txt -s "myvol:password"

# Interactive REPL (persistent session state)
nbf repl
```

## Library quick start

```ts
import { createSkeleton } from 'nearbytes-skeleton';
import { FilesystemStorageBackend } from 'nearbytes-storage';
import { createFileService } from 'nearbytes-files';

const storage = new FilesystemStorageBackend('/path/to/data');
const skeleton = createSkeleton(storage);
const files    = createFileService({ log: skeleton.log, crypto: skeleton.crypto });

// Open a volume (derives keys, replays event log)
const rv = await skeleton.openVolume('myvol:password');
rv.subscribe(state => console.log(`${state.files.size} file(s)`));

// Write a file
await files.addFile('myvol:password', 'hello.txt', Buffer.from('Hello!'));
await rv.refresh();
```

## Package structure

```
src/
  skeleton.ts   — NearbytesSkeleton interface + createSkeleton() factory
  volume.ts     — ReactiveVolume interface + createReactiveVolume()
  store.ts      — writable(), derived(), Readable<T>, Writable<T>
  watcher.ts    — createFilesystemWatcher(), VolumeWatcher
  rootInit.ts   — initializeStorageRoot()
  config.ts     — NearbytesConfig, VolumeConfig, readConfig(), defaultDataDir()
  cli/
    index.ts    — Commander.js entry point (nbf)
    commands.ts — cmdSetup, cmdVolumeOpen, cmdFileAdd, cmdFileList, cmdFileGet, cmdFileRemove, …
    context.ts  — Context, createContext(), openAndWatch(), refreshIfOpen()
    output.ts   — ANSI colour helpers + formatFileTable()
    repl.ts     — interactive REPL loop
```
