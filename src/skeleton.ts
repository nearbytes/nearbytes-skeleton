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

import { createCryptoOperations, type CryptoOperations } from 'nearbytes-crypto';
import { defaultPathMapper, type StorageBackend } from 'nearbytes-storage';
import { createLog, type Log } from 'nearbytes-log';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NearbytesSkeleton {
  /** Cryptographic operations: sign, verify, derive keys, encrypt, hash. */
  readonly crypto: CryptoOperations;
  /**
   * Event log + block store wired to the injected StorageBackend.
   * This is the single source of truth for all persistent state.
   */
  readonly log: Log;
}

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
export function createSkeleton(storage: StorageBackend): NearbytesSkeleton {
  const crypto = createCryptoOperations();
  const log = createLog(storage, defaultPathMapper);
  return { crypto, log };
}
