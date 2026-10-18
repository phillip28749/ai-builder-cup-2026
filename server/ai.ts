import { GoogleGenAI } from "@google/genai";
import { recordUsage } from "./usage.js";
export const aiConfigured = () =>
  Boolean(
    (process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_PROJECT) &&
    process.env.GEMINI_MODEL,
  );
export async function generate(
  prompt: string,
  fallback: string,
  feature = "text",
): Promise<{ text: string; source: string }> {
  if (!aiConfigured())
    return {
      text: fallback,
      source: "Sample response · Gemini not configured",
    };
  let recorded = false;
  try {
    const ai = process.env.GEMINI_API_KEY
      ? new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { timeout: 25000 },
        })
      : new GoogleGenAI({
          vertexai: true,
          project: process.env.GOOGLE_CLOUD_PROJECT,
          location: process.env.GOOGLE_CLOUD_LOCATION || "global",
          httpOptions: { timeout: 25000 },
        });
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL!,
      contents: prompt,
      config: { temperature: 0.5, maxOutputTokens: 1800 },
    });
    await recordUsage(feature, process.env.GEMINI_MODEL!, result.usageMetadata);
    recorded = true;
    if (!result.text?.trim()) throw new Error("Empty AI response");
    return { text: result.text, source: "Live Gemini" };
  } catch (error) {
    if (!recorded)
      await recordUsage(
        feature,
        process.env.GEMINI_MODEL!,
        undefined,
        "failed or response unavailable",
      );
    console.error(
      "Gemini request failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { text: fallback, source: "Sample fallback · Gemini unavailable" };
  }
}
