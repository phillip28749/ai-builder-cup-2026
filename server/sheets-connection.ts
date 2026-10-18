import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import { adminApp, cloud } from "./store.js";
import { workspaceContext, workspaceId } from "./workspace.js";

export type SheetConnection = {
  sheetId?: string;
  ready?: boolean;
  tokens?: string;
  pending?: {
    hash: string;
    expires: number;
    verifier: string;
    subject: string;
  };
  error?: string;
};
const file = () =>
  path.join(
    path.dirname(process.env.LOCAL_DATA_FILE || ".data/workspace.json"),
    "workspaces",
    workspaceId(),
    "sheets-connection.json",
  );
export async function readConnection(): Promise<SheetConnection> {
  if (cloud)
    return (
      (
        await getFirestore(adminApp())
          .doc(`workspaces/${workspaceId()}/integrations/sheets`)
          .get()
      ).data() || {}
    );
  try {
    return JSON.parse(await readFile(file(), "utf8"));
  } catch (e: any) {
    if (e.code === "ENOENT") return {};
    throw e;
  }
}
export async function writeConnection(value: SheetConnection) {
  if (cloud)
    await getFirestore(adminApp())
      .doc(`workspaces/${workspaceId()}/integrations/sheets`)
      .set(value);
  else {
    await mkdir(path.dirname(file()), { recursive: true });
    await writeFile(file() + ".tmp", JSON.stringify(value), { mode: 0o600 });
    await rename(file() + ".tmp", file());
  }
  const context = workspaceContext.getStore();
  if (context) context.sheet = value;
}
const key = () => {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new Error(
      "Set a stable SESSION_SECRET of at least 32 characters for encrypted integrations.",
    );
  return createHash("sha256").update(process.env.SESSION_SECRET).digest();
};
export function seal(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(workspaceId()));
  const bytes = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString("base64");
}
export function unseal<T>(value: string): T {
  const data = Buffer.from(value, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAAD(Buffer.from(workspaceId()));
  decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(data.subarray(28)),
      decipher.final(),
    ]).toString(),
  );
}
export function oauthReady() {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REDIRECT_URI &&
    (process.env.SESSION_SECRET?.length || 0) >= 32,
  );
}
export const oauthClient = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI,
  );
export async function personalSheetClient() {
  const connection = workspaceContext.getStore()?.sheet;
  if (!connection?.tokens)
    throw new Error("Reconnect Google Sheets to authorize this workbook.");
  const auth = oauthClient();
  auth.setCredentials(unseal(connection.tokens));
  return google.sheets({ version: "v4", auth });
}
