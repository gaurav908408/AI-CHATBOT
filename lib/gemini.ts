import { GeminiContent, GeminiPart } from "@/types/chat";
import { getGeminiApiKey } from "@/lib/config";

const MODELS = ["gemini-3.6-flash", "gemini-1.5-flash", "gemini-2.5-flash"];

function formatGeminiError(status: number, errText: string): Error {
  if (
    status === 429 ||
    errText.includes("RESOURCE_EXHAUSTED") ||
    errText.toLowerCase().includes("quota") ||
    errText.toLowerCase().includes("rate limit")
  ) {
    return new Error("Daily limit finished. Please try again later.");
  }
  return new Error(`Gemini API error (${status}): ${errText}`);
}

export async function generateChatResponse(
  history: GeminiContent[],
  latestParts: GeminiPart[],
  systemInstruction: string
): Promise<string> {
  const apiKey = getGeminiApiKey();

  const contents: GeminiContent[] = [
    ...history,
    { role: "user", parts: latestParts },
  ];

  let lastError: Error | null = null;

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents,
          }),
        });

        if (response.status === 429 || response.status === 503) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          if (attempt === 2) {
            throw formatGeminiError(response.status, await response.text().catch(() => ""));
          }
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw formatGeminiError(response.status, errText);
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

  throw lastError || new Error("Daily limit finished. Please try again later.");
}

export async function generateStreamingChatResponse(
  history: GeminiContent[],
  latestParts: GeminiPart[],
  systemInstruction: string
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getGeminiApiKey();

  const contents: GeminiContent[] = [
    ...history,
    { role: "user", parts: latestParts },
  ];

  let response: Response | null = null;
  let lastError: Error | null = null;

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
        }),
      });

      if (res.ok && res.body) {
        response = res;
        break;
      } else {
        const errText = await res.text();
        lastError = formatGeminiError(res.status, errText);
      }
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!response || !response.body) {
    throw lastError || new Error("Daily limit finished. Please try again later.");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const upstreamReader = response.body.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await upstreamReader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:")) {
              const jsonStr = trimmed.slice(5).trim();
              if (jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const textChunk =
                  parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textChunk) {
                  controller.enqueue(encoder.encode(textChunk));
                }
              } catch (e) {
                // Ignore chunk JSON parse errors
              }
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}