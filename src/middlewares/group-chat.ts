import { Middleware } from "telegraf";
import { Composer } from "../composer";
import { Ctx } from "../types/context";
import * as commands from "../commands";

export const groupChat: Middleware<Ctx> = Composer.command(
  "help",
  commands.help,
);
