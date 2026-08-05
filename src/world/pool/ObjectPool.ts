/**
 * Generic object pool. Objects are created once at construction and reused.
 * No allocations happen inside the update loop.
 */
export class ObjectPool<T> {
  private readonly available: T[] = [];
  private readonly active = new Set<T>();
  private readonly factory: () => T;
  private readonly reset: (item: T) => void;

  constructor(
    factory: () => T,
    options: {
      initialSize: number;
      reset?: (item: T) => void;
    }
  ) {
    this.factory = factory;
    this.reset = options.reset ?? (() => {});
    for (let i = 0; i < options.initialSize; i++) {
      this.available.push(factory());
    }
  }

  acquire(): T | null {
    const item = this.available.pop();
    if (item === undefined) {
      return null;
    }
    this.active.add(item);
    return item;
  }

  release(item: T): void {
    if (!this.active.has(item)) {
      return;
    }
    this.active.delete(item);
    this.reset(item);
    this.available.push(item);
  }

  get activeCount(): number {
    return this.active.size;
  }

  get pooledCount(): number {
    return this.available.length;
  }

  get totalCount(): number {
    return this.available.length + this.active.size;
  }

  dispose(disposeItem: (item: T) => void): void {
    for (const item of this.active) {
      disposeItem(item);
    }
    for (const item of this.available) {
      disposeItem(item);
    }
    this.active.clear();
    this.available.length = 0;
  }
}
