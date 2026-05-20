/**
 * Nearbytes skeleton configuration.
 *
 * Loaded from a JSON file on disk (default: ~/.nearbytes/config.json).
 * In the future this will live inside a nearbytes volume itself — the bootstrap
 * will read a "config" channel, replay it, and derive the rest of the app state.
 *
 * For now the file is plain JSON so the skeleton can boot without a secret.
 */
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
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
};
// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------
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
    return { dataDir, volumes };
}
//# sourceMappingURL=config.js.map