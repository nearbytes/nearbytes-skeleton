/**
 * NearbytesSkeleton — crypto + log + sync wiring for a Nearbytes application.
 */
import { createSecret, bytesToHex } from 'nearbytes-crypto';
import { createCryptoOperations } from 'nearbytes-crypto';
import { createFilesystemLog } from 'nearbytes-log';
import { start } from 'nearbytes-sync/node';
import { initializeStorageRoot } from './rootInit.js';
async function profilePublicKeyFromSecret(crypto, profileSecret) {
    if (!profileSecret) {
        return undefined;
    }
    const keyPair = await crypto.deriveKeys(createSecret(profileSecret));
    return bytesToHex(keyPair.publicKey);
}
async function bootSync(log, friends, profileSecret) {
    const crypto = createCryptoOperations();
    const serveProfilePublicKey = await profilePublicKeyFromSecret(crypto, profileSecret);
    return start(log, friends, { serveProfilePublicKey });
}
/**
 * Wires a pre-built `Log` with crypto and starts sync.
 */
export async function createSkeleton(log, friends, profileSecret) {
    const crypto = createCryptoOperations();
    let sync = await bootSync(log, friends, profileSecret);
    const skeleton = {
        crypto,
        log,
        get sync() {
            return sync;
        },
        async destroy() {
            await sync.stop();
        },
        async reloadSync(nextFriends, nextProfileSecret) {
            await sync.stop();
            sync = await bootSync(log, nextFriends, nextProfileSecret ?? profileSecret);
        },
    };
    return skeleton;
}
/**
 * Initialises a filesystem storage root and returns a skeleton backed by it.
 */
export async function createFilesystemSkeleton(dataDir, friends = [], profileSecret) {
    await initializeStorageRoot(dataDir);
    return createSkeleton(createFilesystemLog(dataDir), friends, profileSecret);
}
/**
 * Boot from parsed config: storage root, log, and sync for `config.friends`.
 */
export async function createFilesystemSkeletonFromConfig(config) {
    return createFilesystemSkeleton(config.dataDir, config.friends, config.profileSecret);
}
//# sourceMappingURL=skeleton.js.map