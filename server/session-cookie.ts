import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

// Firebase Hosting forwards only __session. Share a stable, signed browser
// identifier between customer sessions and browser-bound OAuth state.
let localSecret: string | undefined;
const signature = (id: string) =>
  createHmac(
    "sha256",
    process.env.SESSION_SECRET || (localSecret ||= randomUUID()),
  )
    .update(id)
    .digest("hex");
export function readBrowserSession(req: Request) {
  const token = req.headers.cookie
    ?.split(/;\s*/)
    .find((c) => c.startsWith("__session="))
    ?.slice("__session=".length);
  if (!token) return;
  const [id, signed, extra] = token.split(".");
  if (
    extra ||
    !/^[a-f0-9-]{36}$/.test(id || "") ||
    !/^[a-f0-9]{64}$/.test(signed || "")
  )
    return;
  if (!timingSafeEqual(Buffer.from(signature(id)), Buffer.from(signed))) return;
  return { id, token };
}
export function browserSession(req: Request, res: Response) {
  const existing = readBrowserSession(req);
  if (existing) return existing;
  const id = randomUUID();
  const token = `${id}.${signature(id)}`;
  res.cookie("__session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      Boolean(process.env.K_SERVICE) ||
      process.env.PUBLIC_ORIGIN?.startsWith("https://"),
    path: "/",
    maxAge: 86400000,
  });
  return { id, token };
}
