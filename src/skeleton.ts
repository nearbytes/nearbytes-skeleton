/**
 * NearbytesSkeleton — crypto + log + sync wiring for a Nearbytes application.
 */

import { createSecret, bytesToHex } from 'nearbytes-crypto';
import { createCryptoOperations, type CryptoOperations } from 'nearbytes-crypto';
import type { Log } from 'nearbytes-log';
import { createFilesystemLog } from 'nearbytes-log';
import { start, type SyncHandle } from 'nearbytes-sync/node';
import type { NearbytesConfig, ProfileConfig } from './config.js';
import { initializeStorageRoot } from './rootInit.js';

export interface SyncProfileSpec {
  /** All served local profile secrets (`name:password`). Empty → inert sync. */
  readonly profiles: ReadonlyArray<ProfileConfig>;
  /** Name of the active profile (one of `profiles[i].name`); null when empty. */
  readonly activeProfile: string | null;
}

export interface NearbytesSkeleton {
  readonly crypto: CryptoOperations;
  readonly log: Log;
  sync: SyncHandle;
  destroy(): Promise<void>;
  reloadSync(friends: readonly string[], spec: SyncProfileSpec): Promise<void>;
}

async function publicKeyFromSecret(
  crypto: CryptoOperations,
  secret: string,
): Promise<string> {
  const keyPair = await crypto.deriveKeys(createSecret(secret));
  return bytesToHex(keyPair.publicKey);
}

/**
 * Inert sync handle for the "no profile declared yet" state: the node has
 * no profile public keys, so per `requirements/sync-protocol-v1.md` SYNC-00
 * it has no topic to join and cannot authenticate friend handshakes. The
 * skeleton represents this explicitly with a dormant handle; `reloadSync`
 * swaps in a live one as soon as the first profile is added.
 */
const INERT_SYNC: SyncHandle = {
  friends: [],
  serveProfilePublicKeys: [],
  stop: async () => {},
};

async function bootSync(
  log: Log,
  friends: readonly string[],
  spec: SyncProfileSpec,
  blockStorageRoot?: string,
): Promise<SyncHandle> {
  if (spec.profiles.length === 0 || spec.activeProfile === null) {
    return INERT_SYNC;
  }
  const crypto = createCryptoOperations();
  const servedPks = await Promise.all(
    spec.profiles.map((p) => publicKeyFromSecret(crypto, p.secret)),
  );
  const activeIdx = spec.profiles.findIndex((p) => p.name === spec.activeProfile);
  if (activeIdx < 0) {
    throw new Error(
      `bootSync: activeProfile "${spec.activeProfile}" is not in profiles[]`,
    );
  }
  const activeProfilePublicKey = servedPks[activeIdx]!;
  const discoveryTransport =
    process.env['NEARBYTES_SYNC_DISCOVERY'] === 'mdns' ? ('mdns' as const) : undefined;
  return start(log, friends, {
    serveProfilePublicKeys: servedPks,
    activeProfilePublicKey,
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
  spec: SyncProfileSpec,
  blockStorageRoot?: string,
): Promise<NearbytesSkeleton> {
  const crypto = createCryptoOperations();
  let sync = await bootSync(log, friends, spec, blockStorageRoot);
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
    async reloadSync(nextFriends: readonly string[], nextSpec: SyncProfileSpec): Promise<void> {
      await sync.stop();
      sync = await bootSync(log, nextFriends, nextSpec, storageRoot);
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
  spec: SyncProfileSpec = { profiles: [], activeProfile: null },
): Promise<NearbytesSkeleton> {
  await initializeStorageRoot(dataDir);
  return createSkeleton(createFilesystemLog(dataDir), friends, spec, dataDir);
}

/**
 * Boot from parsed config: storage root, log, and sync for `config.friends`.
 */
export async function createFilesystemSkeletonFromConfig(
  config: NearbytesConfig,
): Promise<NearbytesSkeleton> {
  return createFilesystemSkeleton(config.dataDir, config.friends, {
    profiles: config.profiles,
    activeProfile: config.activeProfile,
  });
}
