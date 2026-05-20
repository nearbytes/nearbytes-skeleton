/**
 * Reactive volume — wraps a nearbytes-files Volume in a live, subscribable store.
 *
 * A ReactiveVolume is a Readable<VolumeFileSystemState> that:
 *   - replays the full event log on creation
 *   - can be refreshed manually (refresh())
 *   - notifies all subscribers whenever state changes
 *
 * It is intentionally framework-agnostic: the store contract matches Svelte's
 * so Svelte components can bind to it with $reactiveVolume, but the core has
 * zero Svelte dependency.
 */
import type { Secret } from 'nearbytes-crypto';
import type { CryptoOperations } from 'nearbytes-crypto';
import type { Log } from 'nearbytes-log';
import { type Volume, type VolumeFileSystemState } from 'nearbytes-files';
import { type Readable } from './store.js';
export interface ReactiveVolume extends Readable<VolumeFileSystemState> {
    /** The underlying nearbytes-files Volume (public key, secret). */
    readonly volume: Volume;
    /**
     * Re-materialises the volume from the event log and notifies subscribers.
     * Call this after any write operation or after a filesystem-change event.
     */
    refresh(): Promise<void>;
    /** True while a refresh is in progress. */
    readonly refreshing: boolean;
}
/**
 * Opens a volume from a secret and returns a reactive view over its state.
 *
 * The returned store is immediately populated via an initial replay; callers
 * should await this function before attaching subscribers that need a
 * fully-loaded state.
 *
 * @param secret  - Volume secret (branded type from nearbytes-crypto)
 * @param crypto  - Cryptographic operations (from nearbytes-crypto)
 * @param log     - Event log (from nearbytes-log)
 */
export declare function createReactiveVolume(secret: Secret, crypto: CryptoOperations, log: Log): Promise<ReactiveVolume>;
//# sourceMappingURL=volume.d.ts.map