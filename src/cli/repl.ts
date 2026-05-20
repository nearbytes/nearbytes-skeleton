/**
 * Interactive REPL (Read-Eval-Print Loop) for nearbytes-skeleton.
 *
 * Launched with `nbf repl [--secret <s>] [--data-dir <d>]`.
 * Maintains a persistent Context across commands — opened volumes stay open.
 *
 * Command grammar is deliberately minimal:
 *   <verb> [<noun>] [<args>...]   — positional, no flags (flags are for one-shot mode)
 *
 * Examples:
 *   setup myvolume:password
 *   volume open myvolume:password
 *   file add /path/to/file.txt readme.txt
 *   file list
 *   file get readme.txt /tmp/out.txt
 *   file rm readme.txt
 */

import * as readline from 'readline';
import { cyan, dim, green, red, bold } from './output.js';
import {
  cmdSetup,
  cmdVolumeOpen,
  cmdVolumeInfo,
  cmdUse,
  cmdVolumes,
  cmdFileAdd,
  cmdFileList,
  cmdFileGet,
  cmdFileRemove,
  cmdRefresh,
  cmdHelp,
} from './commands.js';
import type { Context } from './context.js';

// ---------------------------------------------------------------------------
// Tokeniser
// ---------------------------------------------------------------------------

function tokenise(line: string): string[] {
  // Basic shell-like split: honour "quoted strings"
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (const ch of line.trim()) {
    if (inQuote) {
      if (ch === quoteChar) { inQuote = false; }
      else { current += ch; }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (current.length > 0) { tokens.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

async function dispatch(ctx: Context, tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;

  const [verb, ...rest] = tokens;

  switch (verb.toLowerCase()) {
    // ---- meta ----
    case 'help':
      cmdHelp();
      break;

    case 'exit':
    case 'quit':
      ctx.destroy();
      process.exit(0);
      break;

    // ---- setup ----
    case 'setup': {
      const [secret] = rest;
      if (!secret) throw new Error('Usage: setup <secret>');
      await cmdSetup(ctx, secret);
      break;
    }

    // ---- volume ----
    case 'volume': {
      const [subverb, ...subargs] = rest;
      if (!subverb || subverb === 'open') {
        const [secret] = subargs.length > 0 ? subargs : rest;
        if (!secret) throw new Error('Usage: volume open <secret>');
        await cmdVolumeOpen(ctx, secret);
      } else if (subverb === 'info' || subverb === 'show') {
        await cmdVolumeInfo(ctx);
      } else {
        throw new Error(`Unknown volume sub-command: ${subverb}`);
      }
      break;
    }

    case 'volumes':
      await cmdVolumes(ctx);
      break;

    case 'use': {
      const [target] = rest;
      if (!target) throw new Error('Usage: use <key-prefix|secret>');
      await cmdUse(ctx, target);
      break;
    }

    case 'info':
      await cmdVolumeInfo(ctx);
      break;

    case 'refresh':
      await cmdRefresh(ctx);
      break;

    // ---- file ----
    case 'file': {
      const [subverb, ...subargs] = rest;
      switch ((subverb ?? '').toLowerCase()) {
        case 'add': {
          // file add <path> [name] [-s <secret>]
          const [filePath, name] = subargs;
          if (!filePath) throw new Error('Usage: file add <path> [name]');
          const secret = resolveSecret(ctx, subargs);
          await cmdFileAdd(ctx, filePath, secret, name && !name.startsWith('-') ? name : undefined);
          break;
        }
        case 'list':
        case 'ls': {
          const secret = resolveSecret(ctx, subargs);
          await cmdFileList(ctx, secret);
          break;
        }
        case 'get': {
          const [fileName, outputPath] = subargs;
          if (!fileName || !outputPath) throw new Error('Usage: file get <name> <output-path>');
          const secret = resolveSecret(ctx, subargs);
          await cmdFileGet(ctx, fileName, secret, outputPath);
          break;
        }
        case 'rm':
        case 'remove':
        case 'del':
        case 'delete': {
          const [fileName] = subargs;
          if (!fileName) throw new Error('Usage: file rm <name>');
          const secret = resolveSecret(ctx, subargs);
          await cmdFileRemove(ctx, fileName, secret);
          break;
        }
        default:
          throw new Error(`Unknown file sub-command: ${subverb ?? '(none)'}. Try "help".`);
      }
      break;
    }

    default:
      throw new Error(`Unknown command: ${verb}. Type "help" for a list of commands.`);
  }
}

/**
 * Resolves the secret for a command: uses -s / --secret flag from the token
 * list, falls back to the active volume's secret, then throws.
 */
function resolveSecret(ctx: Context, tokens: string[]): string {
  const flagIdx = tokens.findIndex((t) => t === '-s' || t === '--secret');
  if (flagIdx !== -1 && tokens[flagIdx + 1]) {
    return tokens[flagIdx + 1]!;
  }
  if (ctx.activeVolume) {
    return ctx.activeVolume.volume.secret as string;
  }
  throw new Error('No active volume and no -s <secret> provided');
}

// ---------------------------------------------------------------------------
// REPL loop
// ---------------------------------------------------------------------------

export async function startRepl(ctx: Context): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: cyan('nbf') + dim(' › ') ,
    completer: (line: string) => {
      const completions = [
        'setup', 'volume open', 'volumes', 'use', 'info', 'refresh',
        'file add', 'file list', 'file get', 'file rm', 'help', 'exit',
      ];
      const hits = completions.filter((c) => c.startsWith(line));
      return [hits.length > 0 ? hits : completions, line];
    },
  });

  console.log(bold('Nearbytes skeleton REPL') + dim(' — type "help" for commands, ^D to exit'));
  console.log('');

  // If the user already configured volumes in config, open them
  for (const vc of ctx.config.volumes) {
    try {
      await cmdVolumeOpen(ctx, vc.secret);
      ctx.activeVolume = ctx.skeleton.getVolume(
        Array.from(ctx.skeleton.volumes.keys())[ctx.skeleton.volumes.size - 1] ?? '',
      ) ?? null;
    } catch {
      // Non-fatal — volume may not exist on disk yet
    }
  }

  rl.prompt();

  rl.on('line', (line) => {
    const tokens = tokenise(line);
    if (tokens.length === 0) { rl.prompt(); return; }

    dispatch(ctx, tokens)
      .then(() => rl.prompt())
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(red(`✗ ${msg}`));
        rl.prompt();
      });
  });

  rl.on('close', () => {
    console.log('');
    console.log(dim('Goodbye.'));
    ctx.destroy();
    process.exit(0);
  });
}
