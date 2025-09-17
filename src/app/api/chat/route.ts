import { type UIMessage } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "~/lib/auth";
import { streamFromDeepSearch } from "~/lib/deep-search";
import { langfuse } from "~/lib/lanfuse";
import { checkUserRateLimit, trackUserRequest } from "~/lib/rate-limiter";
import {
  checkGlobalRateLimit,
  recordGlobalRequest,
} from "~/lib/global-rate-limiter";
import { getLocationFromRequest } from "~/lib/location-context";
import { logger } from "~/utils/logger";

const bodySchema = z.object({
  messages: z.array(z.any()),
  chatId: z.string(),
});

export async function POST(req: NextRequest) {
  // Check if user is authenticated
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, chatId }: { messages: UIMessage[]; chatId: string } =
    bodySchema.parse(await req.json());

  // Extract user location from request
  const userLocation = getLocationFromRequest(req);

  // Create Langfuse trace early for rate limiting
  const trace = langfuse.trace({
    name: "chat",
    userId: session.user.id,
  });

  // Rate limiting check with span tracking
  const rateLimitSpan = trace.span({
    name: "check-rate-limit",
    input: {
      userId: session.user.id,
    },
  });

  const rateLimitResult = await checkUserRateLimit(session.user.id);

  rateLimitSpan.end({
    output: {
      allowed: rateLimitResult.isAllowed,
      error: rateLimitResult.error,
      remainingRequests: rateLimitResult.remainingRequests,
    },
  });

  if (!rateLimitResult.isAllowed) {
    return NextResponse.json(
      { error: rateLimitResult.error },
      { status: rateLimitResult.error === "User not found" ? 404 : 429 },
    );
  }

  try {
    // Track the user request
    const trackRequestSpan = trace.span({
      name: "track-user-request",
      input: {
        userId: session.user.id,
      },
    });

    await trackUserRequest(session.user.id);

    trackRequestSpan.end({
      output: {
        success: true,
      },
    });

    // Global rate limiting check
    const globalRateLimitConfig = {
      maxRequests: 100, // 100 requests per window
      windowMs: 60_000, // 1 minute window
      keyPrefix: "global",
      maxRetries: 3,
    };

    const globalRateLimitSpan = trace.span({
      name: "check-global-rate-limit",
      input: globalRateLimitConfig,
    });

    const globalRateLimitCheck = await checkGlobalRateLimit(
      globalRateLimitConfig,
    );

    if (!globalRateLimitCheck.isAllowed) {
      logger.info("Global rate limit exceeded, waiting for reset...", {
        resetTimeMs: globalRateLimitCheck.resetTimeMs,
        requestCount: globalRateLimitCheck.requestCount,
      });

      // Wait for the rate limit to reset
      const isAllowed = await globalRateLimitCheck.retry();

      if (!isAllowed) {
        globalRateLimitSpan.end({
          output: {
            allowed: false,
            error: "Global rate limit exceeded after retries",
          },
        });
        return NextResponse.json(
          {
            error: "System is temporarily busy. Please try again in a moment.",
          },
          { status: 429 },
        );
      }
    }

    // Record the global rate limit hit
    await recordGlobalRequest(globalRateLimitConfig);

    globalRateLimitSpan.end({
      output: {
        allowed: true,
        remainingRequests: globalRateLimitCheck.remainingRequests,
        requestCount: globalRateLimitCheck.requestCount,
      },
    });

    const result = await streamFromDeepSearch({
      messages: messages,
      langfuseTraceId: trace.id,
      chatId: chatId,
      userId: session.user.id,
      trace: trace,
      langfuse: langfuse,
      userLocation: userLocation,
    });

    return result;
  } catch (error) {
    logger.error("Chat API error", {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
