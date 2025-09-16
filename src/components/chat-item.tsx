"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import type { DB } from "~/lib/db/schema";

interface ChatItemProps {
  chat: DB.Chat;
  isActive: boolean;
  onTitleUpdate: (chatId: string) => void;
  onDelete: (chatId: string) => void;
}

export const ChatItem = ({
  chat,
  isActive,
  onTitleUpdate,
  onDelete,
}: ChatItemProps) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = () => {
    setShowMenu(false);
    onDelete(chat.id);
  };

  const handleEditClick = () => {
    setShowMenu(false);
    onTitleUpdate(chat.id);
  };

  return (
    <div className="group relative">
      <Link
        href={`/?id=${chat.id}`}
        className={`block rounded-lg p-3 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          isActive ? "bg-gray-700" : "hover:bg-gray-750 bg-gray-800"
        }`}
      >
        {chat.title}
      </Link>

      <div className="absolute right-2 top-1/2 z-50 -translate-y-1/2">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`rounded p-1 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            showMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          } transition-opacity`}
        >
          <MoreHorizontal className="size-4 text-gray-400" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[120px] rounded-md border border-gray-700 bg-gray-800 shadow-lg">
            <button
              onClick={handleEditClick}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 focus:bg-gray-700 focus:outline-none"
            >
              <Edit className="size-3" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 focus:bg-gray-700 focus:outline-none"
            >
              <Trash2 className="size-3" />
              Delete
            </button>
          </div>
        )}
      </div>

      {showMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
};
