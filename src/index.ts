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

// Core reactive primitives — framework-agnostic, Svelte-store-compatible
export { writable, derived } from './store.js';
export type { Readable, Writable, Subscriber, Unsubscriber } from './store.js';

// Configuration
export { readConfig, defaultConfigPath, defaultDataDir } from './config.js';
export type { NearbytesConfig, VolumeConfig } from './config.js';

// Protocol foundation: crypto + log
export { createSkeleton } from './skeleton.js';
export type { NearbytesSkeleton } from './skeleton.js';

// Filesystem watcher (Node.js only; no-op in browser)
export { createFilesystemWatcher } from './watcher.js';
export type { VolumeWatcher, Refreshable } from './watcher.js';

// Storage root initialisation (Node.js only)
export { initializeStorageRoot } from './rootInit.js';
