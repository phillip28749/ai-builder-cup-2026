export type Brand = {
  heroAssetId?: string;
  heroImageFit?: "cover" | "contain";
  name: string;
  founder: string;
  tagline: string;
  story: string;
  mission: string;
  voice: string;
  color: string;
  promise: string;
  guidelines: string;
};
export type Audience = {
  id: string;
  name: string;
  description: string;
  needs: string;
};
export type Product = {
  photoAssetId?: string;
  sheetStatus?: "local" | "pending" | "synced" | "error";
  sheetError?: string;
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: Record<string, number>;
};
export type ContentItem = {
  agenda?: string;
  time?: string;
  mediaAssetId?: string;
  id: string;
  title: string;
  body: string;
  direction: string;
  audienceId: string;
  brandVoice: string;
  status: "draft" | "scheduled";
  date: string;
  campaignId: string;
  createdAt: string;
};
export type MediaAsset = {
  id: string;
  kind: "reference" | "image" | "video";
  mimeType: string;
  name: string;
  createdAt: string;
  prompt: string;
  model: string;
  sourceAssetId: string;
  size: number;
};
export type MediaJob = {
  id: string;
  status: "processing" | "ready" | "failed" | "needs-review";
  operationName: string;
  sourceAssetId: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  createdAt: string;
  assetId?: string;
  error?: string;
};
export type MediaConfig = {
  keyConfigured: boolean;
  storageReady: boolean;
  storage: string;
  imageModel: string;
  videoModel: string;
};
export type Message = {
  role: "customer" | "assistant" | "staff";
  text: string;
  at: string;
  source?: string;
};
export type Conversation = {
  id: string;
  campaignId: string;
  mode: "ai" | "human";
  messages: Message[];
};
export type OrderDetails = {
  productId: string;
  quantity: number;
  branch: string;
  name: string;
  phone: string;
  method: "pickup" | "delivery";
  address: string;
};
export type Order = OrderDetails & {
  id: string;
  conversationId: string;
  campaignId: string;
  total: number;
  productName: string;
  status: "draft" | "pending" | "confirmed" | "cancelled" | "needs-review";
  sheetStatus: string;
  createdAt: string;
  error?: string;
};
export type State = {
  storeSetupComplete?: boolean;
  workspaceId?: string;
  account?: { name: string; email: string } | null;
  sheetConnected?: boolean;
  brand: Brand;
  audiences: Audience[];
  products: Product[];
  content: ContentItem[];
  conversations: Conversation[];
  orders: Order[];
  insights: string;
  syncedAt: string | null;
  sheetMode: string;
};
export type Config = {
  showDeveloperSetup?: boolean;
  demo: boolean;
  persistence: string;
  aiConfigured: boolean;
  sheetsConfigured: boolean;
  firebase: Record<string, string> | null;
};
