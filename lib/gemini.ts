import { GeminiContent } from "@/types/chat";

export async function generateChatResponse(
  history: GeminiContent[],
  latestMessage: string,
  systemInstruction: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }

  const models = ["gemini-3.6-flash", "gemini-1.5-flash", "gemini-2.5-flash"];
  const contents: GeminiContent[] = [
    ...history,
    { role: "user", parts: [{ text: latestMessage }] },
  ];

  let lastError: Error | null = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstruction }],
            },
            contents,
          }),
        });

        if (response.status === 429 || response.status === 503) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const candidate = data?.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (text && text.trim().length > 0) {
          return text.trim();
        }

        throw new Error("Gemini API returned an empty response.");
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (err?.message && err.message.includes("404")) {
          break;
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate response from Gemini API.");
}