import { google } from "googleapis";
import type { Order, State, Product } from "../src/types.js";
import { workspaceId, workspaceContext } from "./workspace.js";
import { personalSheetClient } from "./sheets-connection.js";
export const configuredSheetId = () =>
  workspaceId() === "habi-home"
    ? process.env.GOOGLE_SHEET_ID
    : workspaceContext.getStore()?.sheet?.ready &&
        workspaceContext.getStore()?.sheet?.tokens
      ? workspaceContext.getStore()?.sheet?.sheetId
      : undefined;
const sheetId = configuredSheetId;
export const sheetsConfigured = () => Boolean(sheetId());
const client = async () =>
  workspaceId() !== "habi-home"
    ? personalSheetClient()
    : google.sheets({
        version: "v4",
        auth: new google.auth.GoogleAuth({
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        }),
      });
export async function readStock(state: State) {
  if (!sheetId()) return { sample: true };
  const response = await (
    await client()
  ).spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: "BranchStock!A2:C",
  });
  const rows = response.data.values || [];
  const expected = state.products.flatMap((p) =>
    Object.keys(p.stock).map((b) => `${p.id}:${b}`),
  );
  const seen = new Set<string>();
  for (const [id, branch, quantity] of rows) {
    const key = `${id}:${branch}`;
    if (seen.has(key)) throw new Error("Duplicate stock row");
    seen.add(key);
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0)
      throw new Error("Invalid stock quantity");
  }
  if (expected.some((key) => !seen.has(key)))
    throw new Error("Required branch stock row is missing");
  for (const [id, branch, quantity] of rows) {
    const product = state.products.find((p) => p.id === id);
    if (product && branch in product.stock)
      product.stock[branch] = Number(quantity);
  }
  state.syncedAt = new Date().toISOString();
  state.sheetMode = "live";
  return { sample: false };
}
// Catalog flows from the studio to Sheets. Existing Sheet stock is never overwritten.
export async function syncOffering(product: Product) {
  if (!sheetId()) {
    product.sheetStatus = "local";
    delete product.sheetError;
    return;
  }
  product.sheetStatus = "pending";
  try {
    const api = await client();
    const response = await api.spreadsheets.values.batchGet({
      spreadsheetId: sheetId(),
      ranges: ["Products!A2:D", "BranchStock!A2:C"],
    });
    const products = response.data.valueRanges?.[0]?.values || [];
    const stock = response.data.valueRanges?.[1]?.values || [];
    const matches = products.flatMap((row, index) =>
      row[0] === product.id ? [index] : [],
    );
    if (matches.length > 1) throw new Error("Duplicate product rows");
    const row = matches.length ? matches[0] + 2 : products.length + 2;
    const missing: (string | number)[][] = [];
    for (const [branch, quantity] of Object.entries(product.stock)) {
      const matches = stock.filter(
        (r) => r[0] === product.id && r[1] === branch,
      );
      if (matches.length > 1) throw new Error("Duplicate stock rows");
      if (!matches.length) missing.push([product.id, branch, quantity]);
    }
    await api.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId(),
      requestBody: {
        valueInputOption: "RAW",
        data: [
          {
            range: `Products!A${row}:D${row}`,
            values: [
              [product.id, product.name, product.description, product.price],
            ],
          },
          ...(missing.length
            ? [
                {
                  range: `BranchStock!A${stock.length + 2}:C${stock.length + 1 + missing.length}`,
                  values: missing,
                },
              ]
            : []),
        ],
      },
    });
    product.sheetStatus = "synced";
    delete product.sheetError;
  } catch {
    product.sheetStatus = "error";
    product.sheetError =
      "Saved in your studio, but Google Sheets could not be updated. Check the connection and workbook tabs, then retry sync.";
  }
}
export async function syncCatalog(state: State) {
  for (const product of state.products) await syncOffering(product);
  return state.products.some((p) => p.sheetStatus === "error");
}
export async function recordOrder(order: Order) {
  if (!sheetId()) return "sample";
  const api = await client();
  const result = await api.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: "Orders!A:A",
  });
  const row = (result.data.values || []).findIndex((r) => r[0] === order.id);
  const values = [
    [
      order.id,
      order.createdAt,
      order.name,
      order.phone,
      order.productId,
      order.quantity,
      order.branch,
      order.method,
      order.address,
      order.total,
      order.status,
      order.campaignId,
    ],
  ];
  if (row >= 0)
    await api.spreadsheets.values.update({
      spreadsheetId: sheetId(),
      range: `Orders!A${row + 1}:L${row + 1}`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  else
    await api.spreadsheets.values.append({
      spreadsheetId: sheetId(),
      range: "Orders!A:L",
      valueInputOption: "RAW",
      requestBody: { values },
    });
  return "synced";
}
export async function deductStock(order: Order, state: State) {
  const product = state.products.find((p) => p.id === order.productId)!;
  if (sheetId()) {
    const api = await client();
    const rows =
      (
        await api.spreadsheets.values.get({
          spreadsheetId: sheetId(),
          range: "BranchStock!A2:C",
        })
      ).data.values || [];
    const index = rows.findIndex(
      (r) => r[0] === order.productId && r[1] === order.branch,
    );
    if (index < 0 || Number(rows[index][2]) < order.quantity)
      throw new Error("Stock changed or is insufficient. Check the Sheet.");
    const next = Number(rows[index][2]) - order.quantity;
    await api.spreadsheets.values.update({
      spreadsheetId: sheetId(),
      range: `BranchStock!C${index + 2}`,
      valueInputOption: "RAW",
      requestBody: { values: [[next]] },
    });
    product.stock[order.branch] = next;
  } else {
    if (product.stock[order.branch] < order.quantity)
      throw new Error("Insufficient sample stock");
    product.stock[order.branch] -= order.quantity;
  }
}
