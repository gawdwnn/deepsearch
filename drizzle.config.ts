import { type Config } from "drizzle-kit";

import { env } from "~/lib/env";

export default {
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  tablesFilter: ["ai-app-template_*"],
} satisfies Config;
