import { GoogleGenAI, GenerateVideosOperation, Modality } from "@google/genai";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { recordUsage } from "./usage.js";
import { showDeveloperSetup } from "./ui-config.js";
export const imageModel = () =>
  process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
export const videoModel = () =>
  process.env.GEMINI_VIDEO_MODEL || "veo-3.1-lite-generate-preview";
export function mediaClient() {
  if (!process.env.GEMINI_API_KEY)
    throw new Error(
      showDeveloperSetup()
        ? "Add GEMINI_API_KEY to the backend .env and restart the server. On Cloud Run, use a Secret Manager secret."
        : "AI generation is temporarily unavailable. Please contact the studio administrator.",
    );
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      timeout: Number(process.env.GEMINI_MEDIA_TIMEOUT_MS) || 90000,
      retryOptions: { attempts: 1 },
    },
  });
}
export function safeProviderError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(raw))
    return "Google quota is exhausted or the rate limit was reached. Check billing/quota before retrying.";
  if (/401|403|API.?key|permission|UNAUTHENTICATED/i.test(raw))
    return "Google could not authorize this request. Check the backend Gemini API key, billing, and model access.";
  if (/404|not found|not supported|INVALID_ARGUMENT/i.test(raw))
    return "This model or configuration is not available to the configured key. Check the image/video model settings.";
  if (/timeout|timed out|abort/i.test(raw))
    return "The provider timed out. Generation may have started; do not automatically resubmit a paid request.";
  return "Google generation could not be completed. Check the model access, billing, and creative direction before retrying.";
}
export async function normalizeUpload(bytes: Buffer) {
  if (bytes.length > 4 * 1024 * 1024)
    throw new Error("Upload an image smaller than 4 MB.");
  try {
    const image = sharp(bytes, { limitInputPixels: 20000000 });
    const meta = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format || "")) throw new Error();
    return await image
      .rotate()
      .resize({
        width: 2048,
        height: 2048,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch {
    throw new Error(
      "Choose a valid JPEG, PNG, or WebP image (up to 20 megapixels).",
    );
  }
}
export async function generatePhoto(
  bytes: Buffer,
  mimeType: string,
  prompt: string,
  aspectRatio: string,
  options?: {
    template?: { bytes: Buffer; mimeType: string };
    styleOnly?: boolean;
    width: number;
    height: number;
  },
): Promise<Buffer> {
  const result = await mediaClient()
    .models.generateContent({
      model: imageModel(),
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              text: options?.styleOnly
                ? "IMAGE 1: style/layout reference only, not the product identity."
                : "IMAGE 1: actual product/subject reference; preserve its identity.",
            },
            { inlineData: { data: bytes.toString("base64"), mimeType } },
            ...(options?.template
              ? [
                  {
                    text: "IMAGE 2: template for style/layout only; do not copy its subject.",
                  },
                  {
                    inlineData: {
                      data: options.template.bytes.toString("base64"),
                      mimeType: options.template.mimeType,
                    },
                  },
                ]
              : []),
          ],
        },
      ],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        imageConfig: { aspectRatio },
      },
    })
    .catch(async (error) => {
      await recordUsage(
        "image",
        imageModel(),
        undefined,
        "failed or response unavailable",
      );
      throw error;
    });
  const image = result.candidates
    ?.flatMap((c) => c.content?.parts || [])
    .find(
      (p) => p.inlineData?.data && p.inlineData.mimeType?.startsWith("image/"),
    )?.inlineData;
  await recordUsage(
    "image",
    imageModel(),
    result.usageMetadata,
    image?.data ? "completed" : "no image returned",
  );
  if (!image?.data) throw new Error("NO_IMAGE_RETURNED");
  const output = Buffer.from(image.data, "base64");
  // Decode and normalize provider bytes as well; a text response is never accepted as an image.
  const normalized = await sharp(output, { limitInputPixels: 25000000 })
    .rotate()
    .resize(
      options
        ? {
            width: options.width,
            height: options.height,
            fit: "contain",
            background: "#ffffff",
          }
        : { withoutEnlargement: true },
    )
    .png()
    .toBuffer();
  return normalized;
}
export async function beginVideo(
  bytes: Buffer,
  mimeType: string,
  prompt: string,
  aspectRatio: string,
) {
  return mediaClient().models.generateVideos({
    model: videoModel(),
    prompt,
    image: { imageBytes: bytes.toString("base64"), mimeType },
    config: {
      numberOfVideos: 1,
      durationSeconds: 8,
      aspectRatio,
      resolution: "720p",
      personGeneration: "allow_adult",
    },
  });
}
export async function inspectVideo(name: string, model = videoModel()) {
  const op = new GenerateVideosOperation();
  op.name = name;
  const result = await mediaClient().operations.getVideosOperation({
    operation: op,
  });
  if (result.done)
    await recordUsage(
      "video",
      model,
      undefined,
      result.response?.generatedVideos?.length
        ? "completed"
        : "failed or filtered",
      { id: name, seconds: 8 },
    );
  return result;
}
export async function downloadVideo(
  video: NonNullable<
    NonNullable<GenerateVideosOperation["response"]>["generatedVideos"]
  >[number]["video"],
) {
  if (!video) throw new Error("No video was returned.");
  if (video.videoBytes) return Buffer.from(video.videoBytes, "base64");
  const dir = await mkdtemp(path.join(tmpdir(), "asenso-video-"));
  try {
    const file = path.join(dir, "video.mp4");
    await mediaClient().files.download({ file: video, downloadPath: file });
    return await readFile(file);
  } finally {
    if (
      !path
        .resolve(dir)
        .startsWith(path.resolve(tmpdir()) + path.sep + "asenso-video-")
    )
      throw new Error("Invalid temporary path");
    await rm(dir, { recursive: true, force: true });
  }
}
