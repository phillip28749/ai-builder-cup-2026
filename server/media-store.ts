import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, rename } from "node:fs/promises";
import path from "node:path";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { cloud, adminApp } from "./store.js";
import type { MediaAsset, MediaJob } from "../src/types.js";
import { workspaceId } from "./workspace.js";

const root = () =>
  path.join(
    path.dirname(process.env.LOCAL_DATA_FILE || ".data/workspace.json"),
    ...(workspaceId() === "habi-home" ? [] : ["workspaces", workspaceId()]),
    "media",
  );
const idCheck = (id: string) => {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid media identifier");
  return id;
};
const collection = (type: string) =>
  getFirestore(adminApp()).collection(`workspaces/${workspaceId()}/${type}`);
export const mediaStorageReady = () =>
  !cloud || Boolean(process.env.MEDIA_BUCKET);
async function writeMeta(
  type: "assets" | "jobs",
  id: string,
  data: MediaAsset | MediaJob,
) {
  idCheck(id);
  if (cloud) {
    await collection(type).doc(id).set(data);
    return;
  }
  const dir = path.join(root(), type);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, id + ".json");
  await writeFile(file + ".tmp", JSON.stringify(data));
  await rename(file + ".tmp", file);
}
async function readMeta<T>(type: "assets" | "jobs", id: string): Promise<T> {
  idCheck(id);
  if (cloud) {
    const doc = await collection(type).doc(id).get();
    if (!doc.exists) throw new Error("Media not found");
    return doc.data() as T;
  }
  try {
    return JSON.parse(
      await readFile(path.join(root(), type, id + ".json"), "utf8"),
    );
  } catch {
    throw new Error("Media not found");
  }
}
async function listMeta<T>(type: "assets" | "jobs"): Promise<T[]> {
  if (cloud) {
    const result = await collection(type)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    return result.docs.map((d) => d.data() as T);
  }
  let names: string[];
  try {
    names = await readdir(path.join(root(), type));
  } catch (e: any) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
  return Promise.all(
    names
      .filter((n) => n.endsWith(".json"))
      .map((n) => readMeta<T>(type, n.slice(0, -5))),
  );
}
export const getAsset = (id: string) => readMeta<MediaAsset>("assets", id);
export const listAssets = () => listMeta<MediaAsset>("assets");
export const getJob = (id: string) => readMeta<MediaJob>("jobs", id);
export const listJobs = () => listMeta<MediaJob>("jobs");
export const saveJob = (job: MediaJob) => writeMeta("jobs", job.id, job);
export async function putAsset(
  bytes: Buffer,
  details: Omit<MediaAsset, "id" | "createdAt" | "size">,
  id: string = randomUUID(),
): Promise<MediaAsset> {
  idCheck(id);
  if (!mediaStorageReady())
    throw new Error(
      "Configure MEDIA_BUCKET for durable media storage on Cloud Run.",
    );
  if (bytes.length > 50 * 1024 * 1024)
    throw new Error("Generated media exceeds the 50 MB prototype limit.");
  const asset: MediaAsset = {
    ...details,
    id,
    size: bytes.length,
    createdAt: new Date().toISOString(),
  };
  if (cloud)
    await getStorage(adminApp())
      .bucket(process.env.MEDIA_BUCKET)
      .file(`${workspaceId()}/${id}`)
      .save(bytes, {
        resumable: false,
        metadata: { contentType: details.mimeType },
      });
  else {
    await mkdir(path.join(root(), "bytes"), { recursive: true });
    await writeFile(path.join(root(), "bytes", id), bytes);
  }
  await writeMeta("assets", id, asset);
  return asset;
}
export async function assetBytes(id: string) {
  await getAsset(id);
  return cloud
    ? (
        await getStorage(adminApp())
          .bucket(process.env.MEDIA_BUCKET)
          .file(`${workspaceId()}/${idCheck(id)}`)
          .download()
      )[0]
    : readFile(path.join(root(), "bytes", idCheck(id)));
}
