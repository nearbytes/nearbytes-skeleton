/**
 * Terminal output helpers — ANSI colours and simple formatters.
 * Colour output is suppressed when stdout is not a TTY (pipes, CI, etc.).
 */
export declare const green: (s: string) => string;
export declare const yellow: (s: string) => string;
export declare const red: (s: string) => string;
export declare const cyan: (s: string) => string;
export declare const dim: (s: string) => string;
export declare const bold: (s: string) => string;
/** Format a Map<name, {contentAddress, eventHash}> as a compact table. */
export declare function formatFileTable(files: ReadonlyMap<string, {
    name: string;
    contentAddress: string;
    eventHash: string;
}>): string;
//# sourceMappingURL=output.d.ts.map