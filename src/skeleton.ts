/**
 * NearbytesSkeleton — crypto + log + sync wiring for a Nearbytes application.
 */

import { createCryptoOperations, type CryptoOperations } from 'nearbytes-crypto';
import type { Log } from 'nearbytes-log';
import { createFilesystemLog } from 'nearbytes-log';
import { start, type SyncHandle } from 'nearbytes-sync/node';
import type { NearbytesConfig } from './config.js';
import { initializeStorageRoot } from './rootInit.js';

export interface NearbytesSkeleton {
  readonly crypto: CryptoOperations;
  readonly log: Log;
  readonly sync: SyncHandle;
  destroy(): Promise<void>;
}

/**
 * Wires a pre-built `Log` with crypto and starts sync for the given friends list.
 */
export async function createSkeleton(
  log: Log,
  friends: readonly string[],
): Promise<NearbytesSkeleton> {
  const crypto = createCryptoOperations();
  const sync = await start(log, friends);
  return {
    crypto,
    log,
    sync,
    async destroy(): Promise<void> {
      await sync.stop();
    },
  };
}

/**
 * Initialises a filesystem storage root and returns a skeleton backed by it.
 */
export async function createFilesystemSkeleton(
  dataDir: string,
  friends: readonly string[] = [],
): Promise<NearbytesSkeleton> {
  await initializeStorageRoot(dataDir);
  return createSkeleton(createFilesystemLog(dataDir), friends);
}

/**
 * Boot from parsed config: storage root, log, and sync for `config.friends`.
 */
export async function createFilesystemSkeletonFromConfig(
  config: NearbytesConfig,
): Promise<NearbytesSkeleton> {
  return createFilesystemSkeleton(config.dataDir, config.friends);
}
