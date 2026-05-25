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
  profileSecret: string,
): Promise<string> {
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
const INERT_SYNC: SyncHandle = {
  friends: [],
  stop: async () => {},
};

async function bootSync(
  log: Log,
  friends: readonly string[],
  profileSecret: string | undefined,
  blockStorageRoot?: string,
): Promise<SyncHandle> {
  if (!profileSecret) {
    return INERT_SYNC;
  }
  const crypto = createCryptoOperations();
  const serveProfilePublicKey = await profilePublicKeyFromSecret(crypto, profileSecret);
  const discoveryTransport =
    process.env['NEARBYTES_SYNC_DISCOVERY'] === 'mdns' ? ('mdns' as const) : undefined;
  return start(log, friends, {
    serveProfilePublicKey,
    blockStorageRoot,
    ...(discoveryTransport ? { discoveryTransport } : {}),
  });
}

/**
 * Wires a pre-built `Log` with crypto and starts sync.
 */
export async function createSkeleton(
  log: Log,
  friends: readonly string[],
  profileSecret?: string,
  blockStorageRoot?: string,
): Promise<NearbytesSkeleton> {
  const crypto = createCryptoOperations();
  let sync = await bootSync(log, friends, profileSecret, blockStorageRoot);
  const storageRoot = blockStorageRoot;
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
      sync = await bootSync(log, nextFriends, nextProfileSecret ?? profileSecret, storageRoot);
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
  return createSkeleton(createFilesystemLog(dataDir), friends, profileSecret, dataDir);
}

/**
 * Boot from parsed config: storage root, log, and sync for `config.friends`.
 */
export async function createFilesystemSkeletonFromConfig(
  config: NearbytesConfig,
): Promise<NearbytesSkeleton> {
  return createFilesystemSkeleton(config.dataDir, config.friends, config.profileSecret);
}
