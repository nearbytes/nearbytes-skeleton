/**
 * CLI session context — shared mutable state for both immediate and REPL mode.
 *
 * A single Context instance is created when the CLI boots and threaded through
 * every command handler.  In immediate mode the context is discarded on exit;
 * in REPL mode it persists across commands, so an opened volume stays open.
 */

import { FilesystemStorageBackend } from 'nearbytes-storage';
import { createSkeleton, type NearbytesSkeleton } from '../skeleton.js';
import { createFilesystemWatcher, type VolumeWatcher } from '../watcher.js';
import { type NearbytesConfig } from '../config.js';
import type { ReactiveVolume } from '../volume.js';

export interface Context {
  readonly config: NearbytesConfig;
  readonly skeleton: NearbytesSkeleton;
  /** Currently "active" volume in the REPL (set with `use <key>`). */
  activeVolume: ReactiveVolume | null;
  /** Watchers keyed by public-key hex — cleaned up on REPL exit. */
  watchers: Map<string, VolumeWatcher>;
  /** Tear down all watchers. */
  destroy(): void;
}

export function createContext(config: NearbytesConfig): Context {
  const storage = new FilesystemStorageBackend(config.dataDir);
  const skeleton = createSkeleton(storage);
  const watchers = new Map<string, VolumeWatcher>();

  return {
    config,
    skeleton,
    activeVolume: null,
    watchers,

    destroy(): void {
      for (const w of watchers.values()) w.close();
      watchers.clear();
    },
  };
}

/**
 * Opens a volume and (optionally) installs a filesystem watcher that keeps it
 * refreshed automatically.  Idempotent — safe to call multiple times with the
 * same secret.
 */
export async function openAndWatch(
  ctx: Context,
  secret: string,
  watch = true,
): Promise<ReactiveVolume> {
  const rv = await ctx.skeleton.openVolume(secret as `${string}:${string}`);
  const { bytesToHex } = await import('nearbytes-crypto');
  const keyHex = bytesToHex(rv.volume.publicKey);

  if (watch && !ctx.watchers.has(keyHex)) {
    const watcher = createFilesystemWatcher(ctx.config.dataDir, rv);
    ctx.watchers.set(keyHex, watcher);
  }

  return rv;
}
