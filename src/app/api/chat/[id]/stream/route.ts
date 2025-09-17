import { UI_MESSAGE_STREAM_HEADERS } from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth } from "~/lib/auth";
import { getResumableChat } from "~/lib/db/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const chat = await getResumableChat({ chatId: id });

  if (!chat || chat.userId !== session.user.id)
    return new Response(null, { status: 404 });

  if (chat.activeStreamId == null)
    return new Response(null, { status: 204 });

  const ctx = createResumableStreamContext({ waitUntil: after });
  return new Response(await ctx.resumeExistingStream(chat.activeStreamId), {
    headers: UI_MESSAGE_STREAM_HEADERS,
  });
}
