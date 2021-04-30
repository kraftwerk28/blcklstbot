import { Redis } from "ioredis";
import { Pool } from "pg";

export class DbStore {
  constructor(public pgClient: Pool, public redisClient: Redis) {
  }
}
