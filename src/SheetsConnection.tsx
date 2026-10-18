import { useEffect, useState } from "react";
import { ExternalLink, Leaf, RefreshCw } from "lucide-react";
import { api } from "./api";
import type { State } from "./types";

type Status = {
  configured: boolean;
  personal: boolean;
  connected: boolean;
  url: string | null;
  incomplete: boolean;
  error: string | null;
};
export default function SheetsConnection({
  s,
  busy,
  run,
  showDeveloperSetup = false,
}: {
  s: State;
  busy: boolean;
  run: (fn: () => Promise<unknown>, success?: string) => Promise<void>;
  showDeveloperSetup?: boolean;
}) {
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState("");
  const [setup, setSetup] = useState(false);
  const outcome = new URLSearchParams(window.location.search).get("sheets");
  async function refresh() {
    setStatus(await api("/owner/sheets/status"));
  }
  useEffect(() => {
    let active = true;
    api<Status>("/owner/sheets/status")
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [s.sheetConnected, s.syncedAt]);
  return (
    <section
      className="sheets-connection"
      aria-label="Google Sheets connection"
    >
      <div className="sync-banner">
        <div>
          <Leaf size={20} />
          <div>
            <strong>
              {status?.connected
                ? "Your Google Sheets workbook"
                : "Connect your Google Sheets"}
            </strong>
            <small>
              {status?.connected
                ? s.syncedAt
                  ? `Last successful sync: ${new Date(s.syncedAt).toLocaleString()}`
                  : "Connected · sync to refresh stock"
                : "Keep products, stock, and order records in your own Google Drive."}
            </small>
          </div>
        </div>
        <div className="actions">
          {status?.connected ? (
            <>
              <button
                className="secondary small-button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api("/owner/sync", {});
                    await refresh();
                  }, "Catalog and inventory synchronized")
                }
              >
                <RefreshCw size={15} /> Sync workbook
              </button>
              <a
                className="button secondary small-button"
                href={status.url!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={15} /> Open Sheet
              </a>
            </>
          ) : (
            <button
              className="secondary small-button"
              disabled={busy || !status}
              onClick={() => {
                if (!status?.configured || !status.personal) {
                  if (showDeveloperSetup) setSetup(true);
                  else
                    setError(
                      status?.personal
                        ? "Google Sheets connection is temporarily unavailable. Please contact the studio administrator."
                        : "Sign in with Google to connect your own workbook.",
                    );
                  return;
                }
                return run(async () => {
                  const result = await api<{ url: string }>(
                    "/owner/sheets/connect",
                    {},
                  );
                  window.location.assign(result.url);
                }, "Opening Google authorization");
              }}
            >
              <ExternalLink size={15} /> Connect Google Sheets
            </button>
          )}
        </div>
      </div>
      {!status?.connected && (
        <p className="connection-help">
          Creates a new workbook with Products, BranchStock, and Orders tabs
          from this studio. Only files created through this app are requested.
          Your existing spreadsheets are not selected or overwritten.
        </p>
      )}
      {outcome === "cancelled" && (
        <p role="status" className="connection-message">
          Google Sheets access was cancelled. You can connect whenever you’re
          ready.
        </p>
      )}
      {outcome === "reconnect" && (
        <p role="status" className="connection-message">
          You are on the secure connection address. Click Connect Google Sheets
          to continue with the same Google account. Your existing workbook is retained.
        </p>
      )}
      {outcome === "expired" && (
        <p role="alert" className="connection-message">
          This connection attempt expired or its browser session was unavailable.
          Click Connect Google Sheets to start a fresh attempt in this tab, then
          complete Google authorization within 10 minutes. Your workbook has not been deleted.
        </p>
      )}
      {(error || status?.error) && (
        <p role="alert" className="connection-message">
          {error || status?.error}
        </p>
      )}
      {status?.incomplete && (
        <div className="connection-message">
          Your workbook was created, but its initial records still need to be
          saved.{" "}
          <button
            className="secondary small-button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await api("/owner/sheets/initialize", {});
                await refresh();
              }, "Workbook setup completed")
            }
          >
            Finish workbook setup
          </button>
        </div>
      )}
      {status?.connected && status.personal && (
        <div className="connection-links">
          <button
            className="text-button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await api("/owner/sheets/connect", {});
                window.location.assign(r.url);
              }, "Opening Google authorization")
            }
          >
            Renew Google access
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await api("/owner/sheets/disconnect", {});
                await refresh();
              }, "Google Sheets disconnected; your workbook is kept in Drive")
            }
          >
            Disconnect
          </button>
          <span>Disconnect stops this app’s sync and keeps your workbook.</span>
        </div>
      )}
      {showDeveloperSetup &&
        (setup || (status && !status.configured && status.personal)) && (
          <details className="connection-setup" open={setup}>
            <summary>Google Sheets needs one-time app setup</summary>
            {!status?.personal ? (
              <p>
                Sign in with Google to connect a private workbook. Shared demo
                access cannot connect a personal Google account.
              </p>
            ) : (
              <>
                <ol>
                  <li>
                    In this project’s Google Cloud console, enable the{" "}
                    <strong>Google Sheets API</strong>.
                  </li>
                  <li>
                    Under <strong>Google Auth Platform</strong>, configure
                    Branding and Audience. If the app is in Testing, add the
                    Google accounts that will try it as test users.
                  </li>
                  <li>
                    Create a <strong>Web application</strong> OAuth client. Add{" "}
                    <code>
                      http://localhost:8088/api/google/sheets/callback
                    </code>{" "}
                    as an authorized redirect URI for local use.
                  </li>
                  <li>
                    On the backend, set <code>GOOGLE_OAUTH_CLIENT_ID</code>,{" "}
                    <code>GOOGLE_OAUTH_CLIENT_SECRET</code>, and{" "}
                    <code>GOOGLE_OAUTH_REDIRECT_URI</code>. Set a stable random{" "}
                    <code>SESSION_SECRET</code> of at least 32 characters.
                    Restart the server.
                  </li>
                  <li>
                    Click <strong>Connect Google Sheets</strong> and approve
                    access using the same Google account as your studio login.
                  </li>
                </ol>
                <a
                  href="https://console.cloud.google.com/auth/clients"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Google OAuth clients <ExternalLink size={12} />
                </a>
                <p>
                  The app operator configures these credentials once. Other
                  users only approve Google access. OAuth client secrets stay on
                  the backend.
                </p>
              </>
            )}
          </details>
        )}
    </section>
  );
}
