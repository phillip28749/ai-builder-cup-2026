import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "./api";
import type { State } from "./types";
type Knowledge = {
  positioning: string;
  differentiators: string;
  approvedClaims: string;
  avoid: string;
  examples: string;
  documents: { id: string; name: string; text: string; truncated: boolean }[];
  facebook?: {
    name: string;
    about: string;
    url: string;
    fetchedAt: string;
    recentPosts?: { message: string; createdAt: string }[];
    postsNotice?: string;
  };
};
export default function BrandBrain({ s }: { s: State }) {
  const [k, setK] = useState<Knowledge>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [pageId, setPageId] = useState("");
  const [token, setToken] = useState("");
  const [context, setContext] = useState("");
  async function reload() {
    setK(await api("/owner/knowledge"));
  }
  useEffect(() => {
    reload().catch((e) => setNotice(e.message));
  }, []);
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
      await reload();
      setContext("");
      setNotice("Brand knowledge updated.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!k) return <p>{notice || "Loading brand knowledge…"}</p>;
  return (
    <div className="brand-brain">
      <section className="panel">
        <h2>Your brand brain</h2>
        <p>
          One shared knowledge base for captions, ad creatives, and campaign
          ideas. This grounds the existing model; it does not train a separate
          LLM.
        </p>
        <div className="knowledge-source-counts">
          <span>{s.products.length} products</span>
          <span>{s.audiences.length} audiences</span>
          <span>{k.documents.length} supporting documents</span>
          <span>
            {k.facebook
              ? "Facebook Page imported"
              : "Facebook Page not connected"}
          </span>
        </div>
        <p className="caption-note">
          Store identity and saved brand guidelines are included automatically.{" "}
          <Link to="/customers">Manage product facts in Customer Hub</Link>.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(() => api("/owner/knowledge", k, "PATCH"));
          }}
        >
          {(
            [
              "positioning",
              "differentiators",
              "approvedClaims",
              "avoid",
              "examples",
            ] as const
          ).map((key) => (
            <label className="field" key={key}>
              <span>
                {
                  {
                    positioning: "Positioning: who you help and why",
                    differentiators: "What makes your brand different",
                    approvedClaims:
                      "Approved facts, proof, offers, and claims (public-safe)",
                    avoid: "Words, claims, and styles to avoid",
                    examples: "Examples of your preferred writing",
                  }[key]
                }
              </span>
              <textarea
                rows={3}
                maxLength={
                  key === "positioning" || key === "differentiators"
                    ? 3000
                    : key === "avoid"
                      ? 2000
                      : 4000
                }
                value={k[key]}
                onChange={(e) => setK({ ...k, [key]: e.target.value })}
              />
            </label>
          ))}
          <button disabled={busy}>Save brand knowledge</button>
        </form>
        <details className="knowledge-context">
          <summary>Review the context used for generation</summary>
          <button
            className="secondary small-button"
            disabled={busy}
            onClick={async () => {
              try {
                const r = await api("/owner/knowledge/context");
                setContext(r.context);
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            Build context preview
          </button>
          {context && <pre>{context}</pre>}
        </details>
      </section>
      <section className="panel">
        <h3>Supporting documents</h3>
        <p className="caption-note">
          Upload approved reference material: PDF (text-based, up to 20 pages),
          TXT, MD, CSV, or JSON. Up to 2 MB per file, eight documents. The first
          12,000 characters are retained; relevant excerpts are supplied to the
          model. Private documents are excluded from customer chat.
        </p>
        <input
          aria-label="Upload brand supporting document"
          type="file"
          accept=".pdf,.txt,.md,.csv,.json"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              setNotice("Choose a document up to 2 MB.");
              return;
            }
            await act(async () => {
              const data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  resolve(String(reader.result).split(",")[1]);
                reader.onerror = () =>
                  reject(new Error("Could not read document."));
                reader.readAsDataURL(file);
              });
              await api("/owner/knowledge/documents", {
                name: file.name,
                data,
              });
            });
          }}
        />
        {k.documents.map((doc) => (
          <details key={doc.id} className="knowledge-document">
            <summary>
              {doc.name}
              {doc.truncated ? " · excerpt retained" : ""}
            </summary>
            <pre>{doc.text}</pre>
            <button
              className="secondary small-button"
              disabled={busy}
              onClick={() =>
                act(() =>
                  api(
                    "/owner/knowledge/documents/" + doc.id,
                    undefined,
                    "DELETE",
                  ),
                )
              }
            >
              Remove document
            </button>
          </details>
        ))}
      </section>
      <section className="panel">
        <h3>Facebook Page context</h3>
        {k.facebook ? (
          <>
            <p>
              <a
                href={k.facebook.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {k.facebook.name}
              </a>
            </p>
            <p>
              {k.facebook.about || "No Page description supplied by Facebook."}
            </p>
            <p className="caption-note">
              Read-only Page context imported{" "}
              {new Date(k.facebook.fetchedAt).toLocaleString()}. This is a
              snapshot, not live trend or performance data.
            </p>
            <p className="caption-note">{k.facebook.postsNotice}</p>
            {k.facebook.recentPosts?.map((post, index) => (
              <details key={index} className="knowledge-document">
                <summary>Page writing example {index + 1}</summary>
                <p>{post.message}</p>
              </details>
            ))}
            <div className="actions">
              <button
                disabled={busy}
                className="secondary small-button"
                onClick={() => act(() => api("/owner/facebook/refresh", {}))}
              >
                Refresh Page context
              </button>
              <button
                disabled={busy}
                className="secondary small-button"
                onClick={() =>
                  act(() => api("/owner/facebook", undefined, "DELETE"))
                }
              >
                Disconnect Page
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="caption-note">
              POC connection: provide a Facebook Page ID and Page access token
              with permission to read that Page. The token is verified with Meta
              and encrypted on the backend. Public Page URLs alone are not
              authenticated connections. The operator must configure
              META_GRAPH_VERSION.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api("/owner/facebook/connect", {
                    pageId,
                    accessToken: token,
                  });
                  setToken("");
                });
              }}
            >
              <label className="field">
                <span>Facebook Page ID</span>
                <input
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  pattern="[0-9]+"
                  required
                />
              </label>
              <label className="field">
                <span>Page access token (kept private)</span>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="off"
                  required
                />
              </label>
              <button disabled={busy}>Verify and connect Page</button>
            </form>
            <p className="caption-note">
              This integration reads Page identity and description. It does not
              publish posts or import private messages. A one-click Meta OAuth
              flow is not included in this POC.
            </p>
          </>
        )}
      </section>
      {notice && (
        <p role="status" className="connection-message">
          {notice}
        </p>
      )}
    </div>
  );
}
