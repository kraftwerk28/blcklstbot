import { Composer as GrammyComposer } from "grammy";
import { Context } from "./types/index.js";

export class Composer<C extends Context = Context> extends GrammyComposer<C> {}
