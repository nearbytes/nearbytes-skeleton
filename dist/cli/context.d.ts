/**
 * CLI session context — shared mutable state for both immediate and REPL mode.
 *
 * Layering:
 *   createContext  →  createSkeleton(storage)  →  { crypto, log }
 *                 →  createFileService({ log, crypto })
 *
 * Commands use ctx.fileService for all file I/O and ctx.skeleton for
 * volume-state views (ReactiveVolume) and cross-cutting concerns (crypto).
 */
import { type FileService } from 'nearbytes-files';
import { type NearbytesSkeleton } from '../skeleton.js';
import { type VolumeWatcher } from '../watcher.js';
import { type NearbytesConfig } from '../config.js';
import type { ReactiveVolume } from '../volume.js';
export interface Context {
    readonly config: NearbytesConfig;
    readonly skeleton: NearbytesSkeleton;
    /**
     * High-level file service — the correct entry point for all file operations.
     * Internally wired to skeleton.log and skeleton.crypto.
     */
    readonly fileService: FileService;
    /** Currently "active" volume in the REPL (set with `use <key>`). */
    activeVolume: ReactiveVolume | null;
    /** Watchers keyed by public-key hex — cleaned up on REPL exit. */
    readonly watchers: Map<string, VolumeWatcher>;
    /** Tear down all watchers. */
    destroy(): void;
}
/**
 * Creates a CLI context for the given config.
 *
 * Initialises the storage root on disk (creates directories, writes
 * Nearbytes.html, removes obsolete files), then wires the full service stack:
 *
 *   FilesystemStorageBackend
 *     → createSkeleton  →  { crypto, log }
 *       → createFileService
 *
 * Async because root initialisation touches the filesystem.
 */
export declare function createContext(config: NearbytesConfig): Promise<Context>;
/**
 * Opens a volume (or returns the cached instance) and optionally installs a
 * filesystem watcher that refreshes it whenever the storage directory changes.
 *
 * skeleton.openVolume accepts a raw secret string and handles key derivation
 * and caching internally.
 */
export declare function openAndWatch(ctx: Context, secret: string, watch?: boolean): Promise<ReactiveVolume>;
/**
 * If the volume for this secret is already cached in the skeleton, refresh its
 * materialised state immediately so REPL subscribers see the latest data.
 * No-op when the volume has not been opened yet (e.g. immediate-mode CLI).
 */
export declare function refreshIfOpen(ctx: Context, secret: string): Promise<void>;
//# sourceMappingURL=context.d.ts.map