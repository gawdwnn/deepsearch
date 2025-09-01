import type { UIMessage } from "ai";

export type MessagePart = NonNullable<UIMessage["parts"]>[number];
