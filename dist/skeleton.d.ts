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
import { type CryptoOperations } from 'nearbytes-crypto';
import { type StorageBackend } from 'nearbytes-storage';
import { type Log } from 'nearbytes-log';
import { type ReactiveVolume } from './volume.js';
export interface NearbytesSkeleton {
    /** Low-level crypto operations (sign, verify, derive keys, …). */
    readonly crypto: CryptoOperations;
    /** Event log — wraps the injected storage backend. */
    readonly log: Log;
    /**
     * Opens a volume from a secret, materialises its state, and caches the
     * result.  Subsequent calls with the same secret return the cached instance.
     */
    openVolume(secret: string): Promise<ReactiveVolume>;
    /**
     * Returns an already-open ReactiveVolume by its hex public key, or
     * undefined if the volume was never opened in this session.
     */
    getVolume(publicKeyHex: string): ReactiveVolume | undefined;
    /** All currently-open ReactiveVolumes. */
    readonly volumes: ReadonlyMap<string, ReactiveVolume>;
}
/**
 * Creates a new NearbytesSkeleton wired to the given StorageBackend.
 *
 * Call this once at application start-up and pass the result to your CLI,
 * GUI, or any other consumer.
 *
 * @param storage - Environment-specific storage backend
 */
export declare function createSkeleton(storage: StorageBackend): NearbytesSkeleton;
//# sourceMappingURL=skeleton.d.ts.map