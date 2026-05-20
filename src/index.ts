/**
 * nearbytes-skeleton — public API
 *
 * The skeleton is the bridge between the clean protocol packages
 * (nearbytes-crypto, nearbytes-storage, nearbytes-log, nearbytes-files)
 * and any application that needs reactive, stateful volume access.
 *
 * Browser note: import from 'nearbytes-skeleton' everywhere; the package.json
 * "browser" conditional export strips Node.js-only code (watcher) from
 * browser bundles automatically.
 */

// Core reactive primitives
export { writable, derived } from './store.js';
export type { Readable, Writable, Subscriber, Unsubscriber } from './store.js';

// Configuration
export { readConfig, defaultConfigPath, defaultDataDir } from './config.js';
export type { NearbytesConfig, VolumeConfig } from './config.js';

// Skeleton factory
export { createSkeleton } from './skeleton.js';
export type { NearbytesSkeleton } from './skeleton.js';

// Reactive volume
export { createReactiveVolume } from './volume.js';
export type { ReactiveVolume } from './volume.js';

// Filesystem watcher (Node.js only; no-op in browser)
export { createFilesystemWatcher } from './watcher.js';
export type { VolumeWatcher } from './watcher.js';
