import { resolve } from "path";
import { existsSync } from "fs";
import { config } from "dotenv";

const { NODE_ENV, NO_DOTENV } = process.env;

if (NODE_ENV === "development" && NO_DOTENV !== "1") {
  const path = resolve(__dirname, "../../.env");
  if (!existsSync(path)) {
    throw new Error("No .env file found.");
  }
  console.log("Loading .env configuration.");
  config({ path });
}
