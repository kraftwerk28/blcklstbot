import { rest } from './fetch';

const { API_BASE } = process.env;
export const SUCCESS = 'success';
export const ERROR = 'error';

export interface Banned {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name: string;
  username: string;
  message: string;
  reason: string;
  date: string;
}

export type BanInfo = Omit<Banned, 'id' | 'date'>;

export class API {
  constructor(private token: string, private botID: number) { }

  private url(path: string) {
    return `${API_BASE}${path}/`;
  }

  private headers(extraHeaders: Record<string, string> = {}) {
    return {
      Authorization: `Token ${this.token}`,
      'User-Agent': `Bot ${this.botID}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
  }

  async getBlacklist(): Promise<Banned[]> {
    return rest(this.url('/blocklist'), 'GET', this.headers());
  }

  async addUser(banInfo: BanInfo): Promise<boolean> {
    return rest(
      this.url('/blocklist'),
      'POST',
      this.headers(),
      undefined,
      banInfo
    ).then(
      () => true,
      () => false
    );
  }

  async checkUser(userID: number): Promise<Banned | null> {
    const req = rest(this.url(`/blocklist/${userID}`), 'GET', this.headers());
    return req.then(
      (u) => u as Banned,
      () => null
    );
  }

  async rmUser(userID: number): Promise<boolean> {
    return rest(this.url(`/blocklist/${userID}`), 'DELETE', this.headers());
  }
}
