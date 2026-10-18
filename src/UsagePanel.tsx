import { useEffect, useState } from "react";
import { api } from "./api";
type Settings = {
  monthlyTokens: number | null;
  monthlyUsd: number | null;
  textInputPerMillion: number | null;
  textOutputPerMillion: number | null;
  imagePerRequest: number | null;
};
type Data = {
  since: string;
  month: string;
  totals: {
    requests: number;
    tokens: number;
    input: number;
    output: number;
    thinking: number;
    unknownTokens: number;
    unpriced: number;
    estimatedUsd: number;
  };
  settings: Settings;
  remainingTokens: number | null;
  remainingUsd: number | null;
  notice: string;
  payer: string;
  trackingGapsSinceRestart: number;
  events: {
    id: string;
    at: string;
    feature: string;
    model: string;
    status: string;
    total: number | null;
    estimatedUsd: number | null;
    basis: string;
  }[];
};
const usd = (n: number) => `US$${n.toFixed(4)}`;
export default function UsagePanel() {
  const [data, setData] = useState<Data>();
  const [settings, setSettings] = useState<Settings>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const result = await api<Data>("/owner/usage");
    setData(result);
    return result;
  }
  useEffect(() => {
    let active = true;
    api<Data>("/owner/usage")
      .then((d) => {
        if (active) {
          setData(d);
          setSettings(d.settings);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  if (!data || !settings)
    return <p role="status">{error || "Loading AI usage…"}</p>;
  return (
    <div className="usage-panel">
      <div className="section-heading">
        <div>
          <h2>AI usage & balance</h2>
          <p className="caption-note">
            {data.month} · API usage attributed to this workspace
          </p>
        </div>
        <button
          className="secondary small-button"
          onClick={() => refresh().catch((e) => setError(e.message))}
        >
          Refresh usage
        </button>
      </div>
      <div className="usage-metrics">
        {[
          ["Measured tokens", data.totals.tokens.toLocaleString()],
          ["Requests recorded", String(data.totals.requests)],
          [
            "Token allowance remaining",
            data.remainingTokens === null
              ? "Not available"
              : data.remainingTokens.toLocaleString(),
          ],
          ["Estimated known cost", usd(data.totals.estimatedUsd)],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <h3>What your balance means</h3>
        <p>{data.notice}</p>
        {data.trackingGapsSinceRestart > 0 && (
          <p role="alert" className="error-text">
            Some provider requests could not be recorded. Remaining allowances
            are unknown; check Google billing.
          </p>
        )}
        <p>
          Token allowances cover reported Gemini tokens. Veo video is priced
          separately by seconds. These are planning allowances, not a purchased
          credit wallet.
        </p>
        <p>
          <strong>Provider credit balance:</strong> unavailable through this
          app.{" "}
          <a
            href="https://aistudio.google.com/usage"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Google AI Studio billing/usage
          </a>
          .
        </p>
        <p>
          <strong>Paid by:</strong> {data.payer}. Input:{" "}
          {data.totals.input.toLocaleString()} · output:{" "}
          {data.totals.output.toLocaleString()} · thinking:{" "}
          {data.totals.thinking.toLocaleString()} tokens.
        </p>
        <p>
          {data.totals.unknownTokens} requests have unavailable token counts.{" "}
          {data.totals.unpriced} requests have no cost estimate. Pending videos
          are excluded until completion is checked.
        </p>
        <p>
          <strong>Remaining monthly cost allowance:</strong>{" "}
          {data.remainingUsd === null
            ? "Unknown or not configured"
            : usd(data.remainingUsd)}
          . An image estimate excludes extra input charges; Google’s invoice
          remains authoritative.
        </p>
      </section>
      <section className="panel">
        <h3>Planning allowances & estimate rates</h3>
        <p className="caption-note">
          Optional soft planning limits, not purchased credits or enforcement.
          Leave rates blank if unknown. Changing rates only affects future
          recorded requests. Enter rates for your currently configured model.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/owner/usage/settings", settings, "PATCH");
              await refresh();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            {(Object.keys(settings) as (keyof Settings)[]).map((key) => (
              <label className="field" key={key}>
                <span>
                  {
                    {
                      monthlyTokens: "Monthly token allowance",
                      monthlyUsd: "Monthly USD allowance",
                      textInputPerMillion: "Text input US$ / million tokens",
                      textOutputPerMillion: "Text output US$ / million tokens",
                      imagePerRequest:
                        "Image estimate US$ / image (excluding inputs)",
                    }[key]
                  }
                </span>
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="any"
                  value={settings[key] ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      [key]:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <button disabled={busy}>
            {busy ? "Saving…" : "Save allowances"}
          </button>
        </form>
      </section>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <section className="panel">
        <h3>Recent provider requests</h3>
        <p className="caption-note">
          Tracked since {new Date(data.since).toLocaleString()}. Historical
          requests are not reconstructed.
        </p>
        <div className="usage-table-wrap">
          <table className="usage-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Feature / model</th>
                <th>Tokens</th>
                <th>Estimated cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.at).toLocaleString()}</td>
                  <td>
                    {event.feature}
                    <small>{event.model}</small>
                  </td>
                  <td>{event.total ?? "Unavailable"}</td>
                  <td title={event.basis}>
                    {event.estimatedUsd === null
                      ? "Not estimated"
                      : usd(event.estimatedUsd)}
                  </td>
                  <td>{event.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.events.length && <p>No provider requests recorded yet.</p>}
      </section>
    </div>
  );
}
