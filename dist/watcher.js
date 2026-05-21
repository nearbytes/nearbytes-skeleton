import { watch } from 'fs';
/**
 * Watches `dataDir` and calls `volume.refresh()` on change (debounced).
 * Returns a no-op watcher when Node.js is unavailable.
 */
export function createFilesystemWatcher(dataDir, volume, debounceMs = 200) {
    if (typeof process === 'undefined' || process.versions?.node === undefined) {
        return { close() { } };
    }
    let timer = null;
    const watcher = watch(dataDir, { recursive: true }, () => {
        if (timer !== null)
            clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            void volume.refresh();
        }, debounceMs);
    });
    return {
        close() {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
            watcher.close();
        },
    };
}
//# sourceMappingURL=watcher.js.map