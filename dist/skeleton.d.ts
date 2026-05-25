/**
 * NearbytesSkeleton — crypto + log + sync wiring for a Nearbytes application.
 */
import { type CryptoOperations } from 'nearbytes-crypto';
import type { Log } from 'nearbytes-log';
import { type SyncHandle } from 'nearbytes-sync/node';
import type { NearbytesConfig } from './config.js';
export interface NearbytesSkeleton {
    readonly crypto: CryptoOperations;
    readonly log: Log;
    sync: SyncHandle;
    destroy(): Promise<void>;
    reloadSync(friends: readonly string[], serveProfilePublicKey?: string): Promise<void>;
}
/**
 * Wires a pre-built `Log` with crypto and starts sync.
 */
export declare function createSkeleton(log: Log, friends: readonly string[], profileSecret?: string, blockStorageRoot?: string): Promise<NearbytesSkeleton>;
/**
 * Initialises a filesystem storage root and returns a skeleton backed by it.
 */
export declare function createFilesystemSkeleton(dataDir: string, friends?: readonly string[], profileSecret?: string): Promise<NearbytesSkeleton>;
/**
 * Boot from parsed config: storage root, log, and sync for `config.friends`.
 */
export declare function createFilesystemSkeletonFromConfig(config: NearbytesConfig): Promise<NearbytesSkeleton>;
//# sourceMappingURL=skeleton.d.ts.map