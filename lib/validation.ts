import { NextRequest } from "next/server";
import { ChatMessage, Role, ValidationResult } from "@/types/chat";

const VALID_ROLES: Role[] = ["user", "assistant", "model", "system"];

export async function parseAndValidateChatRequest(
  req: NextRequest
): Promise<ValidationResult> {
  let body: any;

  try {
    body = await req.json();
  } catch (err) {
    return {
      valid: false,
      error: "Invalid JSON format in request payload.",
      statusCode: 400,
    };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      error: "Request body must be a valid JSON object.",
      statusCode: 400,
    };
  }

  const { messages } = body;
  if (!Array.isArray(messages)) {
    return {
      valid: false,
      error: "The 'messages' field is required and must be an array.",
      statusCode: 400,
    };
  }

  if (messages.length === 0) {
    return {
      valid: false,
      error: "The 'messages' array cannot be empty.",
      statusCode: 400,
    };
  }

  const cleanMessages: ChatMessage[] = [];

  for (const item of messages) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const { role, content, time, isError } = item;

    if (isError === true) {
      continue;
    }

    if (
      typeof content === "string" &&
      content.trim().length > 0 &&
      typeof role === "string" &&
      VALID_ROLES.includes(role as Role)
    ) {
      cleanMessages.push({
        role: role as Role,
        content: content.trim(),
        ...(time ? { time: String(time) } : {}),
      });
    }
  }

  if (cleanMessages.length === 0) {
    return {
      valid: false,
      error: "No valid messages found in payload. Each message must have a valid role and non-empty content.",
      statusCode: 400,
    };
  }

  const lastMessage = cleanMessages[cleanMessages.length - 1];
  if (!lastMessage || !lastMessage.content.trim()) {
    return {
      valid: false,
      error: "Latest message content cannot be empty.",
      statusCode: 400,
    };
  }

  return {
    valid: true,
    data: {
      cleanMessages,
      latestMessageContent: lastMessage.content,
    },
  };
}
