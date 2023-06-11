import { Counter, register } from "prom-client";

const promMessageCounter = new Counter({
  name: "tg_messages_total",
  help: "Message counter",
  labelNames: ["media_type"],
});

promMessageCounter.inc({ media_type: "text" });

console.log(await register.metrics());
