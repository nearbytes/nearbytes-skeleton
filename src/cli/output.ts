/**
 * Terminal output helpers — ANSI colours and simple formatters.
 * Colour output is suppressed when stdout is not a TTY (pipes, CI, etc.).
 */

const isTTY = process.stdout.isTTY === true;

function wrap(code: number, reset: number) {
  return (s: string): string =>
    isTTY ? `\x1b[${code}m${s}\x1b[${reset}m` : s;
}

export const green  = wrap(32, 39);
export const yellow = wrap(33, 39);
export const red    = wrap(31, 39);
export const cyan   = wrap(36, 39);
export const dim    = wrap(2,  22);
export const bold   = wrap(1,  22);

/** Format a Map<name, {contentAddress, eventHash}> as a compact table. */
export function formatFileTable(
  files: ReadonlyMap<string, { name: string; contentAddress: string; eventHash: string }>,
): string {
  if (files.size === 0) return yellow('  (no files)');
  const rows = Array.from(files.values()).sort((a, b) => a.name.localeCompare(b.name));
  const col1 = Math.min(40, Math.max(...rows.map((r) => r.name.length)) + 2);
  const header =
    bold('Name'.padEnd(col1)) + bold('Content Hash'.padEnd(18)) + bold('Event Hash');
  const sep = dim('─'.repeat(col1 + 18 + 16));
  const body = rows.map((r) => {
    const name = r.name.length > col1 - 2 ? r.name.slice(0, col1 - 5) + '...' : r.name;
    return name.padEnd(col1) + r.contentAddress.slice(0, 16) + '…  ' + r.eventHash.slice(0, 16) + '…';
  });
  return [header, sep, ...body].join('\n');
}
