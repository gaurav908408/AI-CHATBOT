import { ChatMessage, GeminiContent, GeminiPart } from "@/types/chat";

export function formatMessagesForGemini(cleanMessages: ChatMessage[]): {
  formattedHistory: GeminiContent[];
  latestMessageContent: string;
  latestMessageParts: GeminiPart[];
} {
  if (cleanMessages.length === 0) {
    return {
      formattedHistory: [],
      latestMessageContent: "",
      latestMessageParts: [{ text: "" }],
    };
  }

  const lastMessage = cleanMessages[cleanMessages.length - 1];
  const latestMessageContent = lastMessage.content;

  const latestMessageParts: GeminiPart[] = [{ text: latestMessageContent }];
  if (lastMessage.image && lastMessage.image.startsWith("data:")) {
    const match = lastMessage.image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const base64Data = match[2];
      latestMessageParts.unshift({
        inline_data: {
          mime_type: mimeType,
          data: base64Data,
        },
      });
    }
  }

  const historyMessages = cleanMessages.slice(0, -1);

  const formattedHistory: GeminiContent[] = historyMessages.map((msg) => {
    const parts: GeminiPart[] = [{ text: msg.content }];
    if (msg.image && msg.image.startsWith("data:")) {
      const match = msg.image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (match) {
        parts.unshift({
          inline_data: {
            mime_type: match[1],
            data: match[2],
          },
        });
      }
    }

    return {
      role: msg.role === "assistant" ? "model" : "user",
      parts,
    };
  });

  if (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
    formattedHistory.unshift({
      role: "user",
      parts: [{ text: "Hi" }],
    });
  }

  return {
    formattedHistory,
    latestMessageContent,
    latestMessageParts,
  };
}
