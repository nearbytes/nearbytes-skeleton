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
// Configuration
export { readConfig, defaultConfigPath, defaultDataDir } from './config.js';
// Skeleton factory
export { createSkeleton } from './skeleton.js';
// Reactive volume
export { createReactiveVolume } from './volume.js';
// Filesystem watcher (Node.js only; no-op in browser)
export { createFilesystemWatcher } from './watcher.js';
// Storage root initialisation (Node.js only)
export { initializeStorageRoot } from './rootInit.js';
//# sourceMappingURL=index.js.map