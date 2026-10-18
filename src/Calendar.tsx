import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
} from "lucide-react";
import { api } from "./api";
import type { State, ContentItem } from "./types";

type Props = {
  s: State;
  busy: boolean;
  run: (fn: () => Promise<unknown>, success?: string) => Promise<void>;
};
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ordered = (a: ContentItem, b: ContentItem) =>
  (a.time || "99:99").localeCompare(b.time || "99:99") ||
  a.createdAt.localeCompare(b.createdAt);
export default function Calendar({ s, busy, run }: Props) {
  const [params] = useSearchParams();
  const today = new Date();
  const [month, setMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState(dayKey(today));
  const [item, setItem] = useState(params.get("content") || "");
  const [agenda, setAgenda] = useState("");
  const [time, setTime] = useState("09:00");
  const [editing, setEditing] = useState("");
  const scheduled = s.content.filter((c) => c.status === "scheduled");
  const daily = scheduled.filter((c) => c.date === selected).sort(ordered);
  const source = s.content.find((c) => c.id === item);
  const start = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  function reset() {
    setEditing("");
    setItem("");
    setAgenda("");
    setTime("09:00");
  }
  function select(day: string) {
    setSelected(day);
    reset();
  }
  function edit(post: ContentItem) {
    setEditing(post.id);
    setItem(post.id);
    setSelected(post.date);
    setAgenda(post.agenda || "General");
    setTime(post.time || "09:00");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!source) return;
    await run(
      async () => {
        const plan = {
          date: selected,
          status: "scheduled",
          agenda: agenda.trim(),
          time,
        };
        if (editing || source.status === "draft")
          await api("/owner/content/" + (editing || source.id), plan, "PATCH");
        else await api("/owner/content", { ...source, ...plan });
        reset();
      },
      editing
        ? "Post schedule updated"
        : "Post added to calendar — publishing remains manual",
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR OWN RHYTHM</div>
          <h1>A little consistency goes a long way.</h1>
          <p>
            Plan several posts each day, with a different agenda and time for
            each one.
          </p>
        </div>
      </div>
      <div className="calendar-layout">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>
                {month.toLocaleDateString("en", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <p className="caption-note">
                {
                  scheduled.filter((p) =>
                    p.date.startsWith(dayKey(month).slice(0, 7)),
                  ).length
                }{" "}
                planned posts this month
              </p>
            </div>
            <div className="actions">
              <button
                className="secondary small-button"
                onClick={() => {
                  setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  select(dayKey(today));
                }}
              >
                Today
              </button>
              <button
                className="icon-button secondary"
                aria-label="Previous month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button secondary"
                aria-label="Next month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="calendar-week">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {Array.from({ length: start }, (_, i) => (
              <div className="calendar-blank" key={"blank" + i} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const day = dayKey(
                new Date(month.getFullYear(), month.getMonth(), i + 1),
              );
              const posts = scheduled
                .filter((p) => p.date === day)
                .sort(ordered);
              return (
                <button
                  className={
                    "calendar-day " + (day === selected ? "selected" : "")
                  }
                  key={day}
                  onClick={() => select(day)}
                  aria-pressed={day === selected}
                  aria-label={`${day}, ${posts.length} planned posts`}
                >
                  <span>
                    {i + 1}
                    {posts.length > 0 && (
                      <b className="calendar-count">{posts.length}</b>
                    )}
                  </span>
                  {posts.slice(0, 2).map((p) => (
                    <small
                      key={p.id}
                      title={`${p.time || "Time not set"} · ${p.agenda || "General"} · ${p.title}`}
                    >
                      <b>{p.time || "—"}</b> {p.agenda || p.title}
                    </small>
                  ))}
                  {posts.length > 2 && (
                    <span className="calendar-more">
                      +{posts.length - 2} more
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="caption-note">
            Times are planning times in your local time zone. This calendar does
            not publish to social platforms.
          </p>
        </section>
        <section className="panel calendar-plan-form">
          <div className="eyebrow">MAKE A LITTLE PLAN</div>
          <h2>{editing ? "Edit planned post" : "Choose your moment."}</h2>
          <form onSubmit={save}>
            <label className="field">
              <span>Publication planning date</span>
              <input
                type="date"
                value={selected}
                required
                onChange={(e) => {
                  setSelected(e.target.value);
                  if (e.target.value) {
                    const [y, m] = e.target.value.split("-").map(Number);
                    setMonth(new Date(y, m - 1, 1));
                  }
                }}
              />
            </label>
            <label className="field">
              <span>Planning time</span>
              <input
                type="time"
                value={time}
                required
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Agenda / purpose</span>
              <input
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                maxLength={120}
                required
                list="post-agendas"
                placeholder="e.g. Product launch, brand story, promotion"
              />
            </label>
            <datalist id="post-agendas">
              {[
                "Brand story",
                "Product launch",
                "Educational",
                "Behind the scenes",
                "Promotion",
                "Community",
              ].map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
            <label className="field">
              <span>Saved content</span>
              <select
                value={item}
                required
                disabled={Boolean(editing)}
                onChange={(e) => setItem(e.target.value)}
              >
                <option value="">Choose a draft</option>
                {s.content.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.status === "scheduled" ? " · schedule another copy" : ""}
                  </option>
                ))}
              </select>
            </label>
            {!editing && source?.status === "scheduled" && (
              <p className="caption-note">
                This creates another scheduled copy. The existing post keeps its
                date and agenda.
              </p>
            )}
            {s.content.length === 0 && (
              <p className="caption-note">
                Create and save a post in{" "}
                <Link to="/content">Content Studio</Link> first.
              </p>
            )}
            <div className="actions">
              <button
                disabled={busy || !item || !selected || !agenda.trim() || !time}
              >
                <CalendarDays size={16} />
                {editing ? "Save schedule" : "Add to calendar"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={reset}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
      <section className="panel calendar-agenda-panel">
        <div className="section-heading">
          <div>
            <div className="eyebrow">YOUR DAY AT A GLANCE</div>
            <h2>On {selected}</h2>
            <p className="caption-note">
              {daily.length} planned {daily.length === 1 ? "post" : "posts"} ·
              sorted by time
            </p>
          </div>
          <button
            className="secondary small-button"
            onClick={reset}
            disabled={busy}
          >
            <Plus size={15} /> Plan another post
          </button>
        </div>
        {daily.length === 0 ? (
          <div className="empty">
            <CalendarDays size={25} />
            <p>
              No posts planned for this day. Choose content, an agenda, and a
              time above.
            </p>
          </div>
        ) : (
          <div className="daily-posts">
            {daily.map((post) => (
              <article className="daily-post" key={post.id}>
                <div className="daily-post-time">
                  <Clock size={16} />
                  <strong>{post.time || "Not set"}</strong>
                </div>
                <div className="daily-post-body">
                  <span className="badge">{post.agenda || "General"}</span>
                  <h3>{post.title}</h3>
                  <p>
                    {post.body.slice(0, 180)}
                    {post.body.length > 180 ? "…" : ""}
                  </p>
                  <Link
                    to={`/s/${s.workspaceId || "habi-home"}?c=${post.campaignId}`}
                  >
                    Open campaign storefront <ArrowUpRight size={14} />
                  </Link>
                </div>
                <div className="daily-post-actions">
                  <button
                    className="secondary small-button"
                    disabled={busy}
                    onClick={() => edit(post)}
                  >
                    Edit schedule
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await api(
                          "/owner/content/" + post.id,
                          { date: "", time: "", status: "draft" },
                          "PATCH",
                        );
                        if (editing === post.id) reset();
                      }, "Returned to drafts")
                    }
                  >
                    Return to drafts
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
