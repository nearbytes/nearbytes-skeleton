/**
 * CLI session context — shared mutable state for both immediate and REPL mode.
 */
import { createSecret } from 'nearbytes-crypto';
import { FilesystemStorageBackend } from 'nearbytes-storage';
import { createSkeleton } from '../skeleton.js';
import { createFilesystemWatcher } from '../watcher.js';
export function createContext(config) {
    const storage = new FilesystemStorageBackend(config.dataDir);
    const skeleton = createSkeleton(storage);
    const watchers = new Map();
    return {
        config,
        skeleton,
        activeVolume: null,
        watchers,
        destroy() {
            for (const w of watchers.values())
                w.close();
            watchers.clear();
        },
    };
}
/**
 * Opens a volume and (optionally) installs a filesystem watcher that keeps it
 * refreshed automatically.  Idempotent — safe to call multiple times with the
 * same secret.
 */
export async function openAndWatch(ctx, secret, watch = true) {
    const rv = await ctx.skeleton.openVolume(createSecret(secret));
    const { bytesToHex } = await import('nearbytes-crypto');
    const keyHex = bytesToHex(rv.volume.publicKey);
    if (watch && !ctx.watchers.has(keyHex)) {
        const watcher = createFilesystemWatcher(ctx.config.dataDir, rv);
        ctx.watchers.set(keyHex, watcher);
    }
    return rv;
}
//# sourceMappingURL=context.js.map