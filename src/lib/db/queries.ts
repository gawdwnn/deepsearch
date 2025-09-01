import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { chats } from "./schema";

export const getChat = async (opts: { chatId: string; userId: string }) => {
  const { chatId, userId } = opts;
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.order)],
      },
    },
  });

  if (!chat) {
    return null;
  }

  return chat;
};

export const getChats = async (opts: { userId: string }) => {
  const { userId } = opts;
  return await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: (chats, { desc }) => [desc(chats.updatedAt)],
  });
};
