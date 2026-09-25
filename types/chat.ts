export interface ChatMessage {
  role: 'user' | 'model' | 'assistant' | 'system';
  content: string;
  time?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemInstruction?: string;
}

export interface ChatResponse {
  reply: string;
  error?: string;
}
