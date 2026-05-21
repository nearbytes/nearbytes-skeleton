/**
 * NearbytesSkeleton — the protocol foundation for a Nearbytes application.
 *
 * The skeleton wires a StorageBackend into a CryptoOperations instance and an
 * event Log.  It is intentionally thin: no volume state, no file logic.
 *
 * Future responsibilities (not yet implemented):
 *   - Inter-device routing: propagating events across storage roots
 *   - Sync coordination: merging events from remote peers
 *
 * Environment-neutral: pass a FilesystemStorageBackend (Node.js) or an
 * IndexedDB-backed backend (browser) — no platform code lives here.
 */
import { createCryptoOperations } from 'nearbytes-crypto';
import { defaultPathMapper } from 'nearbytes-storage';
import { createLog } from 'nearbytes-log';
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
/**
 * Creates a `NearbytesSkeleton` wired to the given StorageBackend.
 *
 * Call once at application start-up. Pass `skeleton.log` and `skeleton.crypto`
 * to `createFileService` (nearbytes-files) or any other consumer.
 *
 * @param storage - Environment-specific storage backend.
 */
export function createSkeleton(storage) {
    const crypto = createCryptoOperations();
    const log = createLog(storage, defaultPathMapper);
    return { crypto, log };
}
//# sourceMappingURL=skeleton.js.map