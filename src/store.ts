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

export function writable<T>(initial: T): Writable<T> {
  let current = initial;
  const subscribers = new Set<Subscriber<T>>();

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
      for (const fn of subscribers) fn(current);
    },
    update(fn) {
      this.set(fn(current));
    },
  };
}

export function derived<T, U>(
  source: Readable<T>,
  fn: (value: T) => U,
): Readable<U> {
  let current = fn(source.get());
  const subscribers = new Set<Subscriber<U>>();

  source.subscribe((value) => {
    current = fn(value);
    for (const sub of subscribers) sub(current);
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
