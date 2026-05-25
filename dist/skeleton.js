/**
 * NearbytesSkeleton — crypto + log + sync wiring for a Nearbytes application.
 */
import { createSecret, bytesToHex } from 'nearbytes-crypto';
import { createCryptoOperations } from 'nearbytes-crypto';
import { createFilesystemLog } from 'nearbytes-log';
import { start } from 'nearbytes-sync/node';
import { initializeStorageRoot } from './rootInit.js';
async function profilePublicKeyFromSecret(crypto, profileSecret) {
    const keyPair = await crypto.deriveKeys(createSecret(profileSecret));
    return bytesToHex(keyPair.publicKey);
}
/**
 * Inert sync handle for the "no identity declared yet" state: the node has
 * no profile public key, so per `requirements/sync-discovery-v1.md` it has
 * no topic to join and per `requirements/sync-protocol-v1.md` it cannot
 * authenticate friend handshakes. The skeleton represents this explicitly
 * with a dormant handle; `reloadSync` swaps in a live one as soon as
 * `profileSecret` is configured.
 */
const INERT_SYNC = {
    friends: [],
    stop: async () => { },
};
async function bootSync(log, friends, profileSecret, blockStorageRoot) {
    if (!profileSecret) {
        return INERT_SYNC;
    }
    const crypto = createCryptoOperations();
    const serveProfilePublicKey = await profilePublicKeyFromSecret(crypto, profileSecret);
    const discoveryTransport = process.env['NEARBYTES_SYNC_DISCOVERY'] === 'mdns' ? 'mdns' : undefined;
    return start(log, friends, {
        serveProfilePublicKey,
        blockStorageRoot,
        ...(discoveryTransport ? { discoveryTransport } : {}),
    });
}
/**
 * Wires a pre-built `Log` with crypto and starts sync.
 */
export async function createSkeleton(log, friends, profileSecret, blockStorageRoot) {
    const crypto = createCryptoOperations();
    let sync = await bootSync(log, friends, profileSecret, blockStorageRoot);
    const storageRoot = blockStorageRoot;
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
            sync = await bootSync(log, nextFriends, nextProfileSecret ?? profileSecret, storageRoot);
        },
    };
    return skeleton;
}
/**
 * Initialises a filesystem storage root and returns a skeleton backed by it.
 */
export async function createFilesystemSkeleton(dataDir, friends = [], profileSecret) {
    await initializeStorageRoot(dataDir);
    return createSkeleton(createFilesystemLog(dataDir), friends, profileSecret, dataDir);
}
/**
 * Boot from parsed config: storage root, log, and sync for `config.friends`.
 */
export async function createFilesystemSkeletonFromConfig(config) {
    return createFilesystemSkeleton(config.dataDir, config.friends, config.profileSecret);
}
//# sourceMappingURL=skeleton.js.map