import type { RequestHandler } from "express";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { adminApp, ensureWorkspace } from "./store.js";
import { workspaceContext, userWorkspace } from "./workspace.js";
export function createOwnerAuth({
  demo,
  verify = (token: string) => getAuth(adminApp()).verifyIdToken(token),
}: {
  demo: boolean;
  verify?: (token: string) => Promise<DecodedIdToken>;
}): RequestHandler {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (!token) {
      if (demo) {
        workspaceContext.run({ id: "habi-home" }, () => next());
        return;
      }
      res.status(401).json({
        error: "Sign in with Google to open your personal workspace.",
      });
      return;
    }
    try {
      const decoded = await verify(token);
      if (
        decoded.firebase?.sign_in_provider !== "google.com" &&
        decoded.uid !== process.env.OWNER_UID
      ) {
        res
          .status(403)
          .json({ error: "Please use a Google account to sign in." });
        return;
      }
      const context = {
        id: userWorkspace(decoded.uid),
        user: {
          name: decoded.name || "Creator",
          email: decoded.email || "",
          googleId: decoded.firebase?.identities?.["google.com"]?.[0],
        },
      };
      workspaceContext.run(context, () => {
        ensureWorkspace()
          .then(() => next())
          .catch(next);
      });
    } catch {
      res.status(401).json({
        error:
          "Your Google session could not be verified. Please sign in again.",
      });
    }
  };
}
