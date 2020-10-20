export class VotebanCooldown {
  private cds: Map<number, NodeJS.Timeout>;
  private timeout: number;

  constructor(timeout = 15 * 60E3) {
    this.timeout = timeout;
    this.cds = new Map();
  }
  
  cd(chatId: number) {
    const prevTimeout = this.cds.get(chatId);
    if (prevTimeout) {
      prevTimeout.refresh()
      return;
    }
    const t = setTimeout(() => this.cds.delete(chatId), this.timeout);
    this.cds.set(chatId, t);
  }

  has(chatId: number) {
    return this.cds.has(chatId);
  }
}
