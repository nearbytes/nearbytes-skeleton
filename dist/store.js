/**
 * Minimal reactive store — framework-agnostic, Svelte-store-compatible.
 *
 * Implements the Svelte store contract so values can be used directly
 * in Svelte components ($store) without any framework dependency here.
 */
export function writable(initial) {
    let current = initial;
    const subscribers = new Set();
    return {
        subscribe(fn) {
            subscribers.add(fn);
            fn(current);
            return () => { subscribers.delete(fn); };
        },
        get() {
            return current;
        },
        set(value) {
            current = value;
            for (const fn of subscribers)
                fn(current);
        },
        update(fn) {
            this.set(fn(current));
        },
    };
}
export function derived(source, fn) {
    let current = fn(source.get());
    const subscribers = new Set();
    source.subscribe((value) => {
        current = fn(value);
        for (const sub of subscribers)
            sub(current);
    });
    return {
        subscribe(fn) {
            subscribers.add(fn);
            fn(current);
            return () => { subscribers.delete(fn); };
        },
        get() {
            return current;
        },
    };
}
//# sourceMappingURL=store.js.map