"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { deleteChatAction } from "~/app/actions/chat-actions";

interface DeleteChatModalProps {
  isOpen: boolean;
  chatId: string;
  chatTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteChatModal = ({
  isOpen,
  chatId,
  chatTitle,
  onClose,
  onConfirm
}: DeleteChatModalProps) => {
  const [isDeleting, startDeletingTransition] = useTransition();

  if (!isOpen) return null;

  const handleConfirm = () => {
    startDeletingTransition(async () => {
      const result = await deleteChatAction(chatId);

      if (result.success) {
        onConfirm();
        onClose();
      } else {
        // For now, we'll still close the modal but could show error state
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-200">
            Delete Chat ?
          </h3>
        </div>

        <p className="text-gray-300 mb-2">
          Are you sure you want to delete &quot;{chatTitle}&quot;?
        </p>

        <p className="text-sm text-gray-400 mb-6">
          This action cannot be undone. All messages in this chat will be permanently deleted.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                Delete Chat
              </>
            )}
          </button>
        </div>
      </div>

      {/* Background click to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
};