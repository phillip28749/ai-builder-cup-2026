import { GoogleGenAI } from "@google/genai";
import { recordUsage } from "./usage.js";
const textModel = () =>
  process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
export const aiConfigured = () =>
  Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_PROJECT);
export async function generate(
  prompt: string,
  fallback: string,
  feature = "text",
  systemInstruction?: string,
): Promise<{ text: string; source: string }> {
  if (!aiConfigured())
    return {
      text: fallback,
      source: "Sample response · Gemini not configured",
    };
  let recorded = false;
  const model = textModel();
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
      model,
      contents: prompt,
      config: { temperature: 0.5, maxOutputTokens: 1800, systemInstruction },
    });
    await recordUsage(feature, model, result.usageMetadata);
    recorded = true;
    if (!result.text?.trim()) throw new Error("Empty AI response");
    return { text: result.text, source: "Live Gemini" };
  } catch (error) {
    if (!recorded)
      await recordUsage(
        feature,
        model,
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
