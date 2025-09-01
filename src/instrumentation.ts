import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";
import { env } from "~/lib/env";

export function register() {
  registerOTel({
    serviceName: "deepsearch-ai-chat-app",
    traceExporter: new LangfuseExporter({
      environment: env.NODE_ENV,
    }),
  });
}
