/**
 * NearbytesSkeleton — crypto + log wiring for a Nearbytes application.
 *
 * Future: inter-device routing and sync coordination.
 */
import { createCryptoOperations } from 'nearbytes-crypto';
import { createFilesystemLog } from 'nearbytes-log';
import { initializeStorageRoot } from './rootInit.js';
/**
 * Wires a pre-built `Log` with crypto operations.
 */
export function createSkeleton(log) {
    return {
        crypto: createCryptoOperations(),
        log,
    };
}
/**
 * Initialises a filesystem storage root and returns a skeleton backed by it.
 */
export async function createFilesystemSkeleton(dataDir) {
    await initializeStorageRoot(dataDir);
    return createSkeleton(createFilesystemLog(dataDir));
}
//# sourceMappingURL=skeleton.js.map