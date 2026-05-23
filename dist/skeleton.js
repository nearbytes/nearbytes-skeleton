/**
 * NearbytesSkeleton — crypto + log + sync wiring for a Nearbytes application.
 */
import { createCryptoOperations } from 'nearbytes-crypto';
import { createFilesystemLog } from 'nearbytes-log';
import { start } from 'nearbytes-sync/node';
import { initializeStorageRoot } from './rootInit.js';
/**
 * Wires a pre-built `Log` with crypto and starts sync for the given friends list.
 */
export async function createSkeleton(log, friends) {
    const crypto = createCryptoOperations();
    const sync = await start(log, friends);
    return {
        crypto,
        log,
        sync,
        async destroy() {
            await sync.stop();
        },
    };
}
/**
 * Initialises a filesystem storage root and returns a skeleton backed by it.
 */
export async function createFilesystemSkeleton(dataDir, friends = []) {
    await initializeStorageRoot(dataDir);
    return createSkeleton(createFilesystemLog(dataDir), friends);
}
/**
 * Boot from parsed config: storage root, log, and sync for `config.friends`.
 */
export async function createFilesystemSkeletonFromConfig(config) {
    return createFilesystemSkeleton(config.dataDir, config.friends);
}
//# sourceMappingURL=skeleton.js.map