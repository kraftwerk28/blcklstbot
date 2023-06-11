declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PG_CONNECTION_STRING: string;
      REDIS_HOST: string;

      API_TOKEN: string;
      API_BASE: string;

      BOT_TOKEN: string;
      SERVER_PORT: string;
      WEBHOOK_PATH: string;
      WEBHOOK_DOMAIN: string;
      WEBHOOK_PORT: string;

      KRAFTWERK28_UID: string;
      REPORTS_CHANNEL_ID: string;
      REPORTS_CHANNEL_USERNAME: string;

      TREE_SITTER_SERVER_HOST: string;
      ENRY_SERVER_HOST: string;
      GITHUB_API_HOST: string;
      GITHUB_API_KEY: string;
      GITHUB_GIST_ID: string;
      COMMANDS_CHANNEL_ID: string;
      STACKEXCHANGE_API_KEY: string;
    }
  }
}

export {};
