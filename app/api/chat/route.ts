import { NextRequest, NextResponse } from "next/server";
import { parseAndValidateChatRequest } from "@/lib/validation";
import { formatMessagesForGemini } from "@/lib/formatter";
import { generateChatResponse } from "@/lib/gemini";
import { GF_SYSTEM_PROMPT } from "@/lib/persona";
import { ChatApiResponse } from "@/types/chat";

export async function POST(req: NextRequest) {
  try {
    const validation = await parseAndValidateChatRequest(req);
    if (!validation.valid) {
      const errorResponseBody: ChatApiResponse = {
        success: false,
        error: validation.error,
      };
      return NextResponse.json(errorResponseBody, { status: validation.statusCode });
    }

    const { cleanMessages } = validation.data;
    const { formattedHistory, latestMessageContent } = formatMessagesForGemini(cleanMessages);

    const reply = await generateChatResponse(
      formattedHistory,
      latestMessageContent,
      GF_SYSTEM_PROMPT
    );

    const successResponseBody: ChatApiResponse = {
      success: true,
      reply,
    };
    return NextResponse.json(successResponseBody, { status: 200 });
  } catch (error: any) {
    console.error("[Chat API Error]:", error);

    const errorMessage =
      error?.message || "An unexpected internal server error occurred.";

    const errorResponseBody: ChatApiResponse = {
      success: false,
      error: errorMessage,
    };

    return NextResponse.json(errorResponseBody, { status: 500 });
  }
}