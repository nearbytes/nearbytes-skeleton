/**
 * Command handlers — pure async functions, framework-free.
 *
 * Each handler receives a Context and whatever arguments it needs, then
 * writes human-readable output to stdout.  The same functions are called from:
 *   - Commander.js (immediate mode): program.action(() => handler(ctx, ...))
 *   - REPL (interpreter mode): tokenised input dispatched here
 *
 * Errors are thrown as plain Error objects; callers decide whether to exit
 * the process (immediate mode) or print the message and continue (REPL).
 */

import { readFile, writeFile } from 'fs/promises';
import { basename } from 'path';
import { bytesToHex } from 'nearbytes-crypto';
import { storeData, retrieveData, deleteFile, setupChannel, listFiles, getFile } from 'nearbytes-files';
import { green, yellow, red, cyan, dim, bold, formatFileTable } from './output.js';
import { type Context, openAndWatch } from './context.js';

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------

/** Initialise a new channel (derives keys, stores nothing). */
export async function cmdSetup(ctx: Context, secret: string): Promise<void> {
  const result = await setupChannel(secret as `${string}:${string}`, ctx.skeleton.crypto);
  console.log(green('✓ Channel initialised'));
  console.log(`  Public key: ${bytesToHex(result.publicKey)}`);
}

// ---------------------------------------------------------------------------
// volume open / info / use
// ---------------------------------------------------------------------------

/** Open a volume, materialise its state, and print a summary. */
export async function cmdVolumeOpen(
  ctx: Context,
  secret: string,
  watch = true,
): Promise<void> {
  const rv = await openAndWatch(ctx, secret, watch);
  const state = rv.get();
  const keyHex = bytesToHex(rv.volume.publicKey);
  console.log(green('✓ Volume opened'));
  console.log(`  Public key: ${keyHex}`);
  console.log(`  Files     : ${state.files.size}`);
  if (state.files.size > 0) {
    console.log('');
    console.log(formatFileTable(state.files));
  }
}

/** Print info for the currently-active volume. */
export async function cmdVolumeInfo(ctx: Context): Promise<void> {
  if (!ctx.activeVolume) {
    throw new Error('No active volume — use `volume open <secret>` or `use <key>` first');
  }
  const state = ctx.activeVolume.get();
  const keyHex = bytesToHex(ctx.activeVolume.volume.publicKey);
  console.log(`${bold('Public key:')} ${keyHex}`);
  console.log(`${bold('Files:')}      ${state.files.size}`);
}

/** Set the active volume by public-key hex prefix or full key. */
export async function cmdUse(ctx: Context, keyPrefixOrSecret: string): Promise<void> {
  let rv = ctx.skeleton.getVolume(keyPrefixOrSecret);

  if (!rv) {
    // Maybe it's a prefix
    for (const [key, vol] of ctx.skeleton.volumes) {
      if (key.startsWith(keyPrefixOrSecret)) {
        rv = vol;
        break;
      }
    }
  }

  if (!rv) {
    // Treat as a secret and open it
    rv = await openAndWatch(ctx, keyPrefixOrSecret);
  }

  ctx.activeVolume = rv;
  console.log(green(`✓ Active volume: ${bytesToHex(rv.volume.publicKey)}`));
}

// ---------------------------------------------------------------------------
// file add
// ---------------------------------------------------------------------------

export async function cmdFileAdd(
  ctx: Context,
  filePath: string,
  secret: string,
  name?: string,
): Promise<void> {
  const secret_ = secret as `${string}:${string}`;
  const fileName = name ?? basename(filePath);
  if (!fileName || fileName.trim().length === 0) throw new Error('File name cannot be empty');

  const data = new Uint8Array(await readFile(filePath));

  const result = await storeData(data, fileName, secret_, ctx.skeleton.crypto, ctx.skeleton.log);

  console.log(green('✓ File added'));
  console.log(`  Name      : ${fileName}`);
  console.log(`  Event hash: ${result.eventHash}`);
  console.log(`  Data hash : ${result.dataHash}`);
  console.log(`  Size      : ${data.length} bytes`);

  // Refresh the cached volume if it's already open
  const rv = await openAndWatch(ctx, secret, false);
  await rv.refresh();
}

// ---------------------------------------------------------------------------
// file list
// ---------------------------------------------------------------------------

export async function cmdFileList(ctx: Context, secret: string): Promise<void> {
  const rv = await openAndWatch(ctx, secret, false);
  const state = rv.get();
  if (state.files.size === 0) {
    console.log(yellow('  (no files)'));
    return;
  }
  console.log(green(`✓ ${state.files.size} file(s) in volume:`));
  console.log('');
  console.log(formatFileTable(state.files));
}

// ---------------------------------------------------------------------------
// file get
// ---------------------------------------------------------------------------

export async function cmdFileGet(
  ctx: Context,
  fileName: string,
  secret: string,
  outputPath: string,
): Promise<void> {
  const secret_ = secret as `${string}:${string}`;
  const rv = await openAndWatch(ctx, secret, false);
  const state = rv.get();

  const meta = getFile(state, fileName);
  if (!meta) throw new Error(`File "${fileName}" not found in volume`);

  const data = await retrieveData(meta.eventHash, secret_, ctx.skeleton.crypto, ctx.skeleton.log);
  await writeFile(outputPath, data);

  console.log(green('✓ File retrieved'));
  console.log(`  Name   : ${fileName}`);
  console.log(`  Output : ${outputPath}`);
  console.log(`  Size   : ${data.length} bytes`);
}

// ---------------------------------------------------------------------------
// file remove
// ---------------------------------------------------------------------------

export async function cmdFileRemove(
  ctx: Context,
  fileName: string,
  secret: string,
): Promise<void> {
  const secret_ = secret as `${string}:${string}`;
  const result = await deleteFile(fileName, secret_, ctx.skeleton.crypto, ctx.skeleton.log);

  console.log(green('✓ File removed'));
  console.log(`  Name      : ${fileName}`);
  console.log(`  Event hash: ${result.eventHash}`);

  const rv = await openAndWatch(ctx, secret, false);
  await rv.refresh();
}

// ---------------------------------------------------------------------------
// refresh
// ---------------------------------------------------------------------------

export async function cmdRefresh(ctx: Context): Promise<void> {
  const target = ctx.activeVolume;
  if (!target) {
    throw new Error('No active volume');
  }
  await target.refresh();
  const state = target.get();
  console.log(green(`✓ Refreshed — ${state.files.size} file(s)`));
}

// ---------------------------------------------------------------------------
// volumes (list open volumes)
// ---------------------------------------------------------------------------

export async function cmdVolumes(ctx: Context): Promise<void> {
  if (ctx.skeleton.volumes.size === 0) {
    console.log(yellow('  (no open volumes)'));
    return;
  }
  const active = ctx.activeVolume ? bytesToHex(ctx.activeVolume.volume.publicKey) : null;
  for (const [key, rv] of ctx.skeleton.volumes) {
    const marker = key === active ? cyan('▶ ') : '  ';
    const count = rv.get().files.size;
    console.log(`${marker}${key.slice(0, 16)}…  ${dim(`${count} file(s)`)}`);
  }
}

// ---------------------------------------------------------------------------
// help
// ---------------------------------------------------------------------------

export function cmdHelp(): void {
  console.log(`
${bold('Nearbytes skeleton REPL')}

${cyan('Volume commands')}
  setup <secret>                 Initialise a channel
  volume open <secret>           Open a volume and display info
  volumes                        List all open volumes
  use <key-prefix|secret>        Set active volume
  info                           Show active volume info
  refresh                        Reload active volume state

${cyan('File commands')} ${dim('(active volume or explicit secret)')}
  file add <path> [name] [-s]    Add a file
  file list [-s <secret>]        List files
  file get <name> <out> [-s]     Retrieve a file
  file rm <name> [-s <secret>]   Remove a file

${cyan('REPL meta')}
  help                           Show this message
  exit / quit / ^D               Exit the REPL
`);
}

// Suppress unused-import warnings — these are re-exported for callers
export { red };
