import { randomUUID, createHash } from "node:crypto";
import { privateLocked, readPrivate, writePrivate } from "./private-records.js";
import { workspaceId } from "./workspace.js";
const trackingGaps = new Map<string, number>();
type Counts = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
};
export type UsageEvent = {
  id: string;
  at: string;
  feature: string;
  model: string;
  status: string;
  input: number | null;
  output: number | null;
  thinking: number | null;
  total: number | null;
  estimatedUsd: number | null;
  basis: string;
};
type Month = {
  requests: number;
  tokens: number;
  input: number;
  output: number;
  thinking: number;
  unknownTokens: number;
  unpriced: number;
  estimatedUsd: number;
};
type Ledger = {
  since: string;
  events: UsageEvent[];
  months: Record<string, Month>;
  seen: string[];
};
export type UsageSettings = {
  monthlyTokens: number | null;
  monthlyUsd: number | null;
  textInputPerMillion: number | null;
  textOutputPerMillion: number | null;
  imagePerRequest: number | null;
};
export const defaultUsageSettings = (): UsageSettings => ({
  monthlyTokens: null,
  monthlyUsd: null,
  textInputPerMillion: null,
  textOutputPerMillion: null,
  imagePerRequest: null,
});
const count = (n: number | undefined) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
export const readUsageSettings = () =>
  readPrivate("usage-settings", defaultUsageSettings());
export async function recordUsage(
  feature: string,
  model: string,
  metadata?: Counts,
  status = "completed",
  video?: { id: string; seconds: number },
) {
  try {
    await privateLocked(async () => {
      const ledger = await readPrivate<Ledger>("usage-ledger", {
        since: new Date().toISOString(),
        events: [],
        months: {},
        seen: [],
      });
      const id = video
        ? createHash("sha256").update(video.id).digest("hex")
        : randomUUID();
      if (ledger.seen.includes(id)) return;
      const settings = await readUsageSettings();
      const input = count(metadata?.promptTokenCount),
        output = count(metadata?.candidatesTokenCount),
        thinking = count(metadata?.thoughtsTokenCount);
      const total = count(metadata?.totalTokenCount);
      let estimatedUsd: number | null = null,
        basis = "Not priced; check Google billing.";
      if (
        feature === "video" &&
        model === "veo-3.1-lite-generate-preview" &&
        status === "completed" &&
        video
      ) {
        estimatedUsd = video.seconds * 0.05;
        basis =
          "Veo Lite 720p: $0.05/second, Google list price; excludes tax/discounts.";
      } else if (
        feature === "image" &&
        settings.imagePerRequest !== null &&
        status === "completed"
      ) {
        estimatedUsd = settings.imagePerRequest;
        basis =
          "User-configured image estimate; excludes input tokens and extras.";
      } else if (
        feature !== "image" &&
        feature !== "video" &&
        input !== null &&
        output !== null &&
        settings.textInputPerMillion !== null &&
        settings.textOutputPerMillion !== null
      ) {
        estimatedUsd =
          (input * settings.textInputPerMillion +
            (output + (thinking || 0)) * settings.textOutputPerMillion) /
          1000000;
        basis =
          "User-configured text rates, no cache discounts or extra service charges.";
      }
      const event: UsageEvent = {
        id,
        at: new Date().toISOString(),
        feature,
        model,
        status,
        input,
        output,
        thinking,
        total,
        estimatedUsd,
        basis,
      };
      const month = event.at.slice(0, 7);
      const m = (ledger.months[month] ||= {
        requests: 0,
        tokens: 0,
        input: 0,
        output: 0,
        thinking: 0,
        unknownTokens: 0,
        unpriced: 0,
        estimatedUsd: 0,
      });
      m.requests++;
      m.tokens += total || 0;
      m.input += input || 0;
      m.output += output || 0;
      m.thinking += thinking || 0;
      if (total === null && feature !== "video") m.unknownTokens++;
      if (estimatedUsd === null) m.unpriced++;
      else m.estimatedUsd += estimatedUsd;
      ledger.events.unshift(event);
      ledger.events = ledger.events.slice(0, 150);
      ledger.seen.push(id);
      ledger.seen = ledger.seen.slice(-2000);
      await writePrivate("usage-ledger", ledger);
    });
  } catch {
    trackingGaps.set(workspaceId(), (trackingGaps.get(workspaceId()) || 0) + 1);
    console.error(
      "Usage ledger write failed; provider billing remains authoritative.",
    );
  }
}
export async function usageSummary() {
  const gaps = trackingGaps.get(workspaceId()) || 0;
  const ledger = await readPrivate<Ledger>("usage-ledger", {
    since: new Date().toISOString(),
    events: [],
    months: {},
    seen: [],
  });
  const settings = await readUsageSettings();
  const month = new Date().toISOString().slice(0, 7);
  const totals = ledger.months[month] || {
    requests: 0,
    tokens: 0,
    input: 0,
    output: 0,
    thinking: 0,
    unknownTokens: 0,
    unpriced: 0,
    estimatedUsd: 0,
  };
  return {
    since: ledger.since,
    month,
    totals,
    settings,
    remainingTokens:
      settings.monthlyTokens === null || totals.unknownTokens || gaps
        ? null
        : settings.monthlyTokens - totals.tokens,
    remainingUsd:
      settings.monthlyUsd === null || totals.unpriced || gaps
        ? null
        : settings.monthlyUsd - totals.estimatedUsd,
    events: ledger.events,
    providerBalance: null,
    trackingGapsSinceRestart: gaps,
    payer: "Application operator backend key/project",
    notice:
      "Tracking starts with this app version. Allowances are planning limits, not purchased credits or a spending cap. Google AI Studio/Cloud Billing is the source for actual charges and balance. Some usage may be missing after interrupted requests or tracking failures; costs are estimates.",
  };
}
