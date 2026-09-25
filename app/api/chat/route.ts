import { NextRequest, NextResponse } from "next/server";
import { generateChatResponse } from "@/lib/gemini";
import { GF_SYSTEM_PROMPT } from "@/lib/persona";
import { ChatMessage } from "@/types/chat";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const cleanMessages = messages.filter(
      (msg: ChatMessage) =>
        !msg.content.includes("thoda issue ho gaya") &&
        !msg.content.includes("Internet ya server problem")
    );

    const lastMessage = cleanMessages[cleanMessages.length - 1];

    if (!lastMessage?.content?.trim()) {
      return NextResponse.json(
        { error: "Invalid message content" },
        { status: 400 }
      );
    }

    const formattedHistory = cleanMessages
      .slice(0, -1)
      .map((msg: ChatMessage) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

    if (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
      formattedHistory.unshift({
        role: "user",
        parts: [{ text: "Hi" }],
      });
    }

    const reply = await generateChatResponse(
      formattedHistory,
      lastMessage.content,
      GF_SYSTEM_PROMPT
    );

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Chat API Error:", error);

    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}