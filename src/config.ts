/**
 * Nearbytes skeleton configuration.
 *
 * Loaded from a JSON file on disk (default: ~/.nearbytes/config.json).
 * In the future this will live inside a nearbytes volume itself — the bootstrap
 * will read a "config" channel, replay it, and derive the rest of the app state.
 *
 * For now the file is plain JSON so the skeleton can boot without a secret.
 */

import { mkdir, readFile, rename, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { randomBytes } from 'crypto';
import path from 'path';
import os from 'os';

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

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.nearbytes');
const DEFAULT_CONFIG_FILE = path.join(DEFAULT_CONFIG_DIR, 'config.json');
const DEFAULT_DATA_DIR = path.join(os.homedir(), 'nearbytes', 'local');

/** Returns the default config file path (overridable via NEARBYTES_CONFIG). */
export function defaultConfigPath(): string {
  return process.env['NEARBYTES_CONFIG'] ?? DEFAULT_CONFIG_FILE;
}

/** Returns the default storage directory (overridable via NEARBYTES_STORAGE_DIR). */
export function defaultDataDir(): string {
  return process.env['NEARBYTES_STORAGE_DIR'] ?? DEFAULT_DATA_DIR;
}

const EMPTY_CONFIG: NearbytesConfig = {
  dataDir: defaultDataDir(),
  volumes: [],
  friends: [],
  profiles: [],
  activeProfile: null,
};

/** Config-shaped defaults when no config file is present. */
export function emptyConfig(dataDir: string = defaultDataDir()): NearbytesConfig {
  return { dataDir, volumes: [], friends: [], profiles: [], activeProfile: null };
}

/**
 * Refuse to load the config file if its POSIX permissions allow anyone other
 * than the owning user to read or write it. The config contains profile and
 * volume secrets in cleartext (those strings ARE the inputs to
 * `crypto.deriveKeys`), so a group- or world-readable file — which is what
 * the default `umask 022` produces — is a credential leak: any local user
 * could read the file and sync as that profile or open any listed volume.
 *
 * On Windows there is no POSIX-mode equivalent we can rely on (ACLs are out
 * of scope here), so the check no-ops there.
 *
 * To fix on an existing install: `chmod 600 ~/.nearbytes/config.json`.
 */
export async function assertSecureConfigPermissions(filePath: string): Promise<void> {
  if (process.platform === 'win32') return;
  const st = await stat(filePath);
  const euid = process.geteuid?.();
  if (euid !== undefined && st.uid !== euid) {
    throw new Error(
      `Config file ${filePath} is owned by UID ${st.uid} (not your UID ${euid}). ` +
        `Refusing to load — config contains profile/volume secrets in cleartext.`,
    );
  }
  if ((st.mode & 0o077) !== 0) {
    const octal = (st.mode & 0o777).toString(8).padStart(3, '0');
    throw new Error(
      `Config file ${filePath} is group/world-accessible (mode ${octal}). ` +
        `Refusing to load — config contains profile/volume secrets in cleartext. ` +
        `Run: chmod 600 ${filePath}`,
    );
  }
}

/**
 * Reads and parses the config file.
 *
 * Missing or empty config files are silently accepted — callers fall back to
 * defaults.  Malformed JSON or unexpected shapes throw an error with context.
 * Files with insecure POSIX permissions (group/world readable) are also
 * refused, see `assertSecureConfigPermissions`.
 *
 * @param configPath - Path to the JSON config file (default: `defaultConfigPath()`)
 */
export async function readConfig(configPath?: string): Promise<NearbytesConfig> {
  const filePath = configPath ?? defaultConfigPath();

  if (!existsSync(filePath)) {
    return EMPTY_CONFIG;
  }

  await assertSecureConfigPermissions(filePath);

  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Cannot read config file ${filePath}: ${String(err)}`);
  }

  if (raw.trim().length === 0) {
    return EMPTY_CONFIG;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Config file ${filePath} contains invalid JSON`);
  }

  return mergeWithDefaults(parsed);
}

function mergeWithDefaults(raw: unknown): NearbytesConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Config must be a JSON object');
  }
  const obj = raw as Record<string, unknown>;

  const dataDir =
    typeof obj['dataDir'] === 'string' && obj['dataDir'].trim().length > 0
      ? obj['dataDir'].trim()
      : defaultDataDir();

  const volumes: VolumeConfig[] = [];
  if (Array.isArray(obj['volumes'])) {
    for (const v of obj['volumes']) {
      if (
        typeof v === 'object' &&
        v !== null &&
        typeof (v as Record<string, unknown>)['label'] === 'string' &&
        typeof (v as Record<string, unknown>)['secret'] === 'string'
      ) {
        volumes.push({
          label: (v as Record<string, unknown>)['label'] as string,
          secret: (v as Record<string, unknown>)['secret'] as string,
        });
      }
    }
  }

  const friends: string[] = [];
  if (Array.isArray(obj['friends'])) {
    for (const f of obj['friends']) {
      if (typeof f === 'string' && f.trim().length > 0) {
        friends.push(f.trim().toLowerCase());
      }
    }
  }

  const profiles = readProfiles(obj);
  const activeProfile = readActiveProfile(obj, profiles);

  return { dataDir, volumes, friends, profiles, activeProfile };
}

/**
 * Reads `profiles` from a config object, with an in-place upgrade from the
 * legacy singular `profileSecret: string` field (per `sync-discovery-v1.md`
 * DISC-33): when present, it is materialised as `[{ name: "default", secret }]`.
 */
function readProfiles(obj: Record<string, unknown>): ProfileConfig[] {
  const profiles: ProfileConfig[] = [];
  const seen = new Set<string>();
  if (Array.isArray(obj['profiles'])) {
    for (const entry of obj['profiles']) {
      if (typeof entry !== 'object' || entry === null) continue;
      const e = entry as Record<string, unknown>;
      const name = typeof e['name'] === 'string' ? e['name'].trim() : '';
      const secret = typeof e['secret'] === 'string' ? e['secret'].trim() : '';
      if (name.length === 0 || secret.length === 0 || seen.has(name)) continue;
      seen.add(name);
      profiles.push({ name, secret });
    }
  }
  if (profiles.length === 0 && typeof obj['profileSecret'] === 'string') {
    const legacy = (obj['profileSecret'] as string).trim();
    if (legacy.length > 0) {
      profiles.push({ name: 'default', secret: legacy });
    }
  }
  return profiles;
}

function readActiveProfile(
  obj: Record<string, unknown>,
  profiles: readonly ProfileConfig[],
): string | null {
  if (profiles.length === 0) return null;
  const names = new Set(profiles.map((p) => p.name));
  const raw = obj['activeProfile'];
  if (typeof raw === 'string' && names.has(raw)) return raw;
  return profiles[0]!.name;
}

/**
 * Writes config JSON (creates parent directory if needed).
 *
 * The file is always created with POSIX mode `0o600` (owner read+write only)
 * because it contains profile and volume secrets in cleartext. Atomic
 * publish via unique tmp + rename: the tmp is created with `mode: 0o600`
 * which `fs.writeFile` honours on file creation, and `fs.rename` preserves
 * the source file's mode bits at the destination — so even when overwriting
 * a previously group-readable config, the final file lands at `0o600`.
 *
 * The tmp suffix is randomised so concurrent writers cannot collide on each
 * other's scratch file (same idiom as the content-addressed publish path in
 * `nearbytes-log/fsIo`).
 *
 * `mode` is ignored on Windows; ACLs there are out of scope. POSIX umask
 * cannot loosen the file beyond `0o600` either, because `(0o600 & ~umask)`
 * has no group/world bits to clear for any umask value.
 */
export async function writeConfig(config: NearbytesConfig, configPath?: string): Promise<void> {
  const filePath = configPath ?? defaultConfigPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const body = {
    dataDir: config.dataDir,
    volumes: config.volumes.map((v) => ({ label: v.label, secret: v.secret })),
    friends: [...config.friends],
    profiles: config.profiles.map((p) => ({ name: p.name, secret: p.secret })),
    activeProfile: config.activeProfile,
  };
  const tmp = `${filePath}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    await writeFile(tmp, `${JSON.stringify(body, null, 2)}\n`, { encoding: 'utf-8', mode: 0o600 });
    await rename(tmp, filePath);
  } catch (err) {
    try {
      const { unlink } = await import('fs/promises');
      await unlink(tmp);
    } catch {
      /* tmp may not exist — best-effort cleanup */
    }
    throw err;
  }
}
