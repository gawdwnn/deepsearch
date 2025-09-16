"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { updateChatTitleAction } from "~/app/actions/chat-actions";

interface EditChatTitleProps {
  chatId: string;
  initialTitle: string;
  isActive: boolean;
  onSave: (newTitle: string) => void;
  onCancel: () => void;
}

export const EditChatTitle = ({
  chatId,
  initialTitle,
  isActive,
  onSave,
  onCancel,
}: EditChatTitleProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, startSavingTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSave = () => {
    if (!title.trim()) {
      setError("Title cannot be empty");
      return;
    }

    if (title.length > 255) {
      setError("Title too long (max 255 characters)");
      return;
    }

    setError("");
    startSavingTransition(async () => {
      const result = await updateChatTitleAction(chatId, title.trim());

      if (result.success) {
        onSave(title.trim());
      } else {
        setError(result.error ?? "Failed to update title");
      }
    });
  };

  const handleCancel = () => {
    setTitle(initialTitle);
    setError("");
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    if (!isSaving && title.trim() !== initialTitle) {
      handleSave();
    } else if (title.trim() === initialTitle) {
      handleCancel();
    }
  };

  return (
    <div className="flex-1">
      <div className="flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          className={`flex-1 rounded-lg border bg-gray-800 p-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            error
              ? "border-red-400"
              : isActive
                ? "border-gray-600"
                : "border-gray-700"
          } ${isSaving ? "opacity-50" : ""}`}
          placeholder="Enter chat title..."
          maxLength={255}
        />
      </div>

      {error && <div className="mt-1 px-3 text-xs text-red-400">{error}</div>}

      <div className="mt-1 px-3 text-xs text-gray-500">
        {title.length}/255 characters
      </div>
    </div>
  );
};
