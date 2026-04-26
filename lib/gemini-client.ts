const GEMINI_TIMEOUT_MS = 25_000;

export type GeminiPromptResult =
  | { success: true; text: string }
  | { success: false; error: string };

export async function runGeminiPrompt(prompt: string): Promise<GeminiPromptResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false as const, error: 'GEMINI_API_KEY is missing' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            topP: 0.8,
            maxOutputTokens: 900,
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return { success: false as const, error: `Gemini request failed (${response.status})` };
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      payload?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? '';
    if (!text) {
      return { success: false as const, error: 'Gemini response was empty' };
    }
    return { success: true as const, text };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false as const, error: 'פג הזמן לבקשת הניתוח — נסו שוב בעוד רגע.' };
    }
    return { success: false as const, error: 'בקשת הניתוח נכשלה' };
  } finally {
    clearTimeout(timeoutId);
  }
}
