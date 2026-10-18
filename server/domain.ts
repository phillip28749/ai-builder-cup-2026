import { z } from "zod";
import type { State, Order } from "../src/types.js";
export const detailsSchema = z
  .object({
    productId: z.string(),
    quantity: z.number().int().min(1).max(100),
    branch: z.string(),
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d ()-]{7,25}$/, "Enter a valid contact number"),
    method: z.enum(["pickup", "delivery"]),
    address: z.string().max(500),
  })
  .refine((d) => d.method !== "delivery" || d.address.trim().length >= 5, {
    message: "Delivery address is required",
  });
export function validateOrder(state: State, raw: unknown) {
  const d = detailsSchema.parse(raw);
  const p = state.products.find((p) => p.id === d.productId);
  if (!p || !(d.branch in p.stock))
    throw new Error("Choose a valid product and branch");
  if (p.stock[d.branch] < d.quantity)
    throw new Error("Not enough available stock");
  return { ...d, total: p.price * d.quantity, productName: p.name };
}
export function canConfirm(order: Order) {
  return order.status === "pending" && order.sheetStatus !== "uncertain";
}
