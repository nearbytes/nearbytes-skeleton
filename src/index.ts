/**
 * nearbytes-skeleton — protocol foundation: crypto + log, reactive store, config, watcher.
 */

export { writable, derived } from './store.js';
export type { Readable, Writable, Subscriber, Unsubscriber } from './store.js';

export {
  readConfig,
  writeConfig,
  emptyConfig,
  defaultConfigPath,
  defaultDataDir,
} from './config.js';
export type { NearbytesConfig, VolumeConfig, ProfileConfig } from './config.js';

export {
  createSkeleton,
  createFilesystemSkeleton,
  createFilesystemSkeletonFromConfig,
} from './skeleton.js';
export type { NearbytesSkeleton, SyncProfileSpec } from './skeleton.js';

export { createFilesystemWatcher } from './watcher.js';
export type { VolumeWatcher, Refreshable } from './watcher.js';

export { initializeStorageRoot } from './rootInit.js';
