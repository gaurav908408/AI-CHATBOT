export type Role = 'user' | 'model' | 'assistant' | 'system';

export interface ChatMessage {
  role: Role;
  content: string;
  time?: string;
  isError?: boolean;
  image?: string;
}

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface ChatRequestPayload {
  messages: ChatMessage[];
  systemInstruction?: string;
  stream?: boolean;
}

export interface ValidatedChatData {
  cleanMessages: ChatMessage[];
  latestMessageContent: string;
  latestMessageImage?: string;
  stream: boolean;
}

export type ValidationResult =
  | { valid: true; data: ValidatedChatData }
  | { valid: false; error: string; statusCode: number };

export interface ChatApiResponse {
  success: boolean;
  reply?: string;
  error?: string;
}
