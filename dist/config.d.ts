/**
 * Nearbytes skeleton configuration.
 *
 * Loaded from a JSON file on disk (default: ~/.nearbytes/config.json).
 * In the future this will live inside a nearbytes volume itself — the bootstrap
 * will read a "config" channel, replay it, and derive the rest of the app state.
 *
 * For now the file is plain JSON so the skeleton can boot without a secret.
 */
export interface VolumeConfig {
    /** Human-readable label for this volume. */
    readonly label: string;
    /** Volume secret string in "name:password" format. */
    readonly secret: string;
}
export interface NearbytesConfig {
    /** Root directory for all local storage. Defaults to ~/nearbytes/local. */
    readonly dataDir: string;
    /** Pre-configured volumes (optional — volumes can also be opened ad-hoc). */
    readonly volumes: ReadonlyArray<VolumeConfig>;
}
/** Returns the default config file path (overridable via NEARBYTES_CONFIG). */
export declare function defaultConfigPath(): string;
/** Returns the default storage directory (overridable via NEARBYTES_STORAGE_DIR). */
export declare function defaultDataDir(): string;
/**
 * Reads and parses the config file.
 *
 * Missing or empty config files are silently accepted — callers fall back to
 * defaults.  Malformed JSON or unexpected shapes throw an error with context.
 *
 * @param configPath - Path to the JSON config file (default: `defaultConfigPath()`)
 */
export declare function readConfig(configPath?: string): Promise<NearbytesConfig>;
//# sourceMappingURL=config.d.ts.map