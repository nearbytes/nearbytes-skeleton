/**
 * Minimal reactive store — framework-agnostic, Svelte-store-compatible.
 *
 * Implements the Svelte store contract so values can be used directly
 * in Svelte components ($store) without any framework dependency here.
 */
export type Subscriber<T> = (value: T) => void;
export type Unsubscriber = () => void;
export interface Readable<T> {
    subscribe(fn: Subscriber<T>): Unsubscriber;
    get(): T;
}
export interface Writable<T> extends Readable<T> {
    set(value: T): void;
    update(fn: (current: T) => T): void;
}
export declare function writable<T>(initial: T): Writable<T>;
export declare function derived<T, U>(source: Readable<T>, fn: (value: T) => U): Readable<U>;
//# sourceMappingURL=store.d.ts.map