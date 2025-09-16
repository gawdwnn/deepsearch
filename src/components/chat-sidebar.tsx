"use client";

import { useState, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChatItem } from "./chat-item";
import { EditChatTitle } from "./edit-chat-title";
import { DeleteChatModal } from "./delete-chat-modal";
import type { DB } from "~/lib/db/schema";

interface ChatSidebarContentProps {
  chats: DB.Chat[];
  currentChatId?: string;
  isAuthenticated: boolean;
}

type OptimisticAction =
  | { type: "UPDATE_TITLE"; chatId: string; title: string }
  | { type: "DELETE_CHAT"; chatId: string };

export const ChatSidebarContent = ({
  chats,
  currentChatId,
  isAuthenticated
}: ChatSidebarContentProps) => {
  const router = useRouter();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ chatId: string; title: string } | null>(null);
  const [, startNavigatingTransition] = useTransition();

  const [optimisticChats, updateOptimisticChats] = useOptimistic(
    chats,
    (state, action: OptimisticAction) => {
      switch (action.type) {
        case "UPDATE_TITLE":
          return state.map(chat =>
            chat.id === action.chatId
              ? { ...chat, title: action.title }
              : chat
          );
        case "DELETE_CHAT":
          return state.filter(chat => chat.id !== action.chatId);
        default:
          return state;
      }
    }
  );

  const handleTitleUpdate = (chatId: string) => {
    setEditingChatId(chatId);
  };

  const handleTitleSave = (newTitle: string) => {
    if (editingChatId) {
      updateOptimisticChats({
        type: "UPDATE_TITLE",
        chatId: editingChatId,
        title: newTitle
      });
      setEditingChatId(null);
    }
  };

  const handleTitleCancel = () => {
    setEditingChatId(null);
  };

  const handleDelete = (chatId: string) => {
    const chat = optimisticChats.find(c => c.id === chatId);
    if (chat) {
      setDeleteModal({ chatId, title: chat.title });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteModal) {
      updateOptimisticChats({
        type: "DELETE_CHAT",
        chatId: deleteModal.chatId
      });

      // If we're deleting the currently active chat, navigate away
      if (deleteModal.chatId === currentChatId) {
        startNavigatingTransition(() => {
          router.push("/");
        });
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-gray-500">
        Sign in to start chatting
      </p>
    );
  }

  if (optimisticChats.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No chats yet. Start a new conversation!
      </p>
    );
  }

  return (
    <>
      {optimisticChats.map((chat) => (
        <div key={chat.id}>
          {editingChatId === chat.id ? (
            <EditChatTitle
              chatId={chat.id}
              initialTitle={chat.title}
              isActive={chat.id === currentChatId}
              onSave={handleTitleSave}
              onCancel={handleTitleCancel}
            />
          ) : (
            <ChatItem
              chat={chat}
              isActive={chat.id === currentChatId}
              onTitleUpdate={handleTitleUpdate}
              onDelete={handleDelete}
            />
          )}
        </div>
      ))}

      <DeleteChatModal
        isOpen={!!deleteModal}
        chatId={deleteModal?.chatId ?? ""}
        chatTitle={deleteModal?.title ?? ""}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};