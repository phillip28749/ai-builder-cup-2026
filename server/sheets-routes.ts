import type { Express, RequestHandler } from "express";
import { createHash, randomBytes } from "node:crypto";
import { workspaceContext, workspaceId, validWorkspace } from "./workspace.js";
import { load, save, locked } from "./store.js";
import {
  oauthReady,
  oauthClient,
  personalSheetClient,
  readConnection,
  writeConnection,
  seal,
  unseal,
} from "./sheets-connection.js";
import { configuredSheetId, readStock } from "./sheets.js";
import { browserSession, readBrowserSession } from "./session-cookie.js";

const scope = "https://www.googleapis.com/auth/drive.file";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const wrap =
  (fn: (req: any, res: any) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };
export const hydrateSheets: RequestHandler = (_req, _res, next) => {
  const context = workspaceContext.getStore();
  if (!context || workspaceId() === "habi-home") {
    next();
    return;
  }
  readConnection()
    .then((value) => {
      context.sheet = value;
      next();
    })
    .catch(next);
};
async function initializeWorkbook() {
  const connection = workspaceContext.getStore()!.sheet!;
  if (!connection.sheetId || !connection.tokens)
    throw new Error("Connect Google Sheets first.");
  if (connection.ready) return;
  const api = await personalSheetClient();
  const s = await load();
  await api.spreadsheets.values.batchUpdate({
    spreadsheetId: connection.sheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: "Products!A1:D",
          values: [
            ["productId", "name", "description", "price"],
            ...s.products.map((p) => [p.id, p.name, p.description, p.price]),
          ],
        },
        {
          range: "BranchStock!A1:C",
          values: [
            ["productId", "branch", "quantity"],
            ...s.products.flatMap((p) =>
              Object.entries(p.stock).map(([branch, q]) => [p.id, branch, q]),
            ),
          ],
        },
        {
          range: "Orders!A1:L",
          values: [
            [
              "orderId",
              "createdAt",
              "name",
              "phone",
              "productId",
              "quantity",
              "branch",
              "method",
              "address",
              "itemTotal",
              "status",
              "campaignId",
            ],
            ...s.orders
              .filter((o) => o.status !== "draft")
              .map((o) => [
                o.id,
                o.createdAt,
                o.name,
                o.phone,
                o.productId,
                o.quantity,
                o.branch,
                o.method,
                o.address,
                o.total,
                o.status,
                o.campaignId,
              ]),
          ],
        },
      ],
    },
  });
  connection.ready = true;
  delete connection.error;
  await writeConnection(connection);
  s.sheetMode = "live";
  s.syncedAt = new Date().toISOString();
  for (const product of s.products) {
    product.sheetStatus = "synced";
    delete product.sheetError;
  }
  for (const order of s.orders)
    if (order.status !== "draft") order.sheetStatus = "synced";
  await save(s);
}
export function mountSheetsRoutes(app: Express) {
  app.get("/api/owner/sheets/status", (_req, res) => {
    const connection = workspaceContext.getStore()?.sheet;
    const id = configuredSheetId();
    res.json({
      configured: oauthReady(),
      personal: Boolean(workspaceContext.getStore()?.user?.googleId),
      connected: Boolean(id),
      url: id ? `https://docs.google.com/spreadsheets/d/${id}` : null,
      incomplete: Boolean(
        connection?.tokens && connection.sheetId && !connection.ready,
      ),
      error: connection?.error || null,
    });
  });
  app.post(
    "/api/owner/sheets/connect",
    wrap(async (_req, res) => {
      const user = workspaceContext.getStore()?.user;
      if (!user?.googleId)
        throw new Error(
          "Sign in with Google to connect your personal workbook.",
        );
      if (!oauthReady())
        throw new Error(
          "Google Sheets needs one-time app setup. See the connection guide below.",
        );
      const nonce = randomBytes(32).toString("base64url");
      const cookie = browserSession(_req, res).token;
      const auth = oauthClient();
      const { codeVerifier, codeChallenge } =
        await auth.generateCodeVerifierAsync();
      await locked(async () => {
        const connection = await readConnection();
        connection.pending = {
          hash: digest(nonce + cookie),
          expires: Date.now() + 600000,
          verifier: seal(codeVerifier),
          subject: user.googleId!,
        };
        await writeConnection(connection);
      });
      const url = auth.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ["openid", "email", scope],
        state: `${workspaceId()}.${nonce}`,
        login_hint: user.email,
        code_challenge: codeChallenge,
        code_challenge_method: "S256" as any,
      });
      res.json({ url });
    }),
  );
  app.post(
    "/api/owner/sheets/initialize",
    wrap(async (_req, res) => {
      await locked(async () => {
        workspaceContext.getStore()!.sheet = await readConnection();
        await initializeWorkbook();
      });
      res.json({ ok: true });
    }),
  );
  app.post(
    "/api/owner/sheets/disconnect",
    wrap(async (_req, res) => {
      if (workspaceId() === "habi-home")
        throw new Error(
          "The shared demo workbook is managed by the app operator.",
        );
      await locked(async () => {
        const connection = await readConnection();
        // Retain the workbook ID for reconnect; erase credentials and pending authorization.
        await writeConnection(
          connection.sheetId
            ? { sheetId: connection.sheetId, ready: Boolean(connection.ready) }
            : {},
        );
        const s = await load();
        s.sheetMode = "sample";
        s.syncedAt = null;
        await save(s);
      });
      res.json({ ok: true });
    }),
  );
  app.get("/api/google/sheets/callback", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    const [id, nonce, extra] = String(req.query.state || "").split(".");
    const cookie = readBrowserSession(req)?.token;
    if (
      !validWorkspace(id) ||
      id === "habi-home" ||
      !nonce ||
      extra ||
      !cookie
    ) {
      res
        .status(400)
        .send(
          "Connection expired or invalid. Return to Customer Hub and connect again.",
        );
      return;
    }
    workspaceContext.run({ id }, () => {
      locked(async () => {
        const connection = await readConnection();
        const pending = connection.pending;
        if (
          !pending ||
          pending.expires < Date.now() ||
          pending.hash !== digest(nonce + cookie)
        ) {
          res
            .status(400)
            .send(
              "Connection expired or invalid. Return to Customer Hub and connect again.",
            );
          return;
        }
        delete connection.pending;
        await writeConnection(connection);
        if (req.query.error) {
          res.redirect("/customers?sheets=cancelled");
          return;
        }
        try {
          if (typeof req.query.code !== "string")
            throw new Error("Missing authorization code");
          const auth = oauthClient();
          const { tokens } = await auth.getToken({
            code: req.query.code,
            codeVerifier: unseal<string>(pending.verifier),
          });
          const identity = await auth.verifyIdToken({
            idToken: tokens.id_token || "",
            audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
          });
          if (identity.getPayload()?.sub !== pending.subject)
            throw new Error(
              "Use the same Google account as your studio login.",
            );
          if (
            !tokens.scope?.split(" ").includes(scope) ||
            !tokens.refresh_token
          )
            throw new Error(
              "Google Sheets access and offline authorization are required. Reconnect and approve access.",
            );
          // Persist credentials before creating the workbook, so partial initialization can resume.
          connection.tokens = seal(tokens);
          await writeConnection(connection);
          auth.setCredentials(tokens);
          if (!connection.sheetId) {
            const { google } = await import("googleapis");
            const api = google.sheets({ version: "v4", auth });
            const s = await load();
            const result = await api.spreadsheets.create({
              requestBody: {
                properties: { title: `${s.brand.name} — Asenso One Studio` },
                sheets: ["Products", "BranchStock", "Orders"].map((title) => ({
                  properties: { title },
                })),
              },
              fields: "spreadsheetId",
            });
            if (!result.data.spreadsheetId)
              throw new Error("Workbook creation returned no identifier.");
            connection.sheetId = result.data.spreadsheetId;
            connection.ready = false;
            await writeConnection(connection);
          }
          // A disconnected workbook may contain manual stock edits; reconnect must preserve those.
          if (!connection.ready) await initializeWorkbook();
          else {
            delete connection.error;
            await writeConnection(connection);
            const s = await load();
            await readStock(s);
            await save(s);
          }
          res.redirect("/customers?sheets=connected");
        } catch {
          connection.error =
            "Google Sheets connection could not finish. Check the account, permissions, enabled Sheets API, and app OAuth settings, then retry. Existing workbooks are retained.";
          await writeConnection(connection);
          res.redirect("/customers?sheets=error");
        }
      }).catch(next);
    });
  });
}
