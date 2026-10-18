import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Link,
  NavLink,
  Routes,
  Route,
  Navigate,
  useLocation,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Check,
  CheckCircle2,
  Sparkles,
  LayoutDashboard,
  Palette,
  FileText,
  Library,
  CalendarDays,
  Users,
  MessagesSquare,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Menu,
  X,
  ExternalLink,
  RefreshCw,
  Send,
  ShoppingBag,
  Clock,
  Copy,
  LogOut,
} from "lucide-react";
import { api, configureAuth, logout } from "./api";
import LoginPage from "./LoginPage";
import AccountMenu from "./AccountMenu";
import BrandBrain from "./BrandBrain";
import UsagePanel from "./UsagePanel";
import UsageIndicator from "./UsageIndicator";
import ContentLibrary from "./ContentLibrary";
import SheetsConnection from "./SheetsConnection";
import Offerings from "./Offerings";
import ProductPhoto from "./ProductPhoto";
import ChatMessage from "./ChatMessage";
import AssetPicker from "./AssetPicker";
import Calendar from "./Calendar";
import MediaStudio, { MediaView } from "./MediaStudio";
import type {
  State,
  Config,
  Brand,
  ContentItem,
  Order,
  Conversation,
  MediaAsset,
} from "./types";

const money = (v: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(v);
const date = (v: string) =>
  new Date(v).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const storePathFor = (state: State) =>
  "/s/" + (state.workspaceId || "habi-home");
const nav = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/settings", "Store settings", Palette],
  ["/content", "Content Studio", FileText],
  ["/library", "Content Library", Library],
  ["/calendar", "Calendar", CalendarDays],
  ["/audience", "Audience & Insights", Users],
  ["/customers", "Customer Hub", MessagesSquare],
] as const;
function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Art({
  kind = "blanket",
  className = "",
}: {
  kind?: string;
  className?: string;
}) {
  if (!kind)
    return (
      <div className={"offering-no-photo " + className}>
        <Leaf size={28} />
        <span>No product photo</span>
      </div>
    );
  return (
    <div
      className={`art art-${kind} ${className}`}
      role="img"
      aria-label={
        kind === "tote"
          ? "Illustration of a woven tote bag"
          : kind === "table"
            ? "Illustration of woven placemats"
            : "Illustration of a patterned woven blanket"
      }
    >
      <div className="sun" />
      <div className="woven" />
      <div className="art-shadow" />
      <span>HABI / HANDWOVEN STORIES</span>
    </div>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Leaf size={26} />
      <p>{children}</p>
    </div>
  );
}
function Header({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
type Props = {
  showDeveloperSetup?: boolean;
  s: State;
  refresh: () => Promise<void>;
  run: (fn: () => Promise<unknown>, success?: string) => Promise<void>;
  busy: boolean;
};
export default function App() {
  const [config, setConfig] = useState<Config>();
  const [s, setState] = useState<State>();
  const [signed, setSigned] = useState(false);
  const [identity, setIdentity] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState("");
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const publicPage = location.pathname.startsWith("/s/");
  async function refresh() {
    setState(await api<State>("/owner/state"));
  }
  async function run(
    fn: () => Promise<unknown>,
    success = "Saved successfully",
  ) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      setNotice(success);
    } catch (e) {
      await refresh().catch(() => {});
      setNotice(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let off: (() => void) | undefined;
    let active = true;
    api<Config>("/config")
      .then((c) => {
        if (active) {
          setConfig(c);
          off = configureAuth(c, (value, id) => {
            setSigned(value);
            setIdentity(id || "");
            setState(undefined);
            setFailed("");
          });
        }
      })
      .catch((e) => setFailed(e.message));
    return () => {
      active = false;
      off?.();
    };
  }, []);
  useEffect(() => {
    if (!signed || publicPage) return;
    refresh().catch((e) => setFailed(e.message));
    const timer = setInterval(() => refresh().catch(() => {}), 15000);
    return () => clearInterval(timer);
  }, [signed, publicPage, identity]);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 6500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  if (publicPage)
    return (
      <PublicStore key={location.pathname.split("/")[2]} config={config} />
    );
  if (failed)
    return (
      <div className="loading">
        <h1>We couldn’t open the workspace.</h1>
        <p>{failed}</p>
        <button onClick={() => window.location.reload()}>Try again</button>
      </div>
    );
  if (!config)
    return (
      <div className="loading">
        <Leaf />
        <p>Opening your studio…</p>
      </div>
    );
  if (!signed || location.pathname === "/login")
    return <LoginPage config={config} />;
  if (!s)
    return (
      <div className="loading">
        <Leaf />
        <p>Loading your brand workspace…</p>
      </div>
    );
  if (s.storeSetupComplete === false && location.pathname !== "/settings")
    return <Navigate to="/settings" replace />;
  const props = { s, refresh, run, busy, showDeveloperSetup: config.showDeveloperSetup };
  const storePath = "/s/" + (s.workspaceId || "habi-home");
  const initial = (s.account?.name || s.brand.founder || "Creator")
    .slice(0, 1)
    .toUpperCase();
  return (
    <div className="app">
      <button
        className="mobile-menu icon-button"
        aria-label="Open navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={"sidebar " + (open ? "is-open" : "")}>
        <Link className="wordmark" to="/dashboard">
          <span className="logo">
            <Leaf size={23} />
          </span>
          Asenso<span className="wordmark-light"> One</span>
          <small>STUDIO</small>
        </Link>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <div className="workspace">
          <span className="avatar">{initial}</span>
          <div>
            <strong>{s.brand.name}</strong>
            <small>Independent creator</small>
          </div>
          <span className="workspace-dot" />
        </div>
        <nav>
          {nav
            .filter(([to]) => to !== "/settings" || !s.storeSetupComplete)
            .map(([to, label, Icon]) => (
              <NavLink key={to} to={to}>
                <Icon size={19} />
                {label}
                {to === "/customers" &&
                  s.orders.some((o) => o.status === "pending") && (
                    <span className="nav-count">
                      {s.orders.filter((o) => o.status === "pending").length}
                    </span>
                  )}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-label">A LITTLE HELP, A LOT OF POSSIBILITY</div>
          <p>
            Your brand. Your rhythm.
            <br />A studio that grows with you.
          </p>
          <Link to={storePath} className="store-link">
            Visit your storefront <ArrowUpRight size={16} />
          </Link>
          <span className="sidebar-foot">ASENSO ONE · BUILDER CUP 2026</span>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {location.pathname === "/usage"
                ? "AI usage & balance"
                : nav.find(([p]) => p === location.pathname)?.[1] || "Overview"}
            </strong>
          </div>
          <div className="topbar-right">
            <UsageIndicator key={identity} />
            <span className="mode-pill">
              <span /> {s.account ? "Personal workspace" : "Demo workspace"}
            </span>
            <AccountMenu
              initial={initial}
              name={s.account?.name || s.brand.founder}
              email={s.account?.email}
              onSignOut={
                identity && identity !== "demo"
                  ? async () => {
                      setState(undefined);
                      await logout();
                      navigate("/login", { replace: true });
                    }
                  : undefined
              }
            />
          </div>
        </header>
        <div className="integration-strip">
          {config.aiConfigured
            ? "Gemini connected"
            : "Sample AI · Gemini not configured"}{" "}
          <span>·</span>{" "}
          {(s.sheetConnected ?? config.sheetsConfigured)
            ? "Google Sheets connected"
            : "Sample inventory"}{" "}
          {config.showDeveloperSetup && <><span>·</span> {config.persistence}</>}
        </div>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard {...props} />} />
            <Route path="/dashboard" element={<Dashboard {...props} />} />
            <Route
              path="/brand"
              element={<Navigate to="/settings" replace />}
            />
            <Route path="/settings" element={<StoreSettings {...props} />} />
            <Route path="/usage" element={<UsagePanel />} />
            <Route path="/content" element={<ContentStudio {...props} />} />
            <Route path="/library" element={<ContentLibrary s={s} />} />
            <Route path="/calendar" element={<Calendar {...props} />} />
            <Route path="/audience" element={<Audience {...props} />} />
            <Route path="/customers" element={<Customers {...props} />} />
            <Route
              path="*"
              element={
                <Empty>
                  Page not found.{" "}
                  <Link to="/dashboard">Back to your workspace</Link>
                </Empty>
              }
            />
          </Routes>
        </main>
        <footer className="footer">
          Made for a business of one. Built for everything you can become.
          <span>GOOGLE CLOUD AI BUILDER CUP</span>
        </footer>
      </div>
      {notice && (
        <div
          className={"toast " + (notice.startsWith("Error") ? "error" : "")}
          role="status"
        >
          <CheckCircle2 size={18} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Dashboard({ s }: Props) {
  const scheduled = s.content.filter((c) => c.status === "scheduled");
  return (
    <>
      <Header
        eyebrow="A LITTLE FOCUS. A LOT OF POSSIBILITY."
        title="Your brand, in motion."
        description="Make room for the work you love. Let’s move your next idea forward."
        action={
          <Link className="button" to="/content">
            <Plus size={17} /> Create something
          </Link>
        }
      />
      <section className="hero">
        <div className="hero-copy">
          <Badge tone="light">YOUR INDEPENDENT CHAPTER</Badge>
          <h2>
            Small studio.
            <br />
            Big possibilities.
          </h2>
          <p>
            From the story you tell to the people you reach.
            <br />
            Build a brand that feels like you.
          </p>
          <Link to="/settings">
            Shape your brand <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="hero-visual">
          <div className="floating-note">
            <span>MADE WITH INTENTION</span>
            <strong>
              Make yourself
              <br />a little more known.
            </strong>
            <span>HABI HOME / BRAND NOTES</span>
          </div>
          <div className="hero-circle" />
          <div className="hero-leaf leaf-one" />
          <div className="hero-leaf leaf-two" />
        </div>
      </section>
      <div className="stats">
        {[
          [
            Palette,
            "Brand foundation",
            s.brand.guidelines ? "Ready to grow" : "Your story starts here",
            s.brand.guidelines
              ? "Guidelines saved"
              : "Create your brand guidelines",
          ],
          [
            FileText,
            "Ideas in the making",
            String(s.content.length),
            "Content pieces in your library",
          ],
          [
            CalendarDays,
            "On the horizon",
            String(scheduled.length),
            "Posts planned, at your pace",
          ],
          [
            MessagesSquare,
            "New connections",
            String(s.orders.filter((o) => o.status === "pending").length),
            "Orders awaiting your review",
          ],
        ].map(([Icon, label, value, note]: any) => (
          <div className="stat" key={label}>
            <div className="stat-label">
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">ONE STEP AT A TIME</div>
              <h2>Your next good move</h2>
            </div>
            <span className="step-circle">
              0
              {[s.brand.guidelines, s.content.length, scheduled.length].filter(
                Boolean,
              ).length + 1}
            </span>
          </div>
          {[
            [
              "Give your brand a clear voice",
              "Shape the story, values, and personality behind your work.",
              "/settings",
              !!s.brand.guidelines,
            ],
            [
              "Turn an idea into a story",
              "Create your first on-brand piece of content.",
              "/content",
              s.content.length > 0,
            ],
            [
              "Make space for consistency",
              "Choose a day for your next post.",
              "/calendar",
              scheduled.length > 0,
            ],
          ].map(([title, desc, to, done]) => (
            <Link className="next-step" to={String(to)} key={String(title)}>
              <span className={"check-dot " + (done ? "done" : "")}>
                {done ? <Check size={15} /> : <ArrowUpRight size={16} />}
              </span>
              <div>
                <strong>{title}</strong>
                <small>{desc}</small>
              </div>
              <ChevronRight size={17} />
            </Link>
          ))}
        </section>
        <section className="inspiration">
          <div className="eyebrow">A NOTE FOR THE MAKER</div>
          <div className="quote-mark">“</div>
          <h2>
            You don’t need to
            <br />
            be everywhere.
            <br />
            <em>
              Just be yourself,
              <br />
              consistently.
            </em>
          </h2>
          <span className="inspiration-bottom">
            <Leaf size={17} /> A little reminder from your studio
          </span>
        </section>
      </div>
      <section className="panel recent">
        <div className="section-heading">
          <div>
            <div className="eyebrow">FRESH FROM YOUR STUDIO</div>
            <h2>Ideas taking shape</h2>
          </div>
          <Link className="text-link" to="/library">
            View all content <ArrowUpRight size={16} />
          </Link>
        </div>
        {s.content.length ? (
          <div className="content-mini-grid">
            {s.content.slice(0, 3).map((c) => (
              <Link
                to={"/content?edit=" + encodeURIComponent(c.id)}
                className="mini-content"
                key={c.id}
              >
                <Art kind="blanket" />
                <div>
                  <Badge>{c.status}</Badge>
                  <h3>{c.title}</h3>
                  <p>{c.body.slice(0, 95)}…</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty>
            Your next story belongs here. Start with a little inspiration in
            Content Studio.
          </Empty>
        )}
      </section>
    </>
  );
}
function StoreSettings({ s, run, busy }: Props) {
  const navigate = useNavigate();
  const [firstSetup] = useState(!s.storeSetupComplete);
  useEffect(() => {
    if (firstSetup && s.storeSetupComplete)
      navigate("/dashboard", { replace: true });
  }, [firstSetup, s.storeSetupComplete, navigate]);
  const [settingsTab, setSettingsTab] = useState("identity");
  const [b, setB] = useState<Brand>(s.brand);
  const [heroPhotos, setHeroPhotos] = useState<MediaAsset[]>([]);
  const [heroPhotoError, setHeroPhotoError] = useState("");
  const [heroLoading, setHeroLoading] = useState(true);
  const [libraryRevision, setLibraryRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setHeroLoading(true);
    setHeroPhotoError("");
    api<{ assets: MediaAsset[] }>("/owner/media")
      .then(({ assets }) => { if (active) setHeroPhotos(assets.filter((a) => a.kind !== "video")); })
      .catch((e) => { if (active) setHeroPhotoError(e.message); })
      .finally(() => { if (active) setHeroLoading(false); });
    return () => { active = false; };
  }, [libraryRevision]);
  const [source, setSource] = useState("");
  const update = (key: keyof Brand, value: string) =>
    setB({ ...b, [key]: value });
  return (
    <>
      <Header
        eyebrow={s.storeSetupComplete ? "YOUR STORE" : "FIRST-TIME SETUP"}
        title="Store settings"
        description={
          s.storeSetupComplete
            ? "Manage your store identity, brand voice, and guidelines. You can return here from the account menu."
            : "Start with your store name and identity. These settings guide your content and customer experience."
        }
        action={
          <button
            hidden={settingsTab !== "identity"}
            disabled={busy || !b.name.trim() || b.name.trim() === "Your brand"}
            onClick={() =>
              run(
                () =>
                  api(
                    "/owner/brand",
                    { ...b, completeSetup: !s.storeSetupComplete },
                    "PATCH",
                  ),
                s.storeSetupComplete
                  ? "Store settings saved"
                  : "Store setup complete. Your workspace is ready.",
              )
            }
          >
            <Check size={16} />{" "}
            {s.storeSetupComplete ? "Save settings" : "Finish setup"}
          </button>
        }
      />
      {!s.storeSetupComplete && (
        <div className="store-setup-note">
          <strong>Welcome to your studio.</strong>
          <p>
            Enter your store name, personalize the details below, then choose
            Finish setup. Afterward, Store settings will be available from your
            account menu in the top-right corner.
          </p>
        </div>
      )}
      <div className="tabs" aria-label="Store settings sections">
        {[
          ["identity", "Store identity"],
          ["knowledge", "Brand brain"],
          ["usage", "AI usage & balance"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={settingsTab === id ? "active" : ""}
            onClick={() => setSettingsTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {settingsTab === "knowledge" && <BrandBrain s={s} />}
      {settingsTab === "usage" && <UsagePanel />}
      <div className="two-columns" hidden={settingsTab !== "identity"}>
        <section className="panel">
          <div className="section-heading">
            <h2>Your store identity</h2>
            <Badge>01 / IDENTITY</Badge>
          </div>
          <div className="form-grid">
            <Field label="Store name">
              <input
                value={b.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>
            <Field label="Founder / creator">
              <input
                value={b.founder}
                onChange={(e) => update("founder", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Your tagline">
            <input
              value={b.tagline}
              onChange={(e) => update("tagline", e.target.value)}
            />
          </Field>
          <Field label="The story behind your work">
            <textarea
              rows={4}
              value={b.story}
              onChange={(e) => update("story", e.target.value)}
            />
          </Field>
          <Field label="Mission & values">
            <textarea
              rows={3}
              value={b.mission}
              onChange={(e) => update("mission", e.target.value)}
            />
          </Field>
          <Field label="Your promise to your audience">
            <textarea
              rows={3}
              value={b.promise}
              onChange={(e) => update("promise", e.target.value)}
            />
          </Field>
          <Field label="Brand voice">
            <textarea
              rows={3}
              value={b.voice}
              onChange={(e) => update("voice", e.target.value)}
            />
          </Field>
          <Field label="Brand accent color">
            <input
              type="color"
              value={b.color}
              onChange={(e) => update("color", e.target.value)}
            />
          </Field>
        </section>
        <div>
          <div
            className="brand-preview"
            style={{ "--brand-color": b.color } as any}
          >
            <span>YOUR BRAND, AT A GLANCE</span>
            <h2>{b.name}</h2>
            <p>{b.tagline}</p>
            <div className="brand-rule" />
            <small>A story by {b.founder}</small>
          </div>
          <section className="panel storefront-hero-settings">
            <h2>Storefront hero photo</h2>
            <p className="caption-note">Choose the large photo on your storefront home page. This is separate from product photos and will be publicly visible after you save settings.</p>
            {heroLoading ? <p role="status">Loading photo library...</p> : heroPhotoError ? <p role="alert">{heroPhotoError}</p> : (
              <AssetPicker label="Hero photo" value={b.heroAssetId || ""} assets={heroPhotos} onChange={(id) => update("heroAssetId", id)} allowNone emptyLabel="Use first product photo" disabled={busy} />
            )}
            <button type="button" className="secondary small-button" disabled={busy || heroLoading} onClick={() => setLibraryRevision((value) => value + 1)}>Reload library</button>
            <Field label="Hero image display">
              <select value={b.heroImageFit || "cover"} onChange={(e) => update("heroImageFit", e.target.value)} disabled={busy}>
                <option value="cover">Fill frame (may crop image)</option>
                <option value="contain">Show full image (preserve text and edges)</option>
              </select>
            </Field>
            <p className="caption-note">Choose Show full image for creatives with text. With no custom photo selected, the first product photo is used. Click Save settings to apply.</p>
            <div className="storefront-hero-setting-preview">
              <ProductPhoto product={b.heroAssetId ? { id: "hero", name: `${b.name} storefront hero`, photoAssetId: b.heroAssetId } : s.products[0] || { id: "hero", name: b.name }} fit={b.heroImageFit || "cover"} fallback={<Art kind={s.products[0]?.image || ""} />} />
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>Find your direction</h2>
              <Sparkles size={19} />
            </div>
            <p className="muted">
              Turn your story into a practical set of brand guidelines. You can
              edit every word.
            </p>
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("/owner/brand", b, "PATCH");
                  const r = await api("/owner/generate", { kind: "brand" });
                  setB({ ...b, guidelines: r.text });
                  setSource(r.source);
                }, "Guidelines generated — review and save your settings")
              }
            >
              <Sparkles size={16} />
              {busy ? "Working…" : "Generate brand guidelines"}
            </button>
            {source && <p className="source">{source}</p>}
            <Field label="Editable brand guidelines">
              <textarea
                rows={14}
                value={b.guidelines}
                placeholder="Your guidelines will appear here…"
                onChange={(e) => update("guidelines", e.target.value)}
              />
            </Field>
          </section>
        </div>
      </div>
    </>
  );
}
function ContentStudio({ s, run, busy, showDeveloperSetup }: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get("edit") || "";
  const assetId = params.get("asset") || "";
  const [studioTab, setStudioTab] = useState<"writing" | "visuals">("writing");
  const [mediaAssetId, setMediaAssetId] = useState("");
  const [topic, setTopic] = useState("Introduce the maker behind the brand");
  const [audienceId, setAudience] = useState(s.audiences[0]?.id || "");
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("A story worth sharing");
  const [direction, setDirection] = useState(
    "Natural light, tactile detail, a quiet corner of home.",
  );
  const [source, setSource] = useState("");
  const [editing, setEditing] = useState("");
  useEffect(() => {
    setEditing("");
    setTitle("A story worth sharing");
    setBody("");
    setDirection("Natural light, tactile detail, a quiet corner of home.");
    setAudience(s.audiences[0]?.id || "");
    setMediaAssetId("");
    setSource("");
    if (editId) {
      const post = s.content.find((c) => c.id === editId);
      if (post) {
        setEditing(post.id);
        setTitle(post.title);
        setBody(post.body);
        setDirection(post.direction);
        setAudience(post.audienceId);
        setMediaAssetId(post.mediaAssetId || "");
        setStudioTab("writing");
        setSource("Editing saved content");
      } else setSource("This saved post could not be found.");
    }
  }, [editId]);
  useEffect(() => {
    if (!assetId) return;
    let active = true;
    api<{ assets: { id: string }[] }>("/owner/media")
      .then((data) => {
        if (active) {
          if (data.assets.some((a) => a.id === assetId)) {
            setMediaAssetId(assetId);
            setStudioTab("writing");
          } else setSource("This media asset is not available.");
        }
      })
      .catch((e) => {
        if (active) setSource(e.message);
      });
    return () => {
      active = false;
    };
  }, [assetId]);
  return (
    <>
      <Header
        eyebrow="MAKE SOMETHING MEANINGFUL"
        title="Good stories start here."
        description="A little inspiration, grounded in your brand. Create, refine, and make it yours."
        action={
          <Link className="button secondary" to="/library">
            <Library size={16} /> Open Content Library
          </Link>
        }
      />
      <div className="tabs studio-tabs" aria-label="Content Studio tools">
        <button
          className={studioTab === "writing" ? "active" : ""}
          onClick={() => setStudioTab("writing")}
        >
          <FileText size={16} /> Writing & post preview
        </button>
        <button
          className={studioTab === "visuals" ? "active" : ""}
          onClick={() => setStudioTab("visuals")}
        >
          <Sparkles size={16} /> Product photos & video
        </button>
      </div>
      {studioTab === "visuals" && (
        <MediaStudio
          showDeveloperSetup={showDeveloperSetup}
          onUse={(asset) => {
            setMediaAssetId(asset.id);
            setStudioTab("writing");
          }}
        />
      )}
      <div
        className="two-columns content-columns"
        hidden={studioTab !== "writing"}
      >
        <section className="panel">
          <div className="section-heading">
            <h2>What’s on your mind?</h2>
            <Badge>SOCIAL POST</Badge>
          </div>
          <Field label="What would you like to talk about?">
            <textarea
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </Field>
          <Field label="Who is this for?">
            <select
              value={audienceId}
              onChange={(e) => setAudience(e.target.value)}
            >
              {s.audiences.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="context-note">
            <Sparkles size={17} />
            <span>Guided by your saved brand voice and audience context.</span>
          </div>
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await api("/owner/generate", {
                  kind: "content",
                  topic,
                  audienceId,
                });
                setBody(r.text);
                setSource(r.source);
                if (!editId) setEditing("");
              }, "Three options generated — edit your chosen caption below")
            }
          >
            <Sparkles size={16} />
            {busy ? "Working…" : "Find the words"}
          </button>
          {source && <p className="source">{source}</p>}
          <hr />
          <Field label="Content title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Your editable caption">
            <textarea
              rows={10}
              value={body}
              placeholder="Generate some ideas, then keep and refine your favorite."
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          <Field label="Creative direction">
            <textarea
              rows={2}
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            />
          </Field>
          <div className="actions">
            <button
              disabled={busy || !body.trim()}
              onClick={() =>
                run(async () => {
                  const existing = s.content.find((c) => c.id === editing);
                  const payload = {
                    title,
                    body,
                    direction,
                    audienceId,
                    date: existing?.date || "",
                    time: existing?.time || "",
                    agenda: existing?.agenda || "",
                    status: existing?.status || "draft",
                    mediaAssetId,
                  };
                  await api(
                    editing ? `/owner/content/${editing}` : "/owner/content",
                    payload,
                    editing ? "PATCH" : "POST",
                  );
                  navigate("/library");
                }, "Post saved to Content Library")
              }
            >
              {editing ? "Update post" : "Save draft"} <Check size={16} />
            </button>
            <button
              className="secondary"
              disabled={!body}
              onClick={() =>
                run(() => navigator.clipboard.writeText(body), "Caption copied")
              }
            >
              <Copy size={16} /> Copy
            </button>
          </div>
        </section>
        <div>
          <div className="preview-label">
            A LITTLE PREVIEW <span>BRANDED LAYOUT</span>
          </div>
          <div className="post-preview">
            <div className="post-profile">
              <span className="avatar">H</span>
              <div>
                <strong>{s.brand.name}</strong>
                <small>Sponsored by a little creativity</small>
              </div>
              <span>•••</span>
            </div>
            <div className="post-art">
              {mediaAssetId ? (
                <MediaView
                  assetId={mediaAssetId}
                  className="post-generated-asset"
                />
              ) : (
                <Art />
              )}
              <div
                className="post-art-copy"
                hidden={Boolean(mediaAssetId)}
                style={{
                  background: `linear-gradient(0deg, ${s.brand.color}ee, transparent)`,
                }}
              >
                <span>{s.brand.name.toUpperCase()}</span>
                <h2>{title}</h2>
                <small>{s.brand.tagline}</small>
              </div>
            </div>
            <div className="post-caption">
              <strong>{s.brand.name}</strong>
              <p>
                {body
                  ? body.slice(0, 550)
                  : "Your next story is waiting to be told. Generate a caption to see it come to life here."}
              </p>
            </div>
          </div>
          <p className="caption-note">
            {mediaAssetId
              ? "Your selected photo or video is attached to this draft."
              : "Layout illustration · supplied sample artwork."}{" "}
            No automatic publishing.
          </p>
          {mediaAssetId && (
            <button
              className="secondary small-button"
              onClick={() => setMediaAssetId("")}
            >
              Remove attached visual
            </button>
          )}
        </div>
      </div>
    </>
  );
}
function Audience({ s, run, busy }: Props) {
  const [result, setResult] = useState(s.insights);
  const [source, setSource] = useState("");
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await run(async () => {
      await api("/owner/audiences", Object.fromEntries(f));
      form.reset();
    }, "Audience saved");
  }
  return (
    <>
      <Header
        eyebrow="PEOPLE, BEFORE NUMBERS"
        title="Know who you’re creating for."
        description="Make your work more relevant by understanding the people on the other side."
      />
      <div className="two-columns">
        <div className="audience-list">
          {s.audiences.map((a, i) => (
            <section className="panel audience-card" key={a.id}>
              <span className="audience-number">0{i + 1}</span>
              <h2>{a.name}</h2>
              <p>{a.description}</p>
              <div className="eyebrow">WHAT MATTERS TO THEM</div>
              <p className="muted">{a.needs}</p>
              <Badge>OWNER-DEFINED AUDIENCE</Badge>
            </section>
          ))}
          <section className="panel">
            <h2>Meet another audience</h2>
            <form onSubmit={add}>
              <Field label="Audience name">
                <input required name="name" maxLength={100} />
              </Field>
              <Field label="Who are they?">
                <textarea name="description" rows={2} />
              </Field>
              <Field label="What do they need?">
                <textarea name="needs" rows={2} />
              </Field>
              <button disabled={busy}>
                <Plus size={16} /> Add audience
              </button>
            </form>
          </section>
        </div>
        <section className="panel insights-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">A FRESH PERSPECTIVE</div>
              <h2>Find your content pillars.</h2>
            </div>
            <Sparkles />
          </div>
          <p className="muted">
            Explore useful ideas based on your brand and audience.
            Recommendations are suggestions, not measured market research.
          </p>
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await api("/owner/generate", { kind: "insights" });
                setResult(r.text);
                setSource(r.source);
                await api("/owner/insights", { text: r.text }, "PUT");
              }, "Audience suggestions saved")
            }
          >
            <Sparkles size={16} />
            {busy ? "Thinking…" : "Explore ideas"}
          </button>
          {source && <p className="source">{source}</p>}
          {result ? (
            <div className="prose">{result}</div>
          ) : (
            <Empty>A fresh perspective on your next story.</Empty>
          )}
          <hr />
          <div className="eyebrow">ACTUAL WORKSPACE ACTIVITY</div>
          <div className="activity-metrics">
            <span>
              <strong>{s.content.length}</strong>Saved pieces
            </span>
            <span>
              <strong>{s.conversations.length}</strong>Conversations
            </span>
            <span>
              <strong>
                {s.orders.filter((o) => o.status === "confirmed").length}
              </strong>
              Accepted orders
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
function Customers({ s, run, busy, showDeveloperSetup }: Props) {
  const [tab, setTab] = useState("orders");
  const [selected, setSelected] = useState("");
  const [reply, setReply] = useState("");
  const conv =
    s.conversations.find((c) => c.id === selected) || s.conversations[0];
  return (
    <>
      <Header
        eyebrow="KEEP THE CONVERSATION GOING"
        title="Good connections grow here."
        description="A thoughtful reply. A new order. A little more room for the people behind your business."
        action={
          <Link className="button" to={storePathFor(s)}>
            Open storefront <ArrowUpRight size={17} />
          </Link>
        }
      />
      <SheetsConnection s={s} run={run} busy={busy} showDeveloperSetup={showDeveloperSetup} />
      <div className="tabs">
        {[
          ["orders", "Orders"],
          ["chats", "Conversations"],
          ["products", "Offerings"],
        ].map(([id, label]) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "orders" && (
        <section className="panel">
          <div className="section-heading">
            <h2>A little interest, taking shape.</h2>
            <Badge>
              {s.orders.filter((o) => o.status !== "draft").length} ORDERS
            </Badge>
          </div>
          {s.orders.filter((o) => o.status !== "draft").length ? (
            s.orders
              .filter((o) => o.status !== "draft")
              .slice()
              .reverse()
              .map((o) => (
                <div className="order-row" key={o.id}>
                  <div className="order-top">
                    <strong>
                      {o.productName} × {o.quantity}
                    </strong>
                    <Badge
                      tone={
                        o.status === "needs-review"
                          ? "warning"
                          : o.status === "confirmed"
                            ? "green"
                            : ""
                      }
                    >
                      {o.status}
                    </Badge>
                    <strong>{money(o.total)}</strong>
                  </div>
                  <p>
                    {o.name} · {o.phone} · {o.branch} · {o.method}
                    {o.address ? " · " + o.address : ""}
                  </p>
                  <small>
                    #{o.id.slice(0, 8)} · {date(o.createdAt)} · Campaign:{" "}
                    {o.campaignId || "Direct visit"} · Sheet: {o.sheetStatus}
                  </small>
                  {o.error && <p className="error-text">{o.error}</p>}
                  {o.status === "pending" && (
                    <div className="actions">
                      <button
                        disabled={busy}
                        className="small-button"
                        onClick={() =>
                          run(async () => {
                            const r = await api(
                              "/owner/orders/" + o.id,
                              { action: "confirm" },
                              "PATCH",
                            );
                            if (r.status === "needs-review")
                              throw new Error(r.error || "Order needs review");
                          }, "Order accepted; stock adjusted")
                        }
                      >
                        <Check size={15} /> Accept order
                      </button>
                      <button
                        disabled={busy}
                        className="secondary small-button"
                        onClick={() =>
                          run(
                            () =>
                              api(
                                "/owner/orders/" + o.id,
                                { action: "cancel" },
                                "PATCH",
                              ),
                            "Order cancelled",
                          )
                        }
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))
          ) : (
            <Empty>
              New orders will appear here after the customer confirms their
              summary.{" "}
              <Link to={storePathFor(s) + "/chat"}>
                Try the customer experience
              </Link>
            </Empty>
          )}
        </section>
      )}
      {tab === "chats" && (
        <div className="chat-owner-grid">
          <section className="panel conversation-list">
            <h2>Conversations</h2>
            {s.conversations.length ? (
              s.conversations.map((c) => (
                <button
                  className={
                    "conversation-item " + (conv?.id === c.id ? "selected" : "")
                  }
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                >
                  <strong>Visitor {c.id.slice(0, 5)}</strong>
                  <small>
                    {c.messages.at(-1)?.text.slice(0, 75) ||
                      "Order conversation"}
                  </small>
                  <Badge>
                    {c.mode === "ai" ? "AI assistant" : "Human takeover"}
                  </Badge>
                </button>
              ))
            ) : (
              <Empty>No conversations yet.</Empty>
            )}
          </section>
          <section className="panel">
            {conv ? (
              <>
                <div className="section-heading">
                  <h2>Conversation history</h2>
                  <button
                    className="secondary small-button"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          api(
                            "/owner/conversations/" + conv.id,
                            { mode: conv.mode === "ai" ? "human" : "ai" },
                            "PATCH",
                          ),
                        "Conversation mode updated",
                      )
                    }
                  >
                    {conv.mode === "ai" ? "Take over" : "Return to AI"}
                  </button>
                </div>
                <div className="messages owner-messages">
                  {conv.messages.map((m, i) => (
                    <div className={"message " + m.role} key={i}>
                      <small>
                        {m.role === "assistant"
                          ? "Studio assistant"
                          : m.role === "staff"
                            ? "Store owner"
                            : "Customer"}
                      </small>
                      {m.role === "assistant" ? <ChatMessage text={m.text} /> : <p>{m.text}</p>}
                      {m.source && <small>{m.source}</small>}
                    </div>
                  ))}
                </div>
                {conv.mode === "human" && (
                  <form
                    className="chat-input"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(async () => {
                        await api(
                          "/owner/conversations/" + conv.id + "/messages",
                          { text: reply },
                        );
                        setReply("");
                      }, "Reply sent");
                    }}
                  >
                    <input
                      aria-label="Reply to customer"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Reply as the owner…"
                      required
                    />
                    <button disabled={busy}>
                      <Send size={17} />
                      <span className="sr-only">Send reply</span>
                    </button>
                  </form>
                )}
              </>
            ) : (
              <Empty>Select a customer conversation.</Empty>
            )}
          </section>
        </div>
      )}
      {tab === "products" && (
        <Offerings
          s={s}
          run={run}
          busy={busy}
          renderArt={(p) => <Art kind={p.image} />}
        />
      )}
      <p className="caption-note">
        Orders remain pending until you accept them. Stock changes only after
        acceptance. Delivery charges are confirmed separately.
      </p>
    </>
  );
}
function PublicStore({ config }: { config?: Config }) {
  const [store, setStore] = useState<any>();
  const [conversation, setConversation] = useState<Conversation>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orderForm, setOrderForm] = useState(false);
  const [draft, setDraft] = useState<Order>();
  const [submitted, setSubmitted] = useState<Order>();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const legacyChat = location.pathname.endsWith("/chat");
  const isProducts = location.pathname.endsWith("/products") || legacyChat;
  const [chatOpen, setChatOpen] = useState(legacyChat);
  const [orderProduct, setOrderProduct] = useState("");
  useEffect(() => {
    const messages = document.querySelector<HTMLElement>(
      ".store-chat-widget .messages",
    );
    if (messages) messages.scrollTop = messages.scrollHeight;
  }, [chatOpen, conversation?.messages.length]);
  const storePath = location.pathname.split("/").slice(0, 3).join("/");
  const campaignId = params.get("c") || "";
  const suffix = campaignId ? "?c=" + encodeURIComponent(campaignId) : "";
  useEffect(() => {
    if (!isProducts || !location.hash || !store) return;
    let target: string;
    try { target = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!target.startsWith("product-")) return;
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [isProducts, location.hash, store?.products.length]);
  useEffect(() => {
    if (legacyChat) {
      setChatOpen(true);
      navigate(storePath + "/products" + suffix, { replace: true });
    }
  }, [legacyChat, storePath, suffix, navigate]);
  useEffect(() => {
    if (!chatOpen || orderForm) return;
    const timer = setTimeout(
      () =>
        document
          .querySelector<HTMLInputElement>(
            ".store-chat-widget .chat-input input",
          )
          ?.focus(),
      0,
    );
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setChatOpen(false);
        document
          .querySelector<HTMLButtonElement>(".store-chat-launcher")
          ?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", escape);
    };
  }, [chatOpen, orderForm]);
  const refresh = async () => {
    const [st, cv] = await Promise.all([
      api("/public/store"),
      api("/public/conversation"),
    ]);
    setStore(st);
    setConversation(cv.conversation);
    setOrders(cv.orders);
  };
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const t = setInterval(() => refresh().catch(() => {}), 8000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!orderForm) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusTimer = setTimeout(
      () =>
        document
          .querySelector<HTMLElement>(".modal button:not(:disabled)")
          ?.focus(),
      0,
    );
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOrderForm(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".modal button:not(:disabled),.modal input,.modal select,.modal textarea",
        ),
      );
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [orderForm, draft?.id, submitted?.id]);
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!store)
    return (
      <div className="loading">
        <Leaf />
        <p>{error || "Opening the storefront…"}</p>
      </div>
    );
  const latest = submitted
    ? orders.find((o) => o.id === submitted.id) || submitted
    : undefined;
  return (
    <div className="public">
      <header className="public-header">
        <Link className="public-brand" to={storePath + suffix}>
          <Leaf size={23} />
          {store.brand.name}
        </Link>
        <div>
          <Badge>
            {storePath.endsWith("/habi-home")
              ? "SAMPLE BUSINESS"
              : "INDEPENDENT STORE"}
          </Badge>
          <Link className="text-link" to="/dashboard">
            Visit the studio <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <nav className="store-page-nav" aria-label="Storefront pages">
        <NavLink end to={storePath + suffix}>
          Home
        </NavLink>
        <NavLink to={storePath + "/products" + suffix}>Products</NavLink>
      </nav>
      {!isProducts ? (
        <>
          <section className="store-hero">
            <div>
              <div className="eyebrow">A LITTLE MORE PERSONAL</div>
              <h1>{store.brand.tagline || store.brand.name}</h1>
              <p>
                {store.brand.story?.startsWith(
                  "Tell the story behind your work in ",
                )
                  ? "Discover our collection and find something that feels like you."
                  : store.brand.story}
              </p>
              <Link className="button" to={storePath + "/products" + suffix}>
                Explore our products <ArrowRight size={17} />
              </Link>
              <small>A collection by {store.brand.founder}</small>
            </div>
            <ProductPhoto product={store.brand.heroAssetId ? { id: "hero", name: `${store.brand.name} storefront hero`, photoAssetId: store.brand.heroAssetId } : store.products[0] || { id: "hero", name: store.brand.name }} publicView hero={Boolean(store.brand.heroAssetId)} fit={store.brand.heroImageFit || "cover"} fallback={<Art kind={store.products[0]?.image || ""} />} />
          </section>
          <section className="store-note">
            <Leaf size={30} />
            <h2>Find your next favorite.</h2>
            <p>
              {store.brand.promise ||
                "Browse the collection, explore the details, and ask us if you need a hand choosing."}
            </p>
            <Link className="button" to={storePath + "/products" + suffix}>
              View the collection <ArrowRight size={17} />
            </Link>
          </section>
        </>
      ) : (
        <>
          <section className="store-catalog-heading">
            <div className="eyebrow">EXPLORE THE COLLECTION</div>
            <h1>Something for you.</h1>
            <p>
              Browse our products. Ask a question or prepare a request when you
              find your favorite.
            </p>
            <small>
              {store.syncedAt
                ? "Availability as of " + date(store.syncedAt)
                : "Sample inventory - stock is checked before order review"}
            </small>
          </section>
          <div className="product-grid store-products">
            {store.products.map((p: any) => (
              <article className="store-product" key={p.id} id={"product-" + p.id}>
                <ProductPhoto product={p} publicView fallback={<Art kind={p.image} />} />
                <div className="product-title">
                  <h3>{p.name}</h3>
                  <strong>{money(p.price)}</strong>
                </div>
                <p>{p.description}</p>
                <div className="stock-labels">
                  {Object.entries(p.stock).map(([branch, q]) => (
                    <Badge key={branch}>
                      {branch}: {String(q)}
                    </Badge>
                  ))}
                </div>
                <div className="store-product-actions">
                  <button
                    className="secondary small-button"
                    onClick={() => {
                      setOrderProduct(p.id);
                      setText(`I'd like to know more about ${p.name}.`);
                      setChatOpen(true);
                    }}
                  >
                    Ask about this item <MessagesSquare size={15} />
                  </button>
                  <button
                    className="small-button"
                    onClick={() => {
                      setOrderProduct(p.id);
                      setOrderForm(true);
                      setDraft(undefined);
                      setSubmitted(undefined);
                    }}
                  >
                    Request this item <ShoppingBag size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!store.products.length && (
            <div className="empty">
              <Leaf size={25} />
              <p>The collection is being prepared. Check back soon.</p>
            </div>
          )}
          <p className="store-order-note">
            Requests are reviewed by the owner. No payment is taken here;
            delivery fees are confirmed separately.
          </p>
        </>
      )}
      <button
        className="store-chat-launcher"
        aria-expanded={chatOpen}
        aria-controls="store-chat"
        onClick={() => setChatOpen(!chatOpen)}
      >
        <MessagesSquare size={20} />
        <span>{chatOpen ? "Minimize chat" : "Chat with us"}</span>
      </button>
      {chatOpen && (
        <section
          className="chat-panel store-chat-widget"
          id="store-chat"
          role="dialog"
          aria-modal="false"
          aria-labelledby="store-chat-title"
        >
          <div className="chat-panel-heading">
            <span className="avatar">{store.brand.name.slice(0, 1)}</span>
            <div>
              <strong id="store-chat-title">{store.brand.name}</strong>
              <small>
                {conversation?.mode === "human"
                  ? "The owner will reply here"
                  : "Your questions, thoughtfully answered"}
              </small>
            </div>
            <button
              className="icon-button secondary store-chat-close"
              aria-label="Close store chat"
              onClick={() => {
                setChatOpen(false);
                document
                  .querySelector<HTMLButtonElement>(".store-chat-launcher")
                  ?.focus();
              }}
            >
              <X size={17} />
            </button>
          </div>
          <div className="store-chat-toolbar">
            <span>
              {conversation?.mode === "human"
                ? "The store owner is helping"
                : config?.aiConfigured
                  ? "AI-assisted - Gemini"
                  : "Sample AI - Gemini not configured"}
            </span>
            <Link className="secondary small-button" to={storePath + "/products" + suffix}
              onClick={() => setChatOpen(false)}>
              Browse products <ArrowRight size={14} />
            </Link>
            <button
              className="secondary small-button"
              disabled={!store.products.length}
              onClick={() => {
                setOrderForm(true);
                setDraft(undefined);
                setSubmitted(undefined);
              }}
            >
              Prepare an order <ShoppingBag size={14} />
            </button>
          </div>
          <div className="messages">
            <div className="message assistant">
              <small>STUDIO ASSISTANT</small>
              <p>
                Hello, welcome to {store.brand.name}. What would you like to
                know about our collection?
              </p>
            </div>
            {conversation?.messages.map((m, i) => (
              <div key={i} className={"message " + m.role}>
                <small>
                  {m.role === "customer"
                    ? "YOU"
                    : m.role === "staff"
                      ? "STORE OWNER"
                      : "STUDIO ASSISTANT"}
                </small>
                {m.role === "assistant" ? <ChatMessage text={m.text}
                  allowedLinks={store.products.map((p: any) => `${storePath}/products#product-${encodeURIComponent(p.id)}`)}
                  onNavigate={() => setChatOpen(false)}
                /> : <p>{m.text}</p>}
                {m.source && <small>{m.source}</small>}
              </div>
            ))}
            {!conversation?.messages.length && (
              <div className="quick-replies">
                {[
                  store.products[0]
                    ? `Tell me about ${store.products[0].name}`
                    : "What can I find here?",
                  "What are the pickup and delivery options?",
                ].map((t) => (
                  <button
                    className="secondary small-button"
                    key={t}
                    disabled={busy}
                    onClick={() =>
                      act(() => api("/public/chat", { text: t, campaignId }))
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            {busy && <p className="muted">Just a moment…</p>}
          </div>
          {error && (
            <p role="alert" className="store-chat-error">
              {error}
            </p>
          )}
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              act(async () => {
                await api("/public/chat", { text, campaignId });
                setText("");
              });
            }}
          >
            <input
              aria-label="Message the store"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              placeholder="Ask about something you love…"
              required
            />
            <button disabled={busy}>
              <Send size={18} />
              <span className="sr-only">Send message</span>
            </button>
          </form>
        </section>
      )}
      {error && !chatOpen && !orderForm && (
        <div className="public-error" role="alert">
          {error}
        </div>
      )}
      {orderForm && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-title"
          >
            <div className="section-heading">
              <h2 id="order-title">
                {latest
                  ? "Your order request"
                  : draft
                    ? "One last look."
                    : "A little something for you."}
              </h2>
              <button
                className="icon-button secondary"
                aria-label="Close order form"
                onClick={() => setOrderForm(false)}
              >
                <X size={18} />
              </button>
            </div>
            {latest ? (
              <>
                <CheckCircle2 className="success-icon" size={40} />
                <h3>
                  {latest.status === "confirmed"
                    ? "The owner accepted your order."
                    : latest.status === "needs-review"
                      ? "Your request needs owner review."
                      : latest.status === "cancelled"
                        ? "Your request was cancelled."
                        : "Your request is with the owner."}
                </h3>
                <p>Reference #{latest.id.slice(0, 8)}</p>
                <p>
                  {latest.status === "pending"
                    ? "No payment has been taken. The owner will check your request and coordinate fulfilment."
                    : ""}
                </p>
                <Badge>{latest.status}</Badge>
                <button
                  className="secondary"
                  onClick={() => setOrderForm(false)}
                >
                  Continue exploring
                </button>
              </>
            ) : draft ? (
              <>
                <div className="order-summary">
                  <strong>
                    {draft.productName} × {draft.quantity}
                  </strong>
                  <p>
                    {draft.name}
                    <br />
                    {draft.phone}
                    <br />
                    {draft.branch} · {draft.method}
                    <br />
                    {draft.address}
                  </p>
                  <hr />
                  <div className="product-title">
                    <strong>Item total</strong>
                    <strong>{money(draft.total)}</strong>
                  </div>
                  <small>
                    Delivery fees, if applicable, are confirmed separately.
                    Submitting requests owner review; it does not guarantee
                    acceptance.
                  </small>
                </div>
                <div className="actions">
                  <button
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        const o = await api(
                          "/public/orders/" + draft.id + "/submit",
                          { confirm: true },
                        );
                        setSubmitted(o);
                        setDraft(undefined);
                      })
                    }
                  >
                    Confirm & submit request <Check size={16} />
                  </button>
                  <button
                    disabled={busy}
                    className="secondary"
                    onClick={() => setDraft(undefined)}
                  >
                    Edit details
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  act(async () =>
                    setDraft(
                      await api("/public/orders/draft", {
                        ...Object.fromEntries(f),
                        quantity: Number(f.get("quantity")),
                        campaignId,
                      }),
                    ),
                  );
                }}
              >
                <div className="form-grid">
                  <Field label="Your name">
                    <input
                      autoFocus
                      name="name"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </Field>
                  <Field label="Mobile number">
                    <input
                      name="phone"
                      type="tel"
                      required
                      placeholder="+63…"
                    />
                  </Field>
                </div>
                <Field label="Choose your piece">
                  <select
                    name="productId"
                    value={orderProduct || store.products[0]?.id || ""}
                    onChange={(e) => setOrderProduct(e.target.value)}
                  >
                    {store.products.map((p: any) => (
                      <option value={p.id} key={p.id}>
                        {p.name} · {money(p.price)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="form-grid">
                  <Field label="Quantity">
                    <input
                      name="quantity"
                      type="number"
                      defaultValue={1}
                      min={1}
                      max={100}
                      required
                    />
                  </Field>
                  <Field label="Branch">
                    <select name="branch" key={orderProduct}>
                      {Object.keys(
                        (
                          store.products.find(
                            (p: any) => p.id === orderProduct,
                          ) || store.products[0]
                        )?.stock || {},
                      ).map((branch) => (
                        <option key={branch}>{branch}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="How would you like to receive it?">
                  <select name="method">
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Request delivery</option>
                  </select>
                </Field>
                <Field label="Delivery address (required for delivery)">
                  <textarea name="address" rows={2} />
                </Field>
                <button disabled={busy}>
                  Review my request <ArrowRight size={16} />
                </button>
              </form>
            )}
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
      <footer className="public-footer">
        <span>
          {store.brand.name}
          {storePath.endsWith("/habi-home")
            ? " · A fictional business for demonstration"
            : " · Your independent store"}
        </span>
        <span>Powered by Asenso One Studio</span>
      </footer>
    </div>
  );
}
