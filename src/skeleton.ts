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

import { createCryptoOperations, type CryptoOperations, type Secret } from 'nearbytes-crypto';
import type { StorageBackend } from 'nearbytes-storage';
import { createLog, defaultPathMapper, type Log } from 'nearbytes-log';
import { createReactiveVolume, type ReactiveVolume } from './volume.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NearbytesSkeleton {
  /** Low-level crypto operations (sign, verify, derive keys, …). */
  readonly crypto: CryptoOperations;
  /** Event log — wraps the injected storage backend. */
  readonly log: Log;
  /**
   * Opens a volume from a secret, materialises its state, and caches the
   * result.  Subsequent calls with the same secret return the cached instance.
   */
  openVolume(secret: Secret): Promise<ReactiveVolume>;
  /**
   * Returns an already-open ReactiveVolume by its hex public key, or
   * undefined if the volume was never opened in this session.
   */
  getVolume(publicKeyHex: string): ReactiveVolume | undefined;
  /** All currently-open ReactiveVolumes. */
  readonly volumes: ReadonlyMap<string, ReactiveVolume>;
}

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
export function createSkeleton(storage: StorageBackend): NearbytesSkeleton {
  const crypto = createCryptoOperations();
  const log = createLog(storage, defaultPathMapper);
  const volumeMap = new Map<string, ReactiveVolume>();

  return {
    crypto,
    log,

    async openVolume(secret: Secret): Promise<ReactiveVolume> {
      // Derive the public key to use as the cache key
      const keyPair = await crypto.deriveKeys(secret);
      const { bytesToHex } = await import('nearbytes-crypto');
      const publicKeyHex = bytesToHex(keyPair.publicKey);

      const cached = volumeMap.get(publicKeyHex);
      if (cached !== undefined) return cached;

      const rv = await createReactiveVolume(secret, crypto, log);
      volumeMap.set(publicKeyHex, rv);
      return rv;
    },

    getVolume(publicKeyHex: string): ReactiveVolume | undefined {
      return volumeMap.get(publicKeyHex);
    },

    get volumes(): ReadonlyMap<string, ReactiveVolume> {
      return volumeMap;
    },
  };
}
