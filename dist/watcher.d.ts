/**
 * Filesystem watcher — triggers a ReactiveVolume refresh whenever the
 * underlying storage directory changes.
 *
 * This module is Node.js-only (uses fs.watch).  In a browser environment
 * the watcher is a no-op: calling createFilesystemWatcher() returns an
 * object whose close() does nothing.  Storage-change notifications in the
 * browser will instead come from the storage backend's own event system
 * (future work).
 */
import type { ReactiveVolume } from './volume.js';
export interface VolumeWatcher {
    /** Stop watching and release all resources. */
    close(): void;
}
/**
 * Watches `dataDir` for filesystem changes and calls `volume.refresh()` when
 * any change is detected.
 *
 * Changes are debounced by `debounceMs` (default 200 ms) to avoid a burst of
 * refreshes when many files are written in quick succession.
 *
 * @param dataDir    - Directory to watch (should be the skeleton's dataDir)
 * @param volume     - ReactiveVolume to refresh on change
 * @param debounceMs - Debounce delay in milliseconds (default 200)
 */
export declare function createFilesystemWatcher(dataDir: string, volume: ReactiveVolume, debounceMs?: number): VolumeWatcher;
//# sourceMappingURL=watcher.d.ts.map