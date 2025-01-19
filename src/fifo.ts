export class AsyncFifo<T> {
  private resumeNext: (() => void) | undefined;
  private items: T[] = [];
  push(value: T) {
    this.items.push(value);
    if (this.resumeNext) {
      this.resumeNext();
      this.resumeNext = undefined;
    }
  }
  async next() {
    if (this.items.length === 0) {
      await new Promise<void>((resolve) => {
        this.resumeNext = resolve;
      });
    }
    const value = this.items.shift()!;
    return { value, done: false };
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
