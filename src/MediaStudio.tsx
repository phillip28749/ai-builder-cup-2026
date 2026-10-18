import AssetPicker from "./AssetPicker";
import { Link } from "react-router-dom";
import CreativeControls from "./CreativeControls";
import {
  defaultCreative,
  SCENE_PRESETS,
  type CreativeOptions,
} from "./creative-options";
import type { State } from "./types";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  Camera,
  Video,
  Upload,
  Sparkles,
  Download,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import { api, apiBlob, peekApiMedia } from "./api";
import { retainMediaUrl } from "./media-cache";
import type { MediaAsset, MediaJob, MediaConfig } from "./types";

export function MediaView({
  assetId,
  className = "",
  thumbnail = false,
}: {
  assetId: string;
  className?: string;
  thumbnail?: boolean;
}) {
  const endpoint = `/owner/media/${assetId}/${thumbnail ? "thumbnail" : "file"}`;
  const thumbnailEndpoint = `/owner/media/${assetId}/thumbnail`;
  const cachedPreview = () =>
    peekApiMedia(endpoint) ||
    (!thumbnail ? peekApiMedia(thumbnailEndpoint) : undefined);
  const [media, setMedia] = useState(() => {
    const cached = cachedPreview();
    return cached
      ? { assetId, url: cached.url, mime: cached.blob.type }
      : undefined;
  });
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const releases: Array<() => void> = [];
    const cachedFull = peekApiMedia(endpoint);
    const cached =
      cachedFull || (!thumbnail ? peekApiMedia(thumbnailEndpoint) : undefined);
    if (cached) {
      const lease = retainMediaUrl(cached.blob);
      releases.push(lease.release);
      setMedia({ assetId, url: lease.url, mime: cached.blob.type });
    } else setMedia(undefined);
    setError("");
    if (!cachedFull)
      apiBlob(endpoint)
        .then(async (blob) => {
          if (!active) return;
          const lease = retainMediaUrl(blob);
          releases.push(lease.release);
          if (blob.type.startsWith("image/")) {
            const image = new Image();
            image.src = lease.url;
            await image.decode();
          }
          if (active) setMedia({ assetId, url: lease.url, mime: blob.type });
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
      releases.forEach((release) => release());
    };
  }, [assetId, thumbnail]);
  const displayed = media?.assetId === assetId ? media : undefined;
  if (error && !displayed) return <p className="error-text">{error}</p>;
  if (!displayed)
    return (
      <div className="media-loading" role="status">
        Opening media…
      </div>
    );
  return displayed.mime.startsWith("video/") ? (
    <video
      className={"generated-media " + className}
      src={displayed.url}
      controls
      playsInline
      preload="metadata"
      aria-label="Generated product video"
    />
  ) : (
    <img
      className={"generated-media " + className}
      src={displayed.url}
      alt="Product reference or generated creative"
    />
  );
}
const presets = {
  product: SCENE_PRESETS.neutral,
  advertisement: SCENE_PRESETS.lifestyle,
  video:
    SCENE_PRESETS.neutral +
    " Slow cinematic camera move and subtle background motion.",
};
export default function MediaStudio({
  onUse,
  showDeveloperSetup = false,
}: {
  onUse: (asset: MediaAsset) => void;
  showDeveloperSetup?: boolean;
}) {
  const [config, setConfig] = useState<MediaConfig>();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState("");
  const [jobs, setJobs] = useState<MediaJob[]>([]);
  const [mode, setMode] = useState<keyof typeof presets>("product");
  const [prompt, setPrompt] = useState(presets.product);
  const [ratio, setRatio] = useState("1:1");
  const [creative, setCreative] = useState<CreativeOptions>(defaultCreative);
  const [workspace, setWorkspace] = useState<State>();
  const [brief, setBrief] = useState("");
  useEffect(() => {
    api<State>("/owner/state")
      .then(setWorkspace)
      .catch(() => {});
  }, []);

  const [reference, setReference] = useState("");
  const [subject, setSubject] = useState("");
  useEffect(() => {
    setSubject("");
  }, [reference]);
  useEffect(() => {
    setBrief("");
  }, [creative, reference, prompt, mode, subject]);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [keyChecked, setKeyChecked] = useState(false);
  const activeAsset = assets.find((a) => a.id === preview);
  const activeReference = assets.find((a) => a.id === reference);
  const sourceName = assets.find(
    (a) => a.id === activeAsset?.sourceAssetId,
  )?.name;
  async function refreshLibrary() {
    setLibraryLoading(true);
    setLibraryError("");
    try {
      const library = await api<{ assets: MediaAsset[]; jobs: MediaJob[] }>(
        "/owner/media",
      );
      setAssets(library.assets);
      setJobs(library.jobs);
      return library;
    } catch (e) {
      setLibraryError((e as Error).message);
      throw e;
    } finally {
      setLibraryLoading(false);
    }
  }
  async function refresh() {
    // Update the library independently: a setup-status failure must not hide photos.
    const [, library] = await Promise.all([
      api<MediaConfig>("/owner/media/config").then(setConfig),
      refreshLibrary(),
    ]);
    return library;
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  const pendingIds = jobs
    .filter((j) => j.status === "processing")
    .map((j) => j.id)
    .join(",");
  useEffect(() => {
    if (!pendingIds) return;
    let inFlight = false;
    let active = true;
    const timer = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const results = await Promise.all(
          pendingIds
            .split(",")
            .map((id) => api<MediaJob>(`/owner/media/jobs/${id}/check`, {})),
        );
        if (active) {
          await refresh();
          const done = results.find((j) => j.status === "ready" && j.assetId);
          if (done) {
            setPreview(done.assetId!);
            setNotice(
              "Your video is ready. Preview it before using it in a post.",
            );
          }
        }
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
  }, [pendingIds]);
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    await act(async () => {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 4 * 1024 * 1024
      )
        throw new Error("Choose a JPEG, PNG, or WebP photo smaller than 4 MB.");
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = () =>
          reject(new Error("Could not read the selected photo"));
        r.readAsDataURL(file);
      });
      const asset = await api<MediaAsset>("/owner/media/upload", {
        name: file.name,
        mimeType: file.type,
        data,
      });
      await refresh();
      setReference(asset.id);
      setPreview(asset.id);
      setNotice(
        "Product photo uploaded. Choose a creative type and describe the scene.",
      );
    });
    input.value = "";
  }
  async function download(asset: MediaAsset) {
    await act(async () => {
      const blob = await apiBlob(`/owner/media/${asset.id}/file`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `asenso-one-${asset.kind}-${asset.id.slice(0, 8)}.${asset.kind === "video" ? "mp4" : asset.mimeType === "image/png" ? "png" : "jpg"}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Download prepared.");
    });
  }
  return (
    <section className="media-studio">
      <div className="media-intro">
        <div>
          <div className="eyebrow">
            FROM A PRODUCT PHOTO TO YOUR NEXT CAMPAIGN
          </div>
          <h2>One photo. A new point of view.</h2>
          <p>
            Upload your product, then create a styled shot, an advertising
            creative, or a short video.
          </p>
        </div>
        <span
          className={"badge " + (config?.keyConfigured ? "green" : "warning")}
        >
          {config?.keyConfigured
            ? showDeveloperSetup
              ? "Backend key provided"
              : "AI generation available"
            : showDeveloperSetup
              ? "Gemini API key needed"
              : "AI generation unavailable"}
        </span>
      </div>
      {showDeveloperSetup && (
        <details className="media-connection" open={!config?.keyConfigured}>
          <summary>
            <Settings2 size={16} /> Generation setup & connection status
          </summary>
          <div className="connection-content">
            <p>
              Your Gemini key belongs on the backend. Add{" "}
              <code>GEMINI_API_KEY</code> to the server’s <code>.env</code> and
              restart it. On Cloud Run, supply it through Secret Manager. Use
              the repository’s <code>.env.example</code> as a reference.
            </p>
            <div className="connection-grid">
              <div>
                <small>API KEY</small>
                <strong>
                  {config?.keyConfigured
                    ? keyChecked
                      ? "Present on server · check passed"
                      : "Present on server · not yet verified"
                    : "Not configured"}
                </strong>
              </div>
              <div>
                <small>IMAGE MODEL</small>
                <strong>{config?.imageModel || "Checking…"}</strong>
              </div>
              <div>
                <small>VIDEO MODEL</small>
                <strong>{config?.videoModel || "Checking…"}</strong>
              </div>
              <div>
                <small>MEDIA STORAGE</small>
                <strong>
                  {config?.storage}
                  {config && !config.storageReady ? " · setup required" : ""}
                </strong>
              </div>
            </div>
            <p className="caption-note">
              The key is never returned to the browser. Image and Veo access
              depend on your Google project’s billing, quota, and available
              models. Generation uses your configured key; video requests may
              take several minutes.
            </p>
            <div className="actions">
              <button
                className="secondary small-button"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await refresh();
                    setNotice(
                      "Backend status refreshed. Restart the server after changing its environment.",
                    );
                  })
                }
              >
                <RefreshCw size={14} /> Recheck setup
              </button>
              <button
                className="secondary small-button"
                disabled={busy || !config?.keyConfigured}
                onClick={() =>
                  act(async () => {
                    const r = await api("/owner/media/check", {});
                    setKeyChecked(true);
                    setNotice(r.message);
                  })
                }
              >
                <CheckCircle2 size={14} /> Test key & image model
              </button>
            </div>
          </div>
        </details>
      )}
      <div className="media-workspace">
        <section className="panel">
          <div className="section-heading">
            <h2>Start with your product.</h2>
            <span className="badge">01 / REFERENCE</span>
          </div>
          <label className={"upload-zone " + (busy ? "disabled" : "")}>
            <Upload size={25} />
            <strong>{busy ? "Working…" : "Upload a product photo"}</strong>
            <small>JPEG, PNG, WebP · up to 4 MB</small>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Upload product photo"
              disabled={busy || Boolean(config && !config.storageReady)}
              onChange={upload}
            />
          </label>
          <div className="saved-photo-picker" aria-busy={libraryLoading}>
            <AssetPicker
              label="Or choose a saved photo"
              value={reference}
              assets={assets.filter((a) => a.kind !== "video")}
              disabled={busy || libraryLoading}
              emptyLabel={
                libraryLoading
                  ? "Loading saved photos..."
                  : libraryError && !assets.length
                    ? "Photo library unavailable"
                    : "Choose a photo"
              }
              onChange={(id) => {
                setReference(id);
                setPreview(id);
                setCreative((c) =>
                  c.templateAssetId === id ? { ...c, templateAssetId: "" } : c,
                );
              }}
            />
            {libraryLoading ? (
              <p className="caption-note" role="status">
                Loading your saved photos...
              </p>
            ) : libraryError ? (
              <p className="error-text" role="alert">
                Could not refresh your saved photos: {libraryError}{" "}
                {assets.length
                  ? "Previously loaded photos are still available."
                  : "Retry loading the library below."}
              </p>
            ) : !assets.some((a) => a.kind !== "video") ? (
              <p className="caption-note" role="status">
                No saved photos yet. Upload a product photo above to get
                started.
              </p>
            ) : null}
            <button
              type="button"
              className="secondary small-button"
              disabled={busy || libraryLoading}
              onClick={() => act(refreshLibrary)}
            >
              <RefreshCw size={14} />{" "}
              {libraryError ? "Retry loading photos" : "Reload saved photos"}
            </button>
          </div>
          <div className="media-mode-picker" aria-label="Creative type">
            {(
              [
                ["product", "Product shot", Camera],
                ["advertisement", "Ad creative", ImageIcon],
                ["video", "Video", Video],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                className={mode === value ? "active" : ""}
                disabled={busy}
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  setPrompt(presets[value]);
                  if (value === "video") {
                    setRatio("16:9");
                    setCreative((c) => ({
                      ...c,
                      format: "landscape",
                      width: 1920,
                      height: 1080,
                      templateAssetId: "",
                      referenceRole: "product",
                    }));
                  }
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
          <CreativeControls
            value={creative}
            subject={subject}
            onSubjectChange={setSubject}
            prompt={prompt}
            onPromptChange={setPrompt}
            disabled={busy}
            state={workspace}
            assets={assets}
            reference={reference}
            video={mode === "video"}
            onChange={(value) => {
              if (value.referenceRole !== creative.referenceRole)
                setPrompt(
                  value.referenceRole === "style"
                    ? "Create an original creative using the template style and the approved subject facts in the brief."
                    : presets[mode],
                );
              setCreative(value);
              const ratio = value.width / value.height;
              setRatio(ratio > 1.2 ? "16:9" : ratio < 0.8 ? "9:16" : "1:1");
            }}
          />
          <details className="creative-brief-preview">
            <summary>Review generation brief</summary>
            <button
              className="secondary small-button"
              disabled={busy || !reference || !prompt.trim()}
              onClick={() =>
                act(async () => {
                  const r = await api("/owner/media/brief", {
                    sourceAssetId: reference,
                    prompt,
                    subject,
                    kind: mode,
                    aspectRatio: ratio,
                    creative,
                  });
                  setBrief(r.brief);
                })
              }
            >
              Build brief preview (no generation)
            </button>
            {brief && <pre>{brief}</pre>}
          </details>
          <button
            disabled={
              busy ||
              !reference ||
              !prompt.trim() ||
              !config?.keyConfigured ||
              !config?.storageReady ||
              (mode === "video" && jobs.some((j) => j.status === "processing"))
            }
            onClick={() =>
              act(async () => {
                const r = await api<{ asset?: MediaAsset; job?: MediaJob }>(
                  "/owner/media/generate",
                  {
                    sourceAssetId: reference,
                    prompt,
                    subject,
                    creative,
                    kind: mode,
                    aspectRatio: ratio,
                    requestId: crypto.randomUUID(),
                  },
                );
                await refresh();
                if (r.asset) {
                  setPreview(r.asset.id);
                  setNotice(
                    "Creative generated and saved. Review the product details before using it.",
                  );
                } else if (r.job) {
                  if (r.job.status === "needs-review")
                    throw new Error(
                      r.job.error || "Check the provider before resubmitting.",
                    );
                  setNotice(
                    "Video submitted. You can leave this page and return to check progress.",
                  );
                }
              })
            }
          >
            <Sparkles size={16} />
            {busy
              ? "Working…"
              : mode === "video"
                ? "Generate 8-second video"
                : "Generate " +
                  (mode === "product"
                    ? "product shot"
                    : "advertising creative")}
          </button>
          {!config?.keyConfigured && (
            <p className="caption-note">
              You can upload a reference now. Generation becomes available when
              the backend Gemini key is configured.
            </p>
          )}
          <p className="caption-note">
            Brand styling guides the scene; the reference defines the subject.
            AI can still alter details. Compare the result with your reference
            before using it.
          </p>
        </section>
        <section className="panel media-preview-panel">
          <div className="section-heading">
            <h2>
              {activeAsset?.kind === "reference"
                ? "Your uploaded reference"
                : "Your creative preview"}
            </h2>
            <span className="badge">
              {activeAsset
                ? activeAsset.kind === "reference"
                  ? "UPLOADED PHOTO"
                  : "AI-GENERATED"
                : "02 / PREVIEW"}
            </span>
          </div>
          {activeAsset ? (
            <>
              <MediaView assetId={activeAsset.id} />
              <h3>{activeAsset.name}</h3>
              <p className="caption-note">
                {activeAsset.kind === "reference"
                  ? "Original upload · not AI-generated"
                  : `Generated with ${activeAsset.model}`}{" "}
                {sourceName ? `· Reference: ${sourceName}` : ""}
              </p>
              <div className="actions">
                <button disabled={busy} onClick={() => onUse(activeAsset)}>
                  Use in post <ArrowRight size={16} />
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => download(activeAsset)}
                >
                  <Download size={16} /> Download
                </button>
              </div>
            </>
          ) : (
            <div className="media-empty">
              <Camera size={40} />
              <h3>A new scene starts with one photo.</h3>
              <p>
                Your actual upload and generated result will appear here. No
                sample image is substituted for a failed generation.
              </p>
            </div>
          )}
          {jobs
            .filter((j) => j.status !== "ready")
            .map((job) => (
              <div
                className={
                  "video-job " +
                  (job.status !== "processing" ? "job-error" : "")
                }
                key={job.id}
              >
                <Video size={18} />
                <div>
                  <strong>
                    {job.status === "processing"
                      ? "Video is being generated"
                      : job.status === "needs-review"
                        ? "Submission needs review"
                        : "Video could not be generated"}
                  </strong>
                  <small>
                    {job.error ||
                      "Google is processing the video. This page checks approximately every 10 seconds."}
                  </small>
                  {job.status === "processing" && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          const r = await api<MediaJob>(
                            `/owner/media/jobs/${job.id}/check`,
                            {},
                          );
                          await refresh();
                          if (r.assetId) setPreview(r.assetId);
                        })
                      }
                    >
                      Check now
                    </button>
                  )}
                </div>
              </div>
            ))}
        </section>
      </div>
      {error && (
        <div className="media-alert error-text" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="media-alert" role="status">
          {notice}
        </div>
      )}
      <p className="caption-note">
        Uploaded references and generated results are saved automatically.{" "}
        <Link to="/library?tab=media">Browse your Content Library</Link>.
      </p>
    </section>
  );
}
