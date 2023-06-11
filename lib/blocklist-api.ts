import axios, { AxiosInstance } from "axios";
import { BannedUser, BanInfo } from "./types";

const { API_BASE } = process.env;
export const SUCCESS = "success";
export const ERROR = "error";

export class Api {
  private axios: AxiosInstance;

  constructor(private token: string, private botID: number) {
    const headers = {
      Authorization: `Token ${this.token}`,
      "User-Agent": `Bot ${this.botID}`,
      "Content-Type": "application/json",
    };
    this.axios = axios.create({ baseURL: API_BASE, headers });
  }

  async getBlacklist(): Promise<BannedUser[]> {
    return this.axios.get("/blocklist").then((r) => r.data);
  }

  async addUser(banInfo: BanInfo): Promise<boolean> {
    return this.axios.post("/blocklist", banInfo).then(
      () => true,
      () => false,
    );
  }

  async checkUser(userID: number): Promise<BannedUser | null> {
    return this.axios.get(`/blocklist/${userID}`).then(
      (r) => r.data,
      () => null,
    );
  }

  async rmUser(userID: number): Promise<boolean> {
    return this.axios.delete(`/blocklist/${userID}`).then(
      () => true,
      () => false,
    );
  }
}
