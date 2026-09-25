import { NextRequest, NextResponse } from "next/server";
import { parseAndValidateChatRequest } from "@/lib/validation";
import { formatMessagesForGemini } from "@/lib/formatter";
import { generateChatResponse, generateStreamingChatResponse } from "@/lib/gemini";
import { GF_SYSTEM_PROMPT } from "@/lib/persona";
import { checkRateLimit } from "@/lib/ratelimit";
import { ChatApiResponse } from "@/types/chat";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.success) {
      const errorResponse: ChatApiResponse = {
        success: false,
        error: "Daily limit finished. Please try again later.",
      };
      return NextResponse.json(errorResponse, {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInMs),
        },
      });
    }

    const validation = await parseAndValidateChatRequest(req);
    if (!validation.valid) {
      const errorResponse: ChatApiResponse = {
        success: false,
        error: validation.error,
      };
      return NextResponse.json(errorResponse, { status: validation.statusCode });
    }

    const { cleanMessages, stream } = validation.data;
    const { formattedHistory, latestMessageParts } = formatMessagesForGemini(cleanMessages);

    if (stream) {
      const textStream = await generateStreamingChatResponse(
        formattedHistory,
        latestMessageParts,
        GF_SYSTEM_PROMPT
      );

      return new Response(textStream, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      });
    }

    const reply = await generateChatResponse(
      formattedHistory,
      latestMessageParts,
      GF_SYSTEM_PROMPT
    );

    const successResponse: ChatApiResponse = {
      success: true,
      reply,
    };
    return NextResponse.json(successResponse, {
      status: 200,
      headers: {
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error: any) {
    console.error("[Chat API Error]:", error);

    let errorMessage = error?.message || "An unexpected internal server error occurred.";

    if (
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorMessage.toLowerCase().includes("quota") ||
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.toLowerCase().includes("daily limit")
    ) {
      errorMessage = "Daily limit finished. Please try again later.";
      const errorResponse: ChatApiResponse = {
        success: false,
        error: errorMessage,
      };
      return NextResponse.json(errorResponse, { status: 429 });
    }

    const errorResponse: ChatApiResponse = {
      success: false,
      error: errorMessage,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}