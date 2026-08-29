import pino, { type LoggerOptions } from "pino";
import { env } from "./env";

const options: LoggerOptions =
  env.NODE_ENV === "production"
    ? { level: "warn" }
    : {
        // `info` in development so the startup banner and request logs are
        // visible. At `warn` the server starts silently, which is impossible
        // to tell apart from a server that failed to start at all.
        level: env.LOG_LEVEL ?? "info",
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" }
        }
      };

export const logger = pino(options);
