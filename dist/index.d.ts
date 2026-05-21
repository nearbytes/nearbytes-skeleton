/**
 * nearbytes-skeleton — public API
 *
 * The skeleton is the protocol foundation layer: it wires a StorageBackend
 * into a CryptoOperations instance and an event Log, and exposes the generic
 * reactive-store primitives, config, filesystem watcher, and storage-root
 * initialisation needed by higher layers.
 *
 * Future additions: inter-device routing and sync coordination live here.
 *
 * Higher-level concerns (file storage, CLI) live in nearbytes-files.
 */
export { writable, derived } from './store.js';
export type { Readable, Writable, Subscriber, Unsubscriber } from './store.js';
export { readConfig, defaultConfigPath, defaultDataDir } from './config.js';
export type { NearbytesConfig, VolumeConfig } from './config.js';
export { createSkeleton } from './skeleton.js';
export type { NearbytesSkeleton } from './skeleton.js';
export { createFilesystemWatcher } from './watcher.js';
export type { VolumeWatcher, Refreshable } from './watcher.js';
export { initializeStorageRoot } from './rootInit.js';
//# sourceMappingURL=index.d.ts.map