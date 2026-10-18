import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import type { Config } from "./types";
import { cachedMediaBlob, clearMediaCache, peekMediaBlob } from "./media-cache";
export function peekApiMedia(url: string) {
  const identity = getApps().length
    ? getAuth().currentUser?.uid || "signed-out"
    : "demo";
  return peekMediaBlob(identity + ":" + url);
}
let token = "";
export function configureAuth(
  config: Config,
  onChange: (signedIn: boolean, identity?: string) => void,
) {
  if (!config.firebase) {
    onChange(config.demo, config.demo ? "demo" : "");
    return;
  }
  const app = getApps()[0] || initializeApp(config.firebase);
  return onAuthStateChanged(getAuth(app), async (user) => {
    clearMediaCache();
    token = user ? await user.getIdToken() : "";
    onChange(
      config.demo || Boolean(user),
      user?.uid || (config.demo ? "demo" : ""),
    );
  });
}
export async function login(email: string, password: string) {
  await signInWithEmailAndPassword(getAuth(), email, password);
}
export async function logout() {
  clearMediaCache();
  token = "";
  await signOut(getAuth());
}
export async function loginWithGoogle() {
  if (!getApps().length)
    throw new Error(
      "Google sign-in is not configured. Complete the Firebase setup first.",
    );
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(getAuth(), provider);
  token = await result.user.getIdToken();
  return result.user;
}
function publicWorkspaceHeaders(url: string): Record<string, string> {
  if (url.startsWith("/public/") && typeof window !== "undefined") {
    const slug = window.location.pathname.split("/")[2];
    if (slug) return { "X-Workspace": slug };
  }
  return {};
}
export async function api<T = any>(
  url: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  if (getApps().length) {
    const u = getAuth().currentUser;
    token = u ? await u.getIdToken() : "";
  }
  const r = await fetch("/api" + url, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...publicWorkspaceHeaders(url),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
export async function apiBlob(url: string): Promise<Blob> {
  let identity = "demo";
  let requestToken = token;
  if (getApps().length) {
    const user = getAuth().currentUser;
    identity = user?.uid || "signed-out";
    requestToken = user ? await user.getIdToken() : "";
  }
  const load = async () => {
    const response = await fetch("/api" + url, {
      headers: {
        ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
        ...publicWorkspaceHeaders(url),
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Could not open media");
    }
    return response.blob();
  };
  // Product/hero URLs are mutable and must always read their current assignment.
  return /^\/owner\/media\/[a-f0-9-]{36}\/(file|thumbnail)$/.test(url)
    ? cachedMediaBlob(identity + ":" + url, load)
    : load();
}
