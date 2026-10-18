import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { getFirestore } from "firebase-admin/firestore";
import { cloud, adminApp } from "./store.js";
import { workspaceId } from "./workspace.js";
const file = (name: string) =>
  path.join(
    path.dirname(process.env.LOCAL_DATA_FILE || ".data/workspace.json"),
    "workspaces",
    workspaceId(),
    `${name}.json`,
  );
export async function readPrivate<T>(name: string, fallback: T): Promise<T> {
  if (cloud)
    return (
      ((
        await getFirestore(adminApp())
          .doc(`workspaces/${workspaceId()}/private/${name}`)
          .get()
      ).data() as T) || fallback
    );
  try {
    return JSON.parse(await readFile(file(name), "utf8"));
  } catch (e: any) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
}
export async function writePrivate(name: string, value: unknown) {
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json) > 750000)
    throw new Error("This private workspace record is full.");
  if (cloud)
    await getFirestore(adminApp())
      .doc(`workspaces/${workspaceId()}/private/${name}`)
      .set(JSON.parse(json));
  else {
    await mkdir(path.dirname(file(name)), { recursive: true });
    await writeFile(file(name) + ".tmp", json, { mode: 0o600 });
    await rename(file(name) + ".tmp", file(name));
  }
}
// Separate lock from store mutations: AI calls already run inside workspace writes.
let queue = Promise.resolve();
export function privateLocked<T>(fn: () => Promise<T>) {
  const job = queue.then(fn);
  queue = job.then(
    () => {},
    () => {},
  );
  return job;
}
