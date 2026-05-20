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
import { openVolume, materializeVolume, } from 'nearbytes-files';
import { writable } from './store.js';
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
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
export async function createReactiveVolume(secret, crypto, log) {
    const volume = await openVolume(secret, crypto);
    const initialState = await materializeVolume(volume, log, crypto);
    const store = writable(initialState);
    let refreshing = false;
    const reactiveVolume = {
        subscribe: store.subscribe.bind(store),
        get: store.get.bind(store),
        volume,
        async refresh() {
            if (refreshing)
                return;
            refreshing = true;
            try {
                const state = await materializeVolume(volume, log, crypto);
                store.set(state);
            }
            finally {
                refreshing = false;
            }
        },
        get refreshing() {
            return refreshing;
        },
    };
    return reactiveVolume;
}
//# sourceMappingURL=volume.js.map