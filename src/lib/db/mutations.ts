import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { chats, messages } from "./schema";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: UIMessage[];
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
