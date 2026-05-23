/**
 * NearbytesSkeleton — crypto + log + sync wiring for a Nearbytes application.
 */

import { createSecret, bytesToHex } from 'nearbytes-crypto';
import { createCryptoOperations, type CryptoOperations } from 'nearbytes-crypto';
import type { Log } from 'nearbytes-log';
import { createFilesystemLog } from 'nearbytes-log';
import { start, type SyncHandle } from 'nearbytes-sync/node';
import type { NearbytesConfig } from './config.js';
import { initializeStorageRoot } from './rootInit.js';

export interface NearbytesSkeleton {
  readonly crypto: CryptoOperations;
  readonly log: Log;
  sync: SyncHandle;
  destroy(): Promise<void>;
  reloadSync(friends: readonly string[], serveProfilePublicKey?: string): Promise<void>;
}

async function profilePublicKeyFromSecret(
  crypto: CryptoOperations,
  profileSecret: string | undefined,
): Promise<string | undefined> {
  if (!profileSecret) {
    return undefined;
  }
  const keyPair = await crypto.deriveKeys(createSecret(profileSecret));
  return bytesToHex(keyPair.publicKey);
}

async function bootSync(
  log: Log,
  friends: readonly string[],
  profileSecret: string | undefined,
): Promise<SyncHandle> {
  const crypto = createCryptoOperations();
  const serveProfilePublicKey = await profilePublicKeyFromSecret(crypto, profileSecret);
  return start(log, friends, { serveProfilePublicKey });
}

/**
 * Wires a pre-built `Log` with crypto and starts sync.
 */
export async function createSkeleton(
  log: Log,
  friends: readonly string[],
  profileSecret?: string,
): Promise<NearbytesSkeleton> {
  const crypto = createCryptoOperations();
  let sync = await bootSync(log, friends, profileSecret);
  const skeleton: NearbytesSkeleton = {
    crypto,
    log,
    get sync() {
      return sync;
    },
    async destroy(): Promise<void> {
      await sync.stop();
    },
    async reloadSync(nextFriends: readonly string[], nextProfileSecret?: string): Promise<void> {
      await sync.stop();
      sync = await bootSync(log, nextFriends, nextProfileSecret ?? profileSecret);
    },
  };
  return skeleton;
}

/**
 * Initialises a filesystem storage root and returns a skeleton backed by it.
 */
export async function createFilesystemSkeleton(
  dataDir: string,
  friends: readonly string[] = [],
  profileSecret?: string,
): Promise<NearbytesSkeleton> {
  await initializeStorageRoot(dataDir);
  return createSkeleton(createFilesystemLog(dataDir), friends, profileSecret);
}

/**
 * Boot from parsed config: storage root, log, and sync for `config.friends`.
 */
export async function createFilesystemSkeletonFromConfig(
  config: NearbytesConfig,
): Promise<NearbytesSkeleton> {
  return createFilesystemSkeleton(config.dataDir, config.friends, config.profileSecret);
}
