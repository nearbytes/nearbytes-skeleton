/**
 * Nearbytes skeleton configuration.
 *
 * Loaded from a JSON file on disk (default: ~/.nearbytes/config.json).
 * In the future this will live inside a nearbytes volume itself — the bootstrap
 * will read a "config" channel, replay it, and derive the rest of the app state.
 *
 * For now the file is plain JSON so the skeleton can boot without a secret.
 */

import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

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
  /** Friend profile public keys (hex) for sync; may be empty. */
  readonly friends: ReadonlyArray<string>;
  /** Secret for your profile channel (`name:password`); not a volume secret. */
  readonly profileSecret?: string;
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
};

/** Config-shaped defaults when no config file is present. */
export function emptyConfig(dataDir: string = defaultDataDir()): NearbytesConfig {
  return { dataDir, volumes: [], friends: [] };
}

/**
 * Reads and parses the config file.
 *
 * Missing or empty config files are silently accepted — callers fall back to
 * defaults.  Malformed JSON or unexpected shapes throw an error with context.
 *
 * @param configPath - Path to the JSON config file (default: `defaultConfigPath()`)
 */
export async function readConfig(configPath?: string): Promise<NearbytesConfig> {
  const filePath = configPath ?? defaultConfigPath();

  if (!existsSync(filePath)) {
    return EMPTY_CONFIG;
  }

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

  const profileSecret =
    typeof obj['profileSecret'] === 'string' && obj['profileSecret'].trim().length > 0
      ? obj['profileSecret'].trim()
      : undefined;

  return { dataDir, volumes, friends, profileSecret };
}

/**
 * Writes config JSON (creates parent directory if needed).
 */
export async function writeConfig(config: NearbytesConfig, configPath?: string): Promise<void> {
  const filePath = configPath ?? defaultConfigPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const body = {
    dataDir: config.dataDir,
    volumes: config.volumes.map((v) => ({ label: v.label, secret: v.secret })),
    friends: [...config.friends],
    ...(config.profileSecret ? { profileSecret: config.profileSecret } : {}),
  };
  await writeFile(filePath, `${JSON.stringify(body, null, 2)}\n`, 'utf-8');
}
