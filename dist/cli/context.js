/**
 * CLI session context — shared mutable state for both immediate and REPL mode.
 *
 * Layering:
 *   createContext  →  createSkeleton(storage)  →  { crypto, log }
 *                 →  createFileService({ log, crypto })
 *
 * Commands use ctx.fileService for all file I/O and ctx.skeleton for
 * volume-state views (ReactiveVolume) and cross-cutting concerns (crypto).
 */
import { createFileService } from 'nearbytes-files';
import { FilesystemStorageBackend } from 'nearbytes-storage';
import { createSkeleton } from '../skeleton.js';
import { createFilesystemWatcher } from '../watcher.js';
import { initializeStorageRoot } from '../rootInit.js';
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
/**
 * Creates a CLI context for the given config.
 *
 * Initialises the storage root on disk (creates directories, writes
 * Nearbytes.html, removes obsolete files), then wires the full service stack:
 *
 *   FilesystemStorageBackend
 *     → createSkeleton  →  { crypto, log }
 *       → createFileService
 *
 * Async because root initialisation touches the filesystem.
 */
export async function createContext(config) {
    await initializeStorageRoot(config.dataDir);
    const storage = new FilesystemStorageBackend(config.dataDir);
    const skeleton = createSkeleton(storage);
    const fileService = createFileService({ log: skeleton.log, crypto: skeleton.crypto });
    const watchers = new Map();
    return {
        config,
        skeleton,
        fileService,
        activeVolume: null,
        watchers,
        destroy() {
            for (const w of watchers.values())
                w.close();
            watchers.clear();
        },
    };
}
// ---------------------------------------------------------------------------
// Volume helpers
// ---------------------------------------------------------------------------
/**
 * Opens a volume (or returns the cached instance) and optionally installs a
 * filesystem watcher that refreshes it whenever the storage directory changes.
 *
 * skeleton.openVolume accepts a raw secret string and handles key derivation
 * and caching internally.
 */
export async function openAndWatch(ctx, secret, watch = true) {
    const rv = await ctx.skeleton.openVolume(secret);
    const { bytesToHex } = await import('nearbytes-crypto');
    const keyHex = bytesToHex(rv.volume.publicKey);
    if (watch && !ctx.watchers.has(keyHex)) {
        const watcher = createFilesystemWatcher(ctx.config.dataDir, rv);
        ctx.watchers.set(keyHex, watcher);
    }
    return rv;
}
/**
 * If the volume for this secret is already cached in the skeleton, refresh its
 * materialised state immediately so REPL subscribers see the latest data.
 * No-op when the volume has not been opened yet (e.g. immediate-mode CLI).
 */
export async function refreshIfOpen(ctx, secret) {
    const { bytesToHex, createSecret } = await import('nearbytes-crypto');
    const keyPair = await ctx.skeleton.crypto.deriveKeys(createSecret(secret));
    const keyHex = bytesToHex(keyPair.publicKey);
    const rv = ctx.skeleton.getVolume(keyHex);
    if (rv !== undefined)
        await rv.refresh();
}
//# sourceMappingURL=context.js.map