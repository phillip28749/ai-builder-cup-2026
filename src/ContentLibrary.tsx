import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Download,
  FileText,
  Plus,
  Video,
  X,
} from "lucide-react";
import { api, apiBlob } from "./api";
import { MediaView } from "./MediaStudio";
import type { State, MediaAsset, MediaJob } from "./types";
export default function ContentLibrary({ s }: { s: State }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "media" ? "media" : "posts";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [media, setMedia] = useState<{
    assets: MediaAsset[];
    jobs: MediaJob[];
  }>();
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => {
    setFilter("all");
    setSearch("");
    setPreview("");
  }, [tab]);
  async function refresh() {
    setMedia(await api("/owner/media"));
  }
  useEffect(() => {
    let active = true;
    api<{ assets: MediaAsset[]; jobs: MediaJob[] }>("/owner/media")
      .then((data) => {
        if (active) setMedia(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const pending =
    media?.jobs
      .filter((j) => j.status === "processing")
      .map((j) => j.id)
      .join(",") || "";
  useEffect(() => {
    if (!pending) return;
    let active = true,
      inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        for (const id of pending.split(","))
          await api("/owner/media/jobs/" + id + "/check", {});
        const result = await api<{ assets: MediaAsset[]; jobs: MediaJob[] }>(
          "/owner/media",
        );
        if (active) setMedia(result);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        inFlight = false;
      }
    }, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [pending]);
  useEffect(() => {
    if (!preview) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview("");
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [preview]);
  const query = search.trim().toLowerCase();
  const posts = s.content.filter(
    (c) =>
      (filter === "all" || c.status === filter) &&
      `${c.title} ${c.body} ${c.agenda || ""}`.toLowerCase().includes(query),
  );
  const assets =
    media?.assets.filter(
      (a) =>
        (filter === "all" || a.kind === filter) &&
        a.name.toLowerCase().includes(query),
    ) || [];
  const selected = media?.assets.find((a) => a.id === preview);
  async function download(asset: MediaAsset) {
    try {
      const blob = await apiBlob("/owner/media/" + asset.id + "/file");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asenso-one-${asset.id}.${asset.kind === "video" ? "mp4" : asset.mimeType === "image/png" ? "png" : "jpg"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function switchTab(value: string) {
    setParams(value === "media" ? { tab: "media" } : {});
    setFilter("all");
    setSearch("");
    setPreview("");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">KEPT FOR YOUR NEXT IDEA</div>
          <h1>Content Library</h1>
          <p>
            Find saved posts, uploaded references, and generated photos and
            videos.
          </p>
        </div>
        <Link className="button" to="/content">
          <Plus size={16} /> Create content
        </Link>
      </div>
      <div className="tabs" aria-label="Content Library sections">
        <button
          className={tab === "posts" ? "active" : ""}
          onClick={() => switchTab("posts")}
        >
          Posts · {s.content.length}
        </button>
        <button
          className={tab === "media" ? "active" : ""}
          onClick={() => switchTab("media")}
        >
          Photos & video{media ? ` · ${media.assets.length}` : ""}
        </button>
      </div>
      <div className="library-toolbar">
        <label className="field">
          <span>Search library</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "posts"
                ? "Search titles, captions, or agendas"
                : "Search media names"
            }
          />
        </label>
        <label className="field">
          <span>Filter</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">
              All {tab === "posts" ? "posts" : "media"}
            </option>
            {tab === "posts" ? (
              <>
                <option value="draft">Drafts</option>
                <option value="scheduled">Scheduled</option>
              </>
            ) : (
              <>
                <option value="reference">Uploaded references</option>
                <option value="image">Generated images</option>
                <option value="video">Videos</option>
              </>
            )}
          </select>
        </label>
      </div>
      {error && (
        <p className="connection-message" role="alert">
          {error}
        </p>
      )}
      {tab === "posts" ? (
        <div className="library-post-grid">
          {posts.map((post) => (
            <article className="panel library-post-card" key={post.id}>
              <div className="library-post-visual">
                {post.mediaAssetId ? (
                  <MediaView assetId={post.mediaAssetId} />
                ) : (
                  <div className="library-post-placeholder">
                    <FileText size={30} />
                    <span>Caption / layout draft</span>
                  </div>
                )}
              </div>
              <div className="section-heading">
                <span className="badge">{post.status}</span>
                {post.status === "scheduled" && (
                  <small>
                    {post.date}
                    {post.time ? " · " + post.time : ""}
                  </small>
                )}
              </div>
              <h2>{post.title}</h2>
              {post.agenda && <span className="badge">{post.agenda}</span>}
              <p>
                {post.body.slice(0, 220)}
                {post.body.length > 220 ? "…" : ""}
              </p>
              <div className="actions">
                <Link
                  className="button secondary small-button"
                  to={"/content?edit=" + encodeURIComponent(post.id)}
                >
                  Edit post
                </Link>
                <Link
                  className="button secondary small-button"
                  to={"/calendar?content=" + encodeURIComponent(post.id)}
                >
                  <CalendarDays size={14} /> Plan it
                </Link>
              </div>
            </article>
          ))}
          {!posts.length && (
            <div className="panel empty">
              <FileText size={28} />
              <p>
                {s.content.length
                  ? "No posts match these filters."
                  : "Your saved posts will appear here."}
              </p>
              <Link to="/content">
                Create your first post <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          {selected && (
            <section className="panel library-media-preview">
              <div className="section-heading">
                <h2>{selected.name}</h2>
                <button
                  className="secondary icon-button"
                  aria-label="Close media preview"
                  onClick={() => setPreview("")}
                >
                  <X size={17} />
                </button>
              </div>
              <MediaView assetId={selected.id} />
              <div className="actions">
                <Link
                  className="button secondary small-button"
                  to={"/content?asset=" + selected.id}
                >
                  Use in post <ArrowRight size={14} />
                </Link>
                <button
                  className="secondary small-button"
                  onClick={() => download(selected)}
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </section>
          )}
          {media?.jobs
            .filter((j) => j.status !== "ready")
            .map((job) => (
              <div className="connection-message" key={job.id}>
                <strong>
                  {job.status === "processing"
                    ? "Video generation in progress"
                    : job.status === "needs-review"
                      ? "Video submission needs review"
                      : "Video generation failed"}
                </strong>
                <p>
                  {job.error ||
                    "Checking the existing operation every 10 seconds. No new generation is started."}
                </p>
                {job.status === "processing" && (
                  <button
                    className="secondary small-button"
                    onClick={async () => {
                      try {
                        await api("/owner/media/jobs/" + job.id + "/check", {});
                        await refresh();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Check status
                  </button>
                )}
              </div>
            ))}
          {!media && !error && <p role="status">Loading your media library…</p>}
          <div className="media-library-grid">
            {assets.map((asset) => (
              <article className="panel media-library-item" key={asset.id}>
                <button
                  className="asset-preview-button"
                  aria-label={"Preview " + asset.name}
                  onClick={() => setPreview(asset.id)}
                >
                  {asset.kind === "video" ? (
                    <div className="video-tile">
                      <Video size={30} />
                      <span>Preview video</span>
                    </div>
                  ) : (
                    <MediaView assetId={asset.id} thumbnail />
                  )}
                </button>
                <span className="badge">
                  {asset.kind === "reference"
                    ? "Uploaded reference"
                    : asset.kind === "video"
                      ? "AI video"
                      : "AI image"}
                </span>
                <strong>{asset.name}</strong>
                <small>{new Date(asset.createdAt).toLocaleString()}</small>
                <div className="actions">
                  <Link className="text-link" to={"/content?asset=" + asset.id}>
                    Use in post <ArrowRight size={14} />
                  </Link>
                  <button
                    className="text-button"
                    onClick={() => download(asset)}
                  >
                    <Download size={14} /> Download
                  </button>
                </div>
              </article>
            ))}
          </div>
          {media && !assets.length && (
            <div className="panel empty">
              <Video size={26} />
              <p>
                {media.assets.length
                  ? "No media match these filters."
                  : "Upload or generate your first visual in Content Studio."}
              </p>
              <Link to="/content">Open Content Studio</Link>
            </div>
          )}
        </>
      )}
    </>
  );
}
