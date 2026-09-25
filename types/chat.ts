export type Role = 'user' | 'model' | 'assistant' | 'system';

export interface ChatMessage {
  role: Role;
  content: string;
  time?: string;
  isError?: boolean;
}

export interface GeminiPart {
  text: string;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface ChatRequestPayload {
  messages: ChatMessage[];
  systemInstruction?: string;
}

export interface ValidatedChatData {
  cleanMessages: ChatMessage[];
  latestMessageContent: string;
}

export type ValidationResult =
  | { valid: true; data: ValidatedChatData }
  | { valid: false; error: string; statusCode: number };

export interface ChatApiResponse {
  success: boolean;
  reply?: string;
  error?: string;
}
