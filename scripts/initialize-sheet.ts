import { google } from "googleapis";
import { initialState } from "../server/seed.js";
const spreadsheetId = process.env.GOOGLE_SHEET_ID;
if (!spreadsheetId)
  throw new Error(
    "Select an empty demonstration workbook with GOOGLE_SHEET_ID",
  );
const api = google.sheets({
  version: "v4",
  auth: new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  }),
});
const metadata = await api.spreadsheets.get({ spreadsheetId });
const titles = new Set(metadata.data.sheets?.map((s) => s.properties?.title));
for (const name of ["Products", "BranchStock", "Orders"])
  if (titles.has(name)) {
    const existing = await api.spreadsheets.values.get({
      spreadsheetId,
      range: `${name}!A1:L2`,
    });
    if (existing.data.values?.length)
      throw new Error(
        `${name} has data; refusing to overwrite it. Use a new empty workbook.`,
      );
  }
const missing = ["Products", "BranchStock", "Orders"].filter(
  (name) => !titles.has(name),
);
if (missing.length)
  await api.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missing.map((title) => ({
        addSheet: { properties: { title } },
      })),
    },
  });
const state = initialState();
await api.spreadsheets.values.batchUpdate({
  spreadsheetId,
  requestBody: {
    valueInputOption: "RAW",
    data: [
      {
        range: "Products!A1:D",
        values: [
          ["productId", "name", "description", "price"],
          ...state.products.map((p) => [p.id, p.name, p.description, p.price]),
        ],
      },
      {
        range: "BranchStock!A1:C",
        values: [
          ["productId", "branch", "quantity"],
          ...state.products.flatMap((p) =>
            Object.entries(p.stock).map(([branch, q]) => [p.id, branch, q]),
          ),
        ],
      },
      {
        range: "Orders!A1:L1",
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
        ],
      },
    ],
  },
});
console.log(
  `Demo workbook initialized: https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
);
