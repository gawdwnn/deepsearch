import { eq, and } from "drizzle-orm";
import { db } from "./index";
import { chats, messages } from "./schema";
import type { DeepSearchUIMessage } from "~/types/messages";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: DeepSearchUIMessage[];
}) => {
  const { userId, chatId, title, messages: messageList } = opts;

  await db.transaction(async (tx) => {
    const existingChat = await tx.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (existingChat && existingChat.userId !== userId) {
      throw new Error("Chat ID already exists for a different user");
    }

    if (existingChat) {
      await tx.delete(messages).where(eq(messages.chatId, chatId));
      await tx
        .update(chats)
        .set({ title, updatedAt: new Date() })
        .where(eq(chats.id, chatId));
    } else {
      await tx.insert(chats).values({ id: chatId, userId, title });
    }

    if (messageList.length > 0) {
      const messagesToInsert = messageList.map((message, index) => ({
        chatId,
        role: message.role,
        parts: message.parts,
        order: index,
      }));
      await tx.insert(messages).values(messagesToInsert);
    }
  });
};

export const updateChatTitle = async (opts: {
  chatId: string;
  userId: string;
  title: string;
}) => {
  const { chatId, userId, title } = opts;

  if (!title.trim()) {
    throw new Error("Title cannot be empty");
  }

  if (title.length > 255) {
    throw new Error("Title too long (max 255 characters)");
  }

  const result = await db
    .update(chats)
    .set({
      title: title.trim(),
      updatedAt: new Date(),
    })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .returning({ id: chats.id });

  if (result.length === 0) {
    throw new Error("Chat not found or access denied");
  }

  return result[0];
};

export const deleteChat = async (opts: { chatId: string; userId: string }) => {
  const { chatId, userId } = opts;

  const result = await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .returning({ id: chats.id });

  if (result.length === 0) {
    throw new Error("Chat not found or access denied");
  }

  return result[0];
};
