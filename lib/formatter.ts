import { ChatMessage, GeminiContent } from "@/types/chat";

export function formatMessagesForGemini(cleanMessages: ChatMessage[]): {
  formattedHistory: GeminiContent[];
  latestMessageContent: string;
} {
  if (cleanMessages.length === 0) {
    return { formattedHistory: [], latestMessageContent: "" };
  }

  const lastMessage = cleanMessages[cleanMessages.length - 1];
  const latestMessageContent = lastMessage.content;

  const historyMessages = cleanMessages.slice(0, -1);

  const formattedHistory: GeminiContent[] = historyMessages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  if (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
    formattedHistory.unshift({
      role: "user",
      parts: [{ text: "Hi" }],
    });
  }

  return {
    formattedHistory,
    latestMessageContent,
  };
}
