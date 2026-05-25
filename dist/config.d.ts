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
/**
 * One named profile slot — see `requirements/sync-discovery-v1.md` DISC-33.
 * The `secret` is the seed used by `crypto.deriveKeys`; the public key
 * derived from it is the profile public key carried on the wire.
 */
export interface ProfileConfig {
    /** Local name (unique within `profiles`), used by `profile use <name>`. */
    readonly name: string;
    /** Profile secret (`name:password`); not a volume secret. */
    readonly secret: string;
}
export interface NearbytesConfig {
    /** Root directory for all local storage. Defaults to ~/nearbytes/local. */
    readonly dataDir: string;
    /** Pre-configured volumes (optional — volumes can also be opened ad-hoc). */
    readonly volumes: ReadonlyArray<VolumeConfig>;
    /** Friend profile public keys (hex) for sync; may be empty. Global across profiles. */
    readonly friends: ReadonlyArray<string>;
    /**
     * Local profile slots; may be empty (in which case sync is inert until the
     * first profile is added). See `requirements/sync-protocol-v1.md` SYNC-00.
     */
    readonly profiles: ReadonlyArray<ProfileConfig>;
    /**
     * Name of the active profile (the one that signs `profile publish` and is
     * used as the follower identity for outbound discovery). MUST be `null`
     * when `profiles` is empty, otherwise MUST be one of `profiles[i].name`.
     */
    readonly activeProfile: string | null;
}
/** Returns the default config file path (overridable via NEARBYTES_CONFIG). */
export declare function defaultConfigPath(): string;
/** Returns the default storage directory (overridable via NEARBYTES_STORAGE_DIR). */
export declare function defaultDataDir(): string;
/** Config-shaped defaults when no config file is present. */
export declare function emptyConfig(dataDir?: string): NearbytesConfig;
/**
 * Reads and parses the config file.
 *
 * Missing or empty config files are silently accepted — callers fall back to
 * defaults.  Malformed JSON or unexpected shapes throw an error with context.
 *
 * @param configPath - Path to the JSON config file (default: `defaultConfigPath()`)
 */
export declare function readConfig(configPath?: string): Promise<NearbytesConfig>;
/**
 * Writes config JSON (creates parent directory if needed).
 */
export declare function writeConfig(config: NearbytesConfig, configPath?: string): Promise<void>;
//# sourceMappingURL=config.d.ts.map