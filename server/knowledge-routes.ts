import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { readKnowledge, brandContext } from "./brand-knowledge.js";
import { load } from "./store.js";
import { privateLocked, readPrivate, writePrivate } from "./private-records.js";
import { seal, unseal } from "./sheets-connection.js";
import { usageSummary } from "./usage.js";
const wrap =
  (fn: (req: any, res: any) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };
async function facebookPage(id: string, token: string) {
  const version = process.env.META_GRAPH_VERSION;
  if (!version || !/^v\d+\.\d+$/.test(version))
    throw new Error(
      "Set META_GRAPH_VERSION to a currently supported Meta Graph API version.",
    );
  const identity = await fetch(
    `https://graph.facebook.com/${version}/me?fields=id`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!identity.ok || ((await identity.json()) as { id?: string }).id !== id)
    throw new Error(
      "Use a Page access token belonging to the selected Page, not a user token or another Page token.",
    );
  const result = await fetch(
    `https://graph.facebook.com/${version}/${id}?fields=id,name,about,category,link`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!result.ok)
    throw new Error(
      "Facebook could not verify this Page. Check the Page access token, Page ID, permissions, and Graph API version.",
    );
  const page = (await result.json()) as Record<string, string>;
  if (page.id !== id || !page.name || !page.category)
    throw new Error("This must be a Facebook Page, not a personal profile.");
  let recentPosts: { message: string; createdAt: string }[] = [];
  let postsNotice =
    "Recent posts were not available; only Page identity/description is used.";
  try {
    const response = await fetch(
      `https://graph.facebook.com/${version}/${id}/posts?fields=message,created_time&limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (response.ok) {
      const body = (await response.json()) as {
        data?: { message?: string; created_time?: string }[];
      };
      recentPosts = (body.data || [])
        .filter((p) => p.message)
        .map((p) => ({
          message: p.message!.slice(0, 1500),
          createdAt: p.created_time || "",
        }));
      postsNotice = recentPosts.length
        ? "Recent public Page posts imported as writing/context examples."
        : "No public text posts returned by Facebook.";
    }
  } catch {}
  return {
    id,
    name: page.name.slice(0, 200),
    about: (page.about || "").slice(0, 4000),
    category: page.category,
    url: `https://www.facebook.com/${id}`,
    fetchedAt: new Date().toISOString(),
    recentPosts,
    postsNotice,
  };
}
export function mountKnowledgeRoutes(app: Express) {
  app.get(
    "/api/owner/knowledge/context",
    wrap(async (_req, res) => {
      res.json({ context: await brandContext(await load()) });
    }),
  );
  app.get(
    "/api/owner/knowledge",
    wrap(async (_req, res) => {
      res.json(await readKnowledge());
    }),
  );
  app.patch(
    "/api/owner/knowledge",
    wrap(async (req, res) => {
      const data = z
        .object({
          positioning: z.string().max(3000),
          differentiators: z.string().max(3000),
          approvedClaims: z.string().max(4000),
          avoid: z.string().max(2000),
          examples: z.string().max(4000),
        })
        .parse(req.body);
      await privateLocked(async () => {
        const k = await readKnowledge();
        await writePrivate("brand-knowledge", { ...k, ...data });
      });
      res.json({ ok: true });
    }),
  );
  app.post(
    "/api/owner/knowledge/documents",
    wrap(async (req, res) => {
      const input = z
        .object({
          name: z.string().min(1).max(120),
          data: z
            .string()
            .max(2800000)
            .regex(/^[A-Za-z0-9+/]+={0,2}$/),
        })
        .parse(req.body);
      const bytes = Buffer.from(input.data, "base64");
      if (bytes.length > 2 * 1024 * 1024)
        throw new Error("Use a supporting document up to 2 MB.");
      let text = "";
      if (/\.pdf$/i.test(input.name)) {
        if (bytes.subarray(0, 5).toString() !== "%PDF-")
          throw new Error("Invalid PDF.");
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(bytes) });
        try {
          const info = await parser.getInfo();
          if (info.total > 20)
            throw new Error("Use a PDF with no more than 20 pages.");
          text = (await parser.getText()).text;
        } finally {
          await parser.destroy();
        }
      } else if (/\.(txt|md|csv|json)$/i.test(input.name))
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      else
        throw new Error(
          "Supported documents: text-based PDF, TXT, Markdown, CSV, or JSON.",
        );
      if (!text.trim() || text.includes("\u0000"))
        throw new Error(
          "No usable text found. Scanned PDFs need OCR before upload.",
        );
      await privateLocked(async () => {
        const k = await readKnowledge();
        if (k.documents.length >= 8)
          throw new Error("Keep up to eight supporting documents.");
        k.documents.push({
          id: randomUUID(),
          name: input.name,
          text: text.slice(0, 12000),
          truncated: text.length > 12000,
          createdAt: new Date().toISOString(),
        });
        await writePrivate("brand-knowledge", k);
      });
      res.json({ ok: true });
    }),
  );
  app.delete(
    "/api/owner/knowledge/documents/:id",
    wrap(async (req, res) => {
      await privateLocked(async () => {
        const k = await readKnowledge();
        k.documents = k.documents.filter((d) => d.id !== req.params.id);
        await writePrivate("brand-knowledge", k);
      });
      res.json({ ok: true });
    }),
  );
  app.post(
    "/api/owner/facebook/connect",
    wrap(async (req, res) => {
      const { pageId, accessToken } = z
        .object({
          pageId: z.string().regex(/^\d+$/),
          accessToken: z.string().min(10).max(4000),
        })
        .parse(req.body);
      const page = await facebookPage(pageId, accessToken);
      await privateLocked(async () => {
        const encrypted = seal(accessToken);
        await writePrivate("facebook-auth", { token: encrypted, pageId });
        const k = await readKnowledge();
        k.facebook = page;
        await writePrivate("brand-knowledge", k);
      });
      res.json(page);
    }),
  );
  app.post(
    "/api/owner/facebook/refresh",
    wrap(async (_req, res) => {
      const auth = await readPrivate<{ token?: string; pageId?: string }>(
        "facebook-auth",
        {},
      );
      if (!auth.token || !auth.pageId)
        throw new Error("Connect a Facebook Page first.");
      const page = await facebookPage(auth.pageId, unseal<string>(auth.token));
      await privateLocked(async () => {
        const k = await readKnowledge();
        k.facebook = page;
        await writePrivate("brand-knowledge", k);
      });
      res.json(page);
    }),
  );
  app.delete(
    "/api/owner/facebook",
    wrap(async (_req, res) => {
      await privateLocked(async () => {
        await writePrivate("facebook-auth", {});
        const k = await readKnowledge();
        delete k.facebook;
        await writePrivate("brand-knowledge", k);
      });
      res.json({ ok: true });
    }),
  );
  app.get(
    "/api/owner/usage",
    wrap(async (_req, res) => {
      res.json(await usageSummary());
    }),
  );
  app.patch(
    "/api/owner/usage/settings",
    wrap(async (req, res) => {
      const optional = z.number().finite().min(0).max(1000000000).nullable();
      const data = z
        .object({
          monthlyTokens: optional,
          monthlyUsd: optional,
          textInputPerMillion: optional,
          textOutputPerMillion: optional,
          imagePerRequest: optional,
        })
        .parse(req.body);
      await privateLocked(() => writePrivate("usage-settings", data));
      res.json({ ok: true });
    }),
  );
}
