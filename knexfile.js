import "dotenv/config";

export default {
  development: {
    client: "pg",
    connection: {
      connectionString: process.env.PG_CONNECTION_STRING,
    },
  },
};
