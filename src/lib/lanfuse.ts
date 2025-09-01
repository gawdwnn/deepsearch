import { Langfuse } from "langfuse";
import { env } from "~/lib/env";

export const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});
