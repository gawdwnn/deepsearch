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
  onConfirm,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-200">Delete Chat ?</h3>
        </div>

        <p className="mb-2 text-gray-300">
          Are you sure you want to delete &quot;{chatTitle}&quot;?
        </p>

        <p className="mb-6 text-sm text-gray-400">
          This action cannot be undone. All messages in this chat will be
          permanently deleted.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>Delete Chat</>
            )}
          </button>
        </div>
      </div>

      {/* Background click to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
};
