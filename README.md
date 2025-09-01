# DeepSearch

AI-powered chat agent with web search tools

## Features

- **AI Chat**: Streaming conversations with Google Gemini 2.0 Flash
- **Web Search**: Real-time web search and scraping via Serper API and Firecrawl
- **Authentication**: Discord OAuth with NextAuth.js
- **Rate Limiting**: User-based (50 requests/day, unlimited for admins) and global API limits
- **Observability**: PostHog analytics, Langfuse monitoring, and structured logging
- **Evaluations**: Automated AI model testing with Evalite
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis for performance

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)**

3. **Start services**

   ```bash
   ./start-database.sh    # PostgreSQL
   ./start-redis.sh       # Redis
   ```

4. **Configure environment**

   ```bash
   cp .env.example .env
   # Add your API keys (see Environment Variables section below)
   ```

5. **Setup database**

   ```bash
   pnpm run db:push
   ```

6. **Start development server**

   ```bash
   pnpm run dev
   ```

## Development Commands

```bash
# Database
pnpm run db:push       # Migrate database using Drizzle schema
pnpm run db:generate   # Generate migration files  
pnpm run db:migrate    # Run pending migrations
pnpm run db:studio     # Open Drizzle Studio GUI

# Development  
pnpm run dev           # Start development server with Turbo
pnpm run build         # Build for production
pnpm run typecheck     # Run TypeScript checks
pnpm run lint          # Run ESLint
pnpm run lint:fix      # Fix linting issues

# Testing & Evaluation
pnpm run evals         # Run AI model evaluations with Evalite

# Code Quality
pnpm run format:write  # Format code with Prettier
pnpm run format:check  # Check code formatting
```

## Tech Stack

- **Framework**: Next.js 15, React 18, TypeScript
- **AI**: Vercel AI SDK v5, Google Gemini 2.0 Flash
- **Database**: PostgreSQL, Drizzle ORM, Docker
- **Caching**: Redis, ioredis, Docker
- **Auth**: NextAuth.js v5
- **Search**: Serper API, Firecrawl web scraping
- **Styling**: Tailwind CSS & Shadcn UI
- **Observability**: PostHog, Langfuse, Pino logging, OpenTelemetry
- **Testing**: Evalite for AI evaluations, Vitest

## Environment Variables

Copy `.env.example` to `.env` and configure:

**Required:**

- `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` - Discord OAuth app credentials
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string  
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google Gemini API key
- `SERPER_API_KEY` - Serper web search API key
- `FIRECRAWL_API_KEY` - Firecrawl web scraping API key
- `LANGFUSE_SECRET_KEY` / `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_BASEURL` - Langfuse monitoring

**Optional:**

- `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` - PostHog analytics
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
