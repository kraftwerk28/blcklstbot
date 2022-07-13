import test from "node:test";
import assert from "node:assert";

import { applySedQueries } from "./substitute";

test("substitution", async () => {
  const inputMsgText = "hello, world!";
  const sedQueries = [String.raw`s#(o)#\1_$0#g`, String.raw`s/(.)l(.)/\2\0\1`];
  const output = applySedQueries(inputMsgText, sedQueries);
  assert.strictEqual(output, "hlelleo_o, wo_orld!");
});

test("no substitution", async () => {
  const inputMsgText = "hello, world!";
  const sedQueries = [String.raw`s#(o)/\1_$0#g`, String.raw`s/(.)l(.)/\2\0\3`];
  const output = applySedQueries(inputMsgText, sedQueries);
  assert.strictEqual(output, undefined);
});
