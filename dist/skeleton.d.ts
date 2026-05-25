/**
 * NearbytesSkeleton — crypto + log + sync wiring for a Nearbytes application.
 */
import { type CryptoOperations } from 'nearbytes-crypto';
import type { Log } from 'nearbytes-log';
import { type SyncHandle } from 'nearbytes-sync/node';
import type { NearbytesConfig, ProfileConfig } from './config.js';
export interface SyncProfileSpec {
    /** All served local profile secrets (`name:password`). Empty → inert sync. */
    readonly profiles: ReadonlyArray<ProfileConfig>;
    /** Name of the active profile (one of `profiles[i].name`); null when empty. */
    readonly activeProfile: string | null;
}
export interface NearbytesSkeleton {
    readonly crypto: CryptoOperations;
    readonly log: Log;
    sync: SyncHandle;
    destroy(): Promise<void>;
    reloadSync(friends: readonly string[], spec: SyncProfileSpec): Promise<void>;
}
/**
 * Wires a pre-built `Log` with crypto and starts sync.
 */
export declare function createSkeleton(log: Log, friends: readonly string[], spec: SyncProfileSpec, blockStorageRoot?: string): Promise<NearbytesSkeleton>;
/**
 * Initialises a filesystem storage root and returns a skeleton backed by it.
 */
export declare function createFilesystemSkeleton(dataDir: string, friends?: readonly string[], spec?: SyncProfileSpec): Promise<NearbytesSkeleton>;
/**
 * Boot from parsed config: storage root, log, and sync for `config.friends`.
 */
export declare function createFilesystemSkeletonFromConfig(config: NearbytesConfig): Promise<NearbytesSkeleton>;
//# sourceMappingURL=skeleton.d.ts.map