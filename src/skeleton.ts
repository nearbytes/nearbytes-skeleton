/**
 * NearbytesSkeleton — crypto + log + sync wiring for a Nearbytes application.
 */

import { createSecret, bytesToHex } from 'nearbytes-crypto';
import { createCryptoOperations, type CryptoOperations } from 'nearbytes-crypto';
import type { Log } from 'nearbytes-log';
import { createFilesystemLog } from 'nearbytes-log';
import { start, peekNodeId, probeSyncLock, type SyncHandle } from 'nearbytes-sync/node';
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
  peerId: '',
  activeProfilePublicKey: '',
  snapshot: () => ({ inflightInbound: 0, inflightOutbound: 0, connectedPeers: 0 }),
  peers: () => [],
  onEvent: () => () => {},
  recentEvents: () => [],
  stats: () => ({
    totalBytesIn: 0,
    totalBytesOut: 0,
    totalBlocksIn: 0,
    totalBlocksOut: 0,
    totalEventsIn: 0,
    bytesPerSecIn: 0,
    bytesPerSecOut: 0,
    windowMs: 5_000,
  }),
  stop: async () => {},
};

/**
 * Writer-only handle returned when a separate sync daemon already holds
 * the sync-singleton lock on the dataDir (`sync-discovery-v1.md` DISC-27,
 * split form: singleton sync, plural writers).
 *
 * This handle deliberately does NOT join any swarm, does NOT open any
 * Hyperswarm/mDNS sockets, and does NOT register any peer-loop callbacks.
 * Locally appended events still land in the on-disk log via `nearbytes-log`
 * (no lock is required for log writes — they are content-addressed and
 * atomic-link-published, see DISC-27 §writer model). The active daemon's
 * channels watcher picks them up and replicates them to peers.
 *
 * `friends` and `serveProfilePublicKeys` echo the in-process intent so
 * UIs can still render "what we would sync if we owned the slot"; the
 * truth on the wire belongs to the daemon.
 */
function makeWriterOnlySync(
  friends: readonly string[],
  servedPks: readonly string[],
  activeProfilePublicKey: string,
  dataDir: string,
  holderPid: number,
  lockPath: string,
  heldSince: Date,
): SyncHandle & { readonly daemon: { holderPid: number; lockPath: string; heldSince: Date } } {
  return {
    friends: [...friends],
    serveProfilePublicKeys: [...servedPks],
    /**
     * Writer-only: the daemon owns the sync engine, but the node id is
     * a property of the *dataDir*, not of whichever process happens to
     * hold the lock. Read it from disk so `nbf whoami` and the monitor
     * can still show "this machine's id" even when we are not the engine.
     */
    peerId: peekNodeId(dataDir),
    activeProfilePublicKey,
    /**
     * Writer-only handle: we never open peer sockets, so connectedPeers is
     * always 0. CLI bye-time flush callers MUST account for this case (the
     * daemon-active path) and not block forever waiting for a peer that
     * will never appear in *this* process — the running daemon is the one
     * doing the network work, and writes are propagated via the dataDir
     * watcher (DISC-27.4).
     */
    snapshot: () => ({ inflightInbound: 0, inflightOutbound: 0, connectedPeers: 0 }),
    peers: () => [],
    /**
     * Writer-only: this process is NOT the sync engine, so it never
     * emits wire-level events. Observability UIs that detect a
     * daemon-active dataDir read the daemon's state beacon instead
     * (`readSyncStateBeacon`), which carries the daemon's `events`
     * and `stats`.
     */
    onEvent: () => () => {},
    recentEvents: () => [],
    /**
     * Writer-only: no bytes flow through this process, so all counters
     * are zero. Real throughput data is published by the daemon and
     * read via `readSyncStateBeacon().payload.stats`.
     */
    stats: () => ({
      totalBytesIn: 0,
      totalBytesOut: 0,
      totalBlocksIn: 0,
      totalBlocksOut: 0,
      totalEventsIn: 0,
      bytesPerSecIn: 0,
      bytesPerSecOut: 0,
      windowMs: 5_000,
    }),
    stop: async () => {},
    daemon: { holderPid, lockPath, heldSince },
  };
}

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

  // Daemon coexistence (DISC-27, split form): if another process already
  // owns the sync-singleton slot for this dataDir, we do NOT compete. We
  // become a writer-only client and let the daemon do the network work.
  // Local writes still go straight to disk via nearbytes-log; the daemon's
  // dataDir watcher notices and replicates them.
  if (blockStorageRoot !== undefined) {
    const status = probeSyncLock(blockStorageRoot);
    if (status.running) {
      return makeWriterOnlySync(
        friends,
        servedPks,
        activeProfilePublicKey,
        blockStorageRoot,
        status.holderPid,
        status.lockPath,
        status.heldSince,
      );
    }
  }

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
