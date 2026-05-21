import { watch } from 'fs';

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
export function createFilesystemWatcher(
  dataDir: string,
  volume: Refreshable,
  debounceMs = 200,
): VolumeWatcher {
  if (typeof process === 'undefined' || process.versions?.node === undefined) {
    return { close(): void {} };
  }

  let timer: ReturnType<typeof setTimeout> | null = null;

  const watcher = watch(dataDir, { recursive: true }, () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void volume.refresh();
    }, debounceMs);
  });

  return {
    close(): void {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      watcher.close();
    },
  };
}
