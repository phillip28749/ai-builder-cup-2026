import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import type { SheetConnection } from "./sheets-connection.js";
export type WorkspaceContext = {
  id: string;
  user?: { name: string; email: string; googleId?: string };
  sheet?: SheetConnection;
};
export const workspaceContext = new AsyncLocalStorage<WorkspaceContext>();
export const workspaceId = () => workspaceContext.getStore()?.id || "habi-home";
export const userWorkspace = (uid: string) =>
  "user_" + createHash("sha256").update(uid).digest("hex").slice(0, 32);
export const validWorkspace = (id: string) =>
  id === "habi-home" || /^user_[a-f0-9]{32}$/.test(id);
