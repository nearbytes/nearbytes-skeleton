export interface VolumeWatcher {
    close(): void;
}
export interface Refreshable {
    refresh(): Promise<void>;
}
/**
 * Watches `dataDir` and calls `volume.refresh()` on change (debounced).
 * Returns a no-op watcher when Node.js is unavailable.
 */
export declare function createFilesystemWatcher(dataDir: string, volume: Refreshable, debounceMs?: number): VolumeWatcher;
//# sourceMappingURL=watcher.d.ts.map