"use server";

import { revalidatePath } from "next/cache";
import { auth } from "~/lib/auth/index";
import { updateChatTitle, deleteChat } from "~/lib/db/mutations";
import { logger } from "~/utils/logger";

export type ActionResult = {
  success: boolean;
  error?: string;
  chatId?: string;
};

export async function updateChatTitleAction(
  chatId: string,
  title: string,
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      logger.warn("Unauthorized chat title update attempt", { chatId });
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (!title.trim()) {
      return {
        success: false,
        error: "Title cannot be empty",
      };
    }

    if (title.length > 255) {
      return {
        success: false,
        error: "Title too long (max 255 characters)",
      };
    }

    await updateChatTitle({
      chatId,
      userId: session.user.id,
      title: title.trim(),
    });

    revalidatePath("/");

    logger.info("Chat title updated successfully", {
      chatId,
      userId: session.user.id,
    });

    return {
      success: true,
      chatId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Failed to update chat title", {
      chatId,
      error: errorMessage,
    });

    return {
      success: false,
      error:
        errorMessage === "Chat not found or access denied"
          ? "Chat not found"
          : "Failed to update title",
    };
  }
}

export async function deleteChatAction(chatId: string): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      logger.warn("Unauthorized chat deletion attempt", { chatId });
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    await deleteChat({
      chatId,
      userId: session.user.id,
    });

    revalidatePath("/");

    logger.info("Chat deleted successfully", {
      chatId,
      userId: session.user.id,
    });

    return {
      success: true,
      chatId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Failed to delete chat", {
      chatId,
      error: errorMessage,
    });

    return {
      success: false,
      error:
        errorMessage === "Chat not found or access denied"
          ? "Chat not found"
          : "Failed to delete chat",
    };
  }
}
