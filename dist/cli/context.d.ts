/**
 * CLI session context — shared mutable state for both immediate and REPL mode.
 */
import { type NearbytesSkeleton } from '../skeleton.js';
import { type VolumeWatcher } from '../watcher.js';
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
/**
 * Creates a CLI context for the given config, initialising the storage root
 * on disk (creates directories, writes Nearbytes.html, removes obsolete files).
 *
 * Async because root initialisation touches the filesystem.
 */
export declare function createContext(config: NearbytesConfig): Promise<Context>;
/**
 * Opens a volume and (optionally) installs a filesystem watcher that keeps it
 * refreshed automatically.  Idempotent — safe to call multiple times with the
 * same secret.
 */
export declare function openAndWatch(ctx: Context, secret: string, watch?: boolean): Promise<ReactiveVolume>;
//# sourceMappingURL=context.d.ts.map