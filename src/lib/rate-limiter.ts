import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "~/lib/db";
import { userRequests, users } from "~/lib/db/schema";

export interface UserRateLimitResult {
  isAllowed: boolean;
  error?: string;
  remainingRequests?: number;
}

export interface RateLimitOptions {
  dailyLimit?: number;
}

const DEFAULT_DAILY_LIMIT = 50;

export async function checkUserRateLimit(
  userId: string,
  options: RateLimitOptions = {},
): Promise<UserRateLimitResult> {
  const { dailyLimit = DEFAULT_DAILY_LIMIT } = options;

  // Get user info
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return {
      isAllowed: false,
      error: "User not found",
    };
  }

  // Skip rate limiting for admin users
  if (user.isAdmin) {
    return {
      isAllowed: true,
      remainingRequests: -1, // -1 indicates unlimited for admins
    };
  }

  // Calculate requests made today
  const dailyWindowStart = new Date();
  dailyWindowStart.setHours(0, 0, 0, 0);

  const requestsToday = await db
    .select({ count: sql<number>`count(*)` })
    .from(userRequests)
    .where(
      and(
        eq(userRequests.userId, userId),
        gte(userRequests.createdAt, dailyWindowStart),
      ),
    );

  const count = requestsToday[0]?.count ?? 0;

  if (count >= dailyLimit) {
    return {
      isAllowed: false,
      error:
        "Daily request limit exceeded. Please try again tomorrow or contact support for an upgrade.",
      remainingRequests: 0,
    };
  }

  return {
    isAllowed: true,
    remainingRequests: dailyLimit - count,
  };
}

export async function trackUserRequest(userId: string): Promise<void> {
  await db.insert(userRequests).values({
    userId,
  });
}
