import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { initialState } from "./seed.js";
import type { State } from "../src/types.js";
import { workspaceId } from "./workspace.js";
export const cloud = process.env.DATA_BACKEND === "firestore";
export const adminApp = () =>
  getApps()[0] ||
  initializeApp({
    credential: applicationDefault(),
    projectId:
      (process.env.FIREBASE_WEB_CONFIG
        ? JSON.parse(process.env.FIREBASE_WEB_CONFIG).projectId
        : undefined) || process.env.GOOGLE_CLOUD_PROJECT,
  });
const file = () => {
  const base = process.env.LOCAL_DATA_FILE || ".data/workspace.json";
  return workspaceId() === "habi-home"
    ? base
    : path.join(
        path.dirname(base),
        "workspaces",
        workspaceId(),
        "workspace.json",
      );
};
function freshState() {
  const state = initialState();
  if (workspaceId() !== "habi-home") {
    state.storeSetupComplete = false;
    state.brand = {
      name: "Your brand",
      founder: "Your name",
      tagline: "A new chapter starts here.",
      story: "Tell the story behind your work in Store settings.",
      mission: "",
      voice: "Clear, warm, and authentic.",
      color: "#1e5847",
      promise: "",
      guidelines: "",
    };
  }
  return state;
}
export async function workspaceExists() {
  if (cloud)
    return (
      await getFirestore(adminApp())
        .doc("workspaces/" + workspaceId())
        .get()
    ).exists;
  try {
    await readFile(file(), "utf8");
    return true;
  } catch (e: any) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
}
export async function ensureWorkspace() {
  await locked(async () => {
    if (!(await workspaceExists())) await save(freshState());
  });
}
export async function load(): Promise<State> {
  if (cloud) {
    const doc = await getFirestore(adminApp())
      .doc("workspaces/" + workspaceId())
      .get();
    return doc.exists ? (doc.data() as State) : freshState();
  }
  try {
    return JSON.parse(await readFile(file(), "utf8"));
  } catch (e: any) {
    if (e.code !== "ENOENT") throw e;
    return freshState();
  }
}
export async function save(state: State) {
  if (Buffer.byteLength(JSON.stringify(state), "utf8") > 850000)
    throw new Error(
      "This demo workspace is full. Archive or reset sample data before adding more.",
    );
  if (cloud) {
    await getFirestore(adminApp())
      .doc("workspaces/" + workspaceId())
      // Match local JSON persistence: optional fields must not become Firestore undefined values.
      .set(JSON.parse(JSON.stringify(state)));
    return;
  }
  await mkdir((await import("node:path")).dirname(file()), { recursive: true });
  await writeFile(file() + ".tmp", JSON.stringify(state, null, 2));
  await rename(file() + ".tmp", file());
}
// Serialized mutations also encompass external writes. Cloud Run is limited to one instance for this POC.
let queue = Promise.resolve();
export function locked<T>(fn: () => Promise<T>): Promise<T> {
  const job = queue.then(fn);
  queue = job.then(
    () => {},
    () => {},
  );
  return job;
}
