/**
 * Generic object pool. Objects are created up front by default; callers may
 * opt into bounded lazy growth for rare objects.
 */
export class ObjectPool<T> {
  private readonly available: T[] = [];
  private readonly active = new Set<T>();
  private readonly factory: () => T;
  private readonly reset: (item: T) => void;
  private readonly maximumSize: number;

  constructor(
    factory: () => T,
    options: {
      initialSize: number;
      maximumSize?: number;
      reset?: (item: T) => void;
    }
  ) {
    this.factory = factory;
    this.reset = options.reset ?? (() => {});
    this.maximumSize = Math.max(options.initialSize, options.maximumSize ?? options.initialSize);
    for (let i = 0; i < options.initialSize; i++) {
      this.available.push(factory());
    }
  }

  acquire(): T | null {
    const item = this.available.pop() ??
      (this.totalCount < this.maximumSize ? this.factory() : undefined);
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
