import { watch } from 'fs';
import { mkdir } from 'fs/promises';

export interface VolumeWatcher {
  close(): void;
}

export interface Refreshable {
  refresh(): Promise<void>;
}

/**
 * Watches `watchRoot` (typically `dataDir/channels/<pubkey-hex>/`) and calls
 * `volume.refresh()` on change (debounced).
 *
 * Creates `watchRoot` if it does not exist so the REPL/WebDAV can open a
 * volume that has never received any events yet (e.g. after a resync wipe).
 * Returns a no-op watcher when Node.js is unavailable.
 */
export async function createFilesystemWatcher(
  watchRoot: string,
  volume: Refreshable,
  debounceMs = 200,
): Promise<VolumeWatcher> {
  if (typeof process === 'undefined' || process.versions?.node === undefined) {
    return { close(): void {} };
  }

  await mkdir(watchRoot, { recursive: true });

  let timer: ReturnType<typeof setTimeout> | null = null;

  const watcher = watch(watchRoot, { recursive: true }, () => {
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
