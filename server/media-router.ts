import { Router, type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { load, locked } from "./store.js";
import {
  assetBytes,
  getAsset,
  listAssets,
  putAsset,
  getJob,
  listJobs,
  saveJob,
  mediaStorageReady,
} from "./media-store.js";
import * as defaults from "./media-provider.js";
import type { MediaJob } from "../src/types.js";
import { creativeSchema, buildCreativeBrief } from "./creative-brief.js";
import sharp from "sharp";
import { showDeveloperSetup } from "./ui-config.js";
const wrap =
  (
    fn: (
      req: import("express").Request,
      res: import("express").Response,
    ) => Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };
const id = z.string().uuid();
const generationSchema = z.object({
  sourceAssetId: id,
  prompt: z.string().trim().min(5).max(2000),
  subject: z.string().trim().max(250).optional(),
  kind: z.enum(["product", "advertisement", "video"]),
  aspectRatio: z.enum(["1:1", "16:9", "9:16"]),
  requestId: id.optional(),
  creative: creativeSchema,
});
export function createMediaRouter(overrides: Partial<typeof defaults> = {}) {
  const provider = { ...defaults, ...overrides };
  const router = Router();
  const ready = () => {
    if (!process.env.GEMINI_API_KEY)
      throw new Error(
        showDeveloperSetup()
          ? "Add GEMINI_API_KEY to the backend .env and restart the server."
          : "AI generation is temporarily unavailable. Please contact the studio administrator.",
      );
    if (!mediaStorageReady())
      throw new Error(
        showDeveloperSetup()
          ? "Configure a private MEDIA_BUCKET before generating media on Cloud Run."
          : "Photo and video storage is temporarily unavailable. Please try again later or contact the studio administrator.",
      );
  };
  router.get("/config", (_req, res) =>
    res.json({
      keyConfigured: Boolean(process.env.GEMINI_API_KEY),
      storageReady: mediaStorageReady(),
      storage:
        process.env.DATA_BACKEND === "firestore"
          ? "Private Google Cloud Storage"
          : "Local media files",
      imageModel: provider.imageModel(),
      videoModel: provider.videoModel(),
    }),
  );
  router.post(
    "/check",
    wrap(async (_req, res) => {
      ready();
      try {
        await provider
          .mediaClient()
          .models.get({ model: provider.imageModel() });
        res.json({
          ok: true,
          message:
            "Key accepted and image model found. Actual generation still depends on model billing and quota.",
        });
      } catch (error) {
        throw new Error(provider.safeProviderError(error));
      }
    }),
  );
  router.get(
    "/",
    wrap(async (_req, res) =>
      res.json({
        assets: (await listAssets()).sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
        jobs: (await listJobs()).map(({ operationName, ...j }) => j),
      }),
    ),
  );
  router.post(
    "/upload",
    wrap(async (req, res) => {
      const input = z
        .object({
          name: z.string().min(1).max(120),
          mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
          data: z
            .string()
            .min(4)
            .max(5600000)
            .regex(/^[A-Za-z0-9+/]+={0,2}$/),
        })
        .parse(req.body);
      const bytes = await provider.normalizeUpload(
        Buffer.from(input.data, "base64"),
      );
      const asset = await locked(async () => {
        if ((await listAssets()).length >= 100)
          throw new Error("The prototype media library is full.");
        return putAsset(bytes, {
          kind: "reference",
          mimeType: "image/jpeg",
          name: input.name,
          model: "",
          prompt: "",
          sourceAssetId: "",
        });
      });
      res.json(asset);
    }),
  );
  router.get(
    "/:id/thumbnail",
    wrap(async (req, res) => {
      const asset = await getAsset(id.parse(req.params.id));
      if (asset.kind === "video")
        throw new Error("Choose an image for this preview.");
      const bytes = await assetBytes(asset.id);
      const thumbnail = await sharp(bytes, { limitInputPixels: 25000000 })
        .rotate()
        .resize({
          width: 320,
          height: 240,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 78 })
        .toBuffer();
      res.setHeader("Cache-Control", "private, no-store");
      res.type("image/webp").send(thumbnail);
    }),
  );
  router.get(
    "/:id/file",
    wrap(async (req, res) => {
      const asset = await getAsset(id.parse(req.params.id));
      const bytes = await assetBytes(asset.id);
      res.setHeader("Content-Type", asset.mimeType);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="asensopost-${asset.id}.${asset.kind === "video" ? "mp4" : asset.mimeType === "image/png" ? "png" : "jpg"}"`,
      );
      res.send(bytes);
    }),
  );
  router.post(
    "/brief",
    wrap(async (req, res) => {
      const input = generationSchema.parse(req.body);
      await getAsset(input.sourceAssetId);
      const result = await buildCreativeBrief(await load(), input);
      res.json({
        brief: result.brief,
        width: result.width,
        height: result.height,
        aspectRatio: result.aspectRatio,
      });
    }),
  );
  router.post(
    "/generate",
    wrap(async (req, res) => {
      ready();
      const input = generationSchema.parse(req.body);
      if (input.kind === "video" && input.aspectRatio === "1:1")
        throw new Error("Video supports landscape 16:9 or portrait 9:16.");
      const result = await locked(async () => {
        const source = await getAsset(input.sourceAssetId);
        if (source.kind === "video")
          throw new Error(
            "Choose a product photo or generated image as the reference.",
          );
        if ((await listAssets()).length >= 100)
          throw new Error("The prototype media library is full.");
        const state = await load();
        const plan = await buildCreativeBrief(state, input);
        const creative = plan.brief;
        const savedDirection = JSON.stringify({
          subject: input.subject || "",
          scene: input.prompt,
          creative: input.creative || null,
        });
        let template: { bytes: Buffer; mimeType: string } | undefined;
        if (input.creative?.templateAssetId) {
          if (input.creative.templateAssetId === source.id)
            throw new Error(
              "Use a separate style reference or leave template blank.",
            );
          const asset = await getAsset(input.creative.templateAssetId);
          if (asset.kind === "video")
            throw new Error("Choose an image as the style reference.");
          if (input.kind === "video")
            throw new Error(
              "Style-template references currently apply to images only.",
            );
          template = {
            bytes: await assetBytes(asset.id),
            mimeType: asset.mimeType,
          };
        }
        const bytes = await assetBytes(source.id);
        if (input.kind !== "video") {
          let output: Buffer;
          try {
            output = await provider.generatePhoto(
              bytes,
              source.mimeType,
              creative,
              plan.aspectRatio,
              {
                template,
                width: plan.width,
                height: plan.height,
                styleOnly: plan.c.referenceRole === "style",
              },
            );
          } catch (error) {
            if (error instanceof Error && error.message === "NO_IMAGE_RETURNED")
              throw new Error(
                "Google returned no image. The request may have been filtered; revise the creative direction or check model access.",
              );
            throw new Error(provider.safeProviderError(error));
          }
          return {
            asset: await putAsset(output, {
              kind: "image",
              name:
                input.kind === "product"
                  ? "Product creative shot"
                  : "Advertising creative",
              mimeType: "image/png",
              sourceAssetId: source.id,
              prompt: savedDirection,
              model: provider.imageModel(),
            }),
          };
        }
        const requestId = input.requestId || randomUUID();
        const existing = (await listJobs()).find((j) => j.id === requestId);
        if (existing) {
          const { operationName, ...job } = existing;
          return { job };
        }
        const pending = (await listJobs()).find(
          (j) => j.status === "processing",
        );
        if (pending)
          throw new Error(
            "A video is already processing. Check its status before starting another.",
          );
        const job: MediaJob = {
          id: requestId,
          status: "needs-review",
          operationName: "",
          sourceAssetId: source.id,
          prompt: savedDirection,
          model: provider.videoModel(),
          aspectRatio: plan.aspectRatio,
          createdAt: new Date().toISOString(),
          error:
            "Submission started; if interrupted, check the provider before resubmitting.",
        };
        await saveJob(job);
        try {
          const operation = await provider.beginVideo(
            bytes,
            source.mimeType,
            creative,
            plan.aspectRatio,
          );
          if (!operation.name) throw new Error("No operation name");
          job.operationName = operation.name;
          job.status = "processing";
          delete job.error;
          await saveJob(job);
        } catch (error) {
          job.error = provider.safeProviderError(error);
          await saveJob(job);
        }
        const { operationName, ...publicJob } = job;
        return { job: publicJob };
      });
      res.json(result);
    }),
  );
  router.post(
    "/jobs/:id/check",
    wrap(async (req, res) => {
      ready();
      const result = await locked(async () => {
        const job = await getJob(id.parse(req.params.id));
        if (job.status === "processing") {
          let completed;
          try {
            completed = await getAsset(job.id);
          } catch {}
          if (completed) {
            job.status = "ready";
            job.assetId = completed.id;
            await saveJob(job);
          } else {
            let operation;
            try {
              operation = await provider.inspectVideo(
                job.operationName,
                job.model,
              );
            } catch (error) {
              throw new Error(provider.safeProviderError(error));
            }
            if (operation.done) {
              if (operation.error) {
                job.status = "failed";
                job.error = provider.safeProviderError(
                  JSON.stringify(operation.error),
                );
                await saveJob(job);
              } else {
                const video = operation.response?.generatedVideos?.[0]?.video;
                if (!video) {
                  job.status = "failed";
                  job.error =
                    "Google returned no video. The request may have been filtered.";
                  await saveJob(job);
                } else {
                  let bytes: Buffer;
                  try {
                    bytes = await provider.downloadVideo(video);
                  } catch (error) {
                    throw new Error(provider.safeProviderError(error));
                  }
                  const asset = await putAsset(
                    bytes,
                    {
                      kind: "video",
                      name: "Product video",
                      mimeType: "video/mp4",
                      sourceAssetId: job.sourceAssetId,
                      prompt: job.prompt,
                      model: job.model,
                    },
                    job.id,
                  );
                  job.assetId = asset.id;
                  job.status = "ready";
                  await saveJob(job);
                }
              }
            }
          }
        }
        const { operationName, ...publicJob } = job;
        return publicJob;
      });
      res.json(result);
    }),
  );
  return router;
}
