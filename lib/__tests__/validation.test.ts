import { parseAndValidateChatRequest } from "@/lib/validation";
import { formatMessagesForGemini } from "@/lib/formatter";
import { ChatMessage } from "@/types/chat";

async function runTests() {
  console.log("Running unit tests for chat validation & formatting...\n");

  // Test 1: Empty messages array
  const mockReqEmpty = {
    json: async () => ({ messages: [] }),
  } as any;
  const res1 = await parseAndValidateChatRequest(mockReqEmpty);
  console.assert(!res1.valid && res1.statusCode === 400, "Test 1 Passed: Handles empty messages array");

  // Test 2: Valid messages format
  const validMessages: ChatMessage[] = [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
    { role: "user", content: "How are you?" },
  ];
  const mockReqValid = {
    json: async () => ({ messages: validMessages }),
  } as any;
  const res2 = await parseAndValidateChatRequest(mockReqValid);
  console.assert(res2.valid === true, "Test 2 Passed: Validates correct messages payload");

  // Test 3: Formatter mapping
  const formatted = formatMessagesForGemini(validMessages);
  console.assert(formatted.formattedHistory.length === 2, "Test 3 Passed: History slice length correct");
  console.assert(formatted.latestMessageContent === "How are you?", "Test 3 Passed: Latest message extracted");

  console.log("\nAll unit tests executed successfully! ✨");
}

if (require.main === module) {
  runTests().catch(console.error);
}
