import pino from "pino";
import { env } from "~/lib/env.js";

const isServer = typeof window === "undefined";
const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

const pinoLogger = pino({
  level: env.LOG_LEVEL ?? (isDevelopment ? "debug" : "info"),
  browser: isServer
    ? undefined
    : {
        asObject: true,
      },
  transport:
    isDevelopment && isServer
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
});

// PostHog integration for production error tracking
const sendToPostHog = (
  level: string,
  message: string,
  data?: Record<string, unknown>,
) => {
  if (isProduction && (level === "error" || level === "warn")) {
    try {
      if (isServer) {
        // Server-side PostHog (Node.js client)
        void import("~/lib/posthog")
          .then(({ default: PostHogClient }) => {
            const client = PostHogClient();
            client.capture({
              distinctId: (data?.userId as string) ?? "anonymous",
              event: `${level}_log`,
              properties: {
                message,
                level,
                ...data,
                timestamp: new Date().toISOString(),
              },
            });
          })
          .catch(() => {
            // Fail silently - don't break app if PostHog fails
          });
      } else {
        // Client-side PostHog
        void import("posthog-js")
          .then(({ default: posthog }) => {
            posthog.capture(`${level}_log`, {
              message,
              level,
              ...data,
              timestamp: new Date().toISOString(),
            });
          })
          .catch(() => {
            // Fail silently - don't break app if PostHog fails
          });
      }
    } catch (error) {
      // Fail silently - don't break app if PostHog fails
      console.warn("PostHog logging failed:", error);
    }
  }
};

// Helper function to handle the conditional pino logging
const logWithPino = (
  level: "debug" | "info" | "warn" | "error",
  message: string,
  data?: Record<string, unknown>,
) => {
  if (data) {
    pinoLogger[level](data, message);
  } else {
    pinoLogger[level](message);
  }
};

// Enhanced logger with structured data support and PostHog integration
const logger = {
  debug: (message: string, data?: Record<string, unknown>) => {
    logWithPino("debug", message, data);
  },
  info: (message: string, data?: Record<string, unknown>) => {
    logWithPino("info", message, data);
    sendToPostHog("info", message, data);
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    logWithPino("warn", message, data);
    sendToPostHog("warn", message, data);
  },
  error: (message: string, data?: Record<string, unknown>) => {
    logWithPino("error", message, data);
    sendToPostHog("error", message, data);
  },
};

export { logger };
