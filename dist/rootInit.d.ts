/**
 * Storage root initialisation — ensures the on-disk layout required by the
 * Nearbytes meta-storage specification exists and is up to date.
 *
 * Spec reference: storage/meta-storage-v2.md §4.1
 *
 * On-disk layout maintained by this module:
 *
 *   <root>/
 *     Nearbytes.html          ← discovery marker, rewritten on every startup
 *     blocks/
 *       <sha256-hex>.bin      ← encrypted content blocks
 *     channels/
 *       <pubkey-hex>/         ← one directory per volume
 *         <event-hash>.bin    ← signed, encrypted events
 *
 * Node.js only: this module uses fs/promises and MUST NOT be imported in
 * browser bundles.  The package.json "browser" field or conditional exports
 * should map this module to a no-op shim when targeting browsers.
 */
/**
 * Ensures the storage root at `dataDir` conforms to the Nearbytes
 * meta-storage specification (§4.1):
 *
 *  - Creates `blocks/` and `channels/` directories if missing.
 *  - Writes `Nearbytes.html` (always, to keep it current with this version).
 *  - Deletes `Nearbytes.json` if present (obsolete format; spec §4.1 rule 7).
 *
 * Idempotent and safe to call on every startup or after a conflict repair.
 *
 * @param dataDir - Absolute path to the storage root directory.
 */
export declare function initializeStorageRoot(dataDir: string): Promise<void>;
//# sourceMappingURL=rootInit.d.ts.map