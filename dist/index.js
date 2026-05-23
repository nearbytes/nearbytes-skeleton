/**
 * nearbytes-skeleton — protocol foundation: crypto + log, reactive store, config, watcher.
 */
export { writable, derived } from './store.js';
export { readConfig, emptyConfig, defaultConfigPath, defaultDataDir } from './config.js';
export { createSkeleton, createFilesystemSkeleton, createFilesystemSkeletonFromConfig, } from './skeleton.js';
export { createFilesystemWatcher } from './watcher.js';
export { initializeStorageRoot } from './rootInit.js';
//# sourceMappingURL=index.js.map