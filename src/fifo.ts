export class AsyncFifo<T> {
  private items: T[] = [];
  private triggerWaiter: ((value: T) => any) | undefined;
  static watermark = 1024;

  push(value: T) {
    if (this.triggerWaiter) {
      this.triggerWaiter(value);
      this.triggerWaiter = undefined;
    } else if (this.items.length < AsyncFifo.watermark) {
      this.items.push(value);
    }
  }

  next() {
    let value: Promise<T>;
    if (this.items.length) {
      value = Promise.resolve(this.items.shift()!);
    } else {
      value = new Promise((resolve) => {
        this.triggerWaiter = resolve;
      });
    }
    return value.then((value) => ({ value, done: false }));
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}
