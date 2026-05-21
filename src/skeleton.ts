/**
 * NearbytesSkeleton — crypto + log wiring for a Nearbytes application.
 *
 * Future: inter-device routing and sync coordination.
 */

import { createCryptoOperations, type CryptoOperations } from 'nearbytes-crypto';
import type { Log } from 'nearbytes-log';
import { createFilesystemLog } from 'nearbytes-log';
import { initializeStorageRoot } from './rootInit.js';

export interface NearbytesSkeleton {
  readonly crypto: CryptoOperations;
  readonly log: Log;
}

/**
 * Wires a pre-built `Log` with crypto operations.
 */
export function createSkeleton(log: Log): NearbytesSkeleton {
  return {
    crypto: createCryptoOperations(),
    log,
  };
}

/**
 * Initialises a filesystem storage root and returns a skeleton backed by it.
 */
export async function createFilesystemSkeleton(dataDir: string): Promise<NearbytesSkeleton> {
  await initializeStorageRoot(dataDir);
  return createSkeleton(createFilesystemLog(dataDir));
}
