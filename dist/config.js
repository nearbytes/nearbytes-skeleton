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
const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.nearbytes');
const DEFAULT_CONFIG_FILE = path.join(DEFAULT_CONFIG_DIR, 'config.json');
const DEFAULT_DATA_DIR = path.join(os.homedir(), 'nearbytes', 'local');
/** Returns the default config file path (overridable via NEARBYTES_CONFIG). */
export function defaultConfigPath() {
    return process.env['NEARBYTES_CONFIG'] ?? DEFAULT_CONFIG_FILE;
}
/** Returns the default storage directory (overridable via NEARBYTES_STORAGE_DIR). */
export function defaultDataDir() {
    return process.env['NEARBYTES_STORAGE_DIR'] ?? DEFAULT_DATA_DIR;
}
const EMPTY_CONFIG = {
    dataDir: defaultDataDir(),
    volumes: [],
    friends: [],
    profiles: [],
    activeProfile: null,
};
/** Config-shaped defaults when no config file is present. */
export function emptyConfig(dataDir = defaultDataDir()) {
    return { dataDir, volumes: [], friends: [], profiles: [], activeProfile: null };
}
/**
 * Reads and parses the config file.
 *
 * Missing or empty config files are silently accepted — callers fall back to
 * defaults.  Malformed JSON or unexpected shapes throw an error with context.
 *
 * @param configPath - Path to the JSON config file (default: `defaultConfigPath()`)
 */
export async function readConfig(configPath) {
    const filePath = configPath ?? defaultConfigPath();
    if (!existsSync(filePath)) {
        return EMPTY_CONFIG;
    }
    let raw;
    try {
        raw = await readFile(filePath, 'utf-8');
    }
    catch (err) {
        throw new Error(`Cannot read config file ${filePath}: ${String(err)}`);
    }
    if (raw.trim().length === 0) {
        return EMPTY_CONFIG;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new Error(`Config file ${filePath} contains invalid JSON`);
    }
    return mergeWithDefaults(parsed);
}
function mergeWithDefaults(raw) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        throw new Error('Config must be a JSON object');
    }
    const obj = raw;
    const dataDir = typeof obj['dataDir'] === 'string' && obj['dataDir'].trim().length > 0
        ? obj['dataDir'].trim()
        : defaultDataDir();
    const volumes = [];
    if (Array.isArray(obj['volumes'])) {
        for (const v of obj['volumes']) {
            if (typeof v === 'object' &&
                v !== null &&
                typeof v['label'] === 'string' &&
                typeof v['secret'] === 'string') {
                volumes.push({
                    label: v['label'],
                    secret: v['secret'],
                });
            }
        }
    }
    const friends = [];
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
function readProfiles(obj) {
    const profiles = [];
    const seen = new Set();
    if (Array.isArray(obj['profiles'])) {
        for (const entry of obj['profiles']) {
            if (typeof entry !== 'object' || entry === null)
                continue;
            const e = entry;
            const name = typeof e['name'] === 'string' ? e['name'].trim() : '';
            const secret = typeof e['secret'] === 'string' ? e['secret'].trim() : '';
            if (name.length === 0 || secret.length === 0 || seen.has(name))
                continue;
            seen.add(name);
            profiles.push({ name, secret });
        }
    }
    if (profiles.length === 0 && typeof obj['profileSecret'] === 'string') {
        const legacy = obj['profileSecret'].trim();
        if (legacy.length > 0) {
            profiles.push({ name: 'default', secret: legacy });
        }
    }
    return profiles;
}
function readActiveProfile(obj, profiles) {
    if (profiles.length === 0)
        return null;
    const names = new Set(profiles.map((p) => p.name));
    const raw = obj['activeProfile'];
    if (typeof raw === 'string' && names.has(raw))
        return raw;
    return profiles[0].name;
}
/**
 * Writes config JSON (creates parent directory if needed).
 */
export async function writeConfig(config, configPath) {
    const filePath = configPath ?? defaultConfigPath();
    await mkdir(path.dirname(filePath), { recursive: true });
    const body = {
        dataDir: config.dataDir,
        volumes: config.volumes.map((v) => ({ label: v.label, secret: v.secret })),
        friends: [...config.friends],
        profiles: config.profiles.map((p) => ({ name: p.name, secret: p.secret })),
        activeProfile: config.activeProfile,
    };
    await writeFile(filePath, `${JSON.stringify(body, null, 2)}\n`, 'utf-8');
}
//# sourceMappingURL=config.js.map