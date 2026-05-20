/**
 * NearbytesSkeleton — the central wiring object for a Nearbytes application.
 *
 * A skeleton holds exactly:
 *   - one CryptoOperations instance
 *   - one event Log (wrapping an injected StorageBackend)
 *   - a map of currently-open ReactiveVolumes
 *
 * The skeleton is environment-neutral: it accepts the StorageBackend as a
 * constructor argument so Node.js injects FilesystemStorageBackend while a
 * browser injects an IndexedDB backend.  No platform code lives here.
 */
import { createCryptoOperations, createSecret } from 'nearbytes-crypto';
import { defaultPathMapper } from 'nearbytes-storage';
import { createLog } from 'nearbytes-log';
import { createReactiveVolume } from './volume.js';
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
/**
 * Creates a new NearbytesSkeleton wired to the given StorageBackend.
 *
 * Call this once at application start-up and pass the result to your CLI,
 * GUI, or any other consumer.
 *
 * @param storage - Environment-specific storage backend
 */
export function createSkeleton(storage) {
    const crypto = createCryptoOperations();
    const log = createLog(storage, defaultPathMapper);
    const volumeMap = new Map();
    return {
        crypto,
        log,
        async openVolume(rawSecret) {
            const secret = createSecret(rawSecret);
            // Derive the public key to use as the cache key
            const keyPair = await crypto.deriveKeys(secret);
            const { bytesToHex } = await import('nearbytes-crypto');
            const publicKeyHex = bytesToHex(keyPair.publicKey);
            const cached = volumeMap.get(publicKeyHex);
            if (cached !== undefined)
                return cached;
            const rv = await createReactiveVolume(secret, crypto, log);
            volumeMap.set(publicKeyHex, rv);
            return rv;
        },
        getVolume(publicKeyHex) {
            return volumeMap.get(publicKeyHex);
        },
        get volumes() {
            return volumeMap;
        },
    };
}
//# sourceMappingURL=skeleton.js.map