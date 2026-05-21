/**
 * NearbytesSkeleton — crypto + log wiring for a Nearbytes application.
 *
 * Future: inter-device routing and sync coordination.
 */
import { type CryptoOperations } from 'nearbytes-crypto';
import type { Log } from 'nearbytes-log';
export interface NearbytesSkeleton {
    readonly crypto: CryptoOperations;
    readonly log: Log;
}
/**
 * Wires a pre-built `Log` with crypto operations.
 */
export declare function createSkeleton(log: Log): NearbytesSkeleton;
/**
 * Initialises a filesystem storage root and returns a skeleton backed by it.
 */
export declare function createFilesystemSkeleton(dataDir: string): Promise<NearbytesSkeleton>;
//# sourceMappingURL=skeleton.d.ts.map