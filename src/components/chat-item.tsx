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

export const ChatItem = ({ chat, isActive, onTitleUpdate, onDelete }: ChatItemProps) => {
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
    <div className="relative group">
      <Link
        href={`/?id=${chat.id}`}
        className={`block rounded-lg p-3 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          isActive
            ? "bg-gray-700"
            : "hover:bg-gray-750 bg-gray-800"
        }`}
      >
        {chat.title}
      </Link>

      <div className="absolute top-1/2 right-2 -translate-y-1/2 z-50">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`p-1 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            showMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          } transition-opacity`}
        >
          <MoreHorizontal className="size-4 text-gray-400" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 min-w-[120px]">
            <button
              onClick={handleEditClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 focus:outline-none focus:bg-gray-700"
            >
              <Edit className="size-3" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 focus:outline-none focus:bg-gray-700"
            >
              <Trash2 className="size-3" />
              Delete
            </button>
          </div>
        )}
      </div>

      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};