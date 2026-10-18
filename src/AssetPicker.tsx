import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Image as ImageIcon, Check } from "lucide-react";
import { apiBlob, peekApiMedia } from "./api";
import { retainMediaUrl } from "./media-cache";
import type { MediaAsset } from "./types";
function Thumbnail({ id }: { id: string }) {
  const endpoint = "/owner/media/" + id + "/thumbnail";
  const [url, setUrl] = useState(() => peekApiMedia(endpoint)?.url || "");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let release: (() => void) | undefined;
    const cached = peekApiMedia(endpoint);
    setUrl(cached?.url || "");
    setError("");
    const load = () => {
      apiBlob(endpoint)
        .then((blob) => {
          if (active) {
            const lease = retainMediaUrl(blob);
            release = lease.release;
            setUrl(lease.url);
          }
        })
        .catch(() => {
          if (active) setError("Preview unavailable");
        });
    };
    // Cached images are already decoded; delay only new hover requests.
    const timer = cached ? undefined : setTimeout(load, 140);
    if (cached) {
      const lease = retainMediaUrl(cached.blob);
      release = lease.release;
    }
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      release?.();
    };
  }, [endpoint]);
  return url ? (
    <img src={url} alt="Reference preview" />
  ) : (
    <span role="status">{error || "Loading preview…"}</span>
  );
}
export default function AssetPicker({
  label,
  value,
  assets,
  onChange,
  emptyLabel = "Choose a photo",
  allowNone = false,
  disabled = false,
}: {
  label: string;
  value: string;
  assets: MediaAsset[];
  onChange: (id: string) => void;
  emptyLabel?: string;
  allowNone?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const options = [
    ...(allowNone ? [{ id: "", name: emptyLabel }] : []),
    ...assets,
  ];
  const selected = assets.find((a) => a.id === value);
  const previewId = open ? (hover ?? focus ?? value) : value;
  const preview = assets.find((a) => a.id === previewId);
  function close(restore = false) {
    setOpen(false);
    setHover(null);
    setFocus(null);
    if (restore) trigger.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", outside);
    const target =
      list.current?.querySelector<HTMLButtonElement>(
        '[data-selected="true"]',
      ) || list.current?.querySelector<HTMLButtonElement>("button");
    target?.focus();
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="asset-picker"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          close();
      }}
    >
      <div className="asset-picker-label" id={id + "-label"}>
        {label}
      </div>
      <div className="asset-picker-layout">
        <div className="asset-picker-main">
          <button
            ref={trigger}
            type="button"
            className="asset-picker-trigger"
            disabled={disabled}
            aria-labelledby={id + "-label " + id + "-value"}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={id + "-list"}
            onClick={() => (open ? close() : setOpen(true))}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                if (open)
                  (
                    list.current?.querySelector<HTMLButtonElement>(
                      '[data-selected="true"]',
                    ) ||
                    list.current?.querySelector<HTMLButtonElement>("button")
                  )?.focus();
                else setOpen(true);
              }
              if (event.key === "Escape") close(true);
            }}
          >
            <span id={id + "-value"}>{selected?.name || emptyLabel}</span>
            <ChevronDown size={16} />
          </button>
          {selected && (
            <small className="asset-picker-selection-meta">
              {selected.kind === "reference"
                ? "Uploaded photo"
                : "Generated image"}{" "}
              · {new Date(selected.createdAt).toLocaleString()}
            </small>
          )}
          {open && (
            <div
              ref={list}
              className="asset-picker-options"
              role="listbox"
              id={id + "-list"}
              aria-labelledby={id + "-label"}
              onMouseLeave={() => setHover(null)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  close(true);
                  return;
                }
                if (
                  !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
                )
                  return;
                event.preventDefault();
                const buttons = Array.from(
                  list.current?.querySelectorAll<HTMLButtonElement>(
                    '[role="option"]',
                  ) || [],
                );
                const index = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? buttons.length - 1
                      : (index +
                          (event.key === "ArrowDown" ? 1 : -1) +
                          buttons.length) %
                        buttons.length;
                buttons[next]?.focus();
              }}
            >
              {options.map((option) => {
                const asset = assets.find((a) => a.id === option.id);
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === option.id}
                    data-selected={value === option.id}
                    tabIndex={focus === option.id ? 0 : -1}
                    key={option.id}
                    className={
                      "asset-picker-option " +
                      (value === option.id ? "selected" : "")
                    }
                    onMouseEnter={() => setHover(option.id)}
                    onFocus={() => setFocus(option.id)}
                    onClick={() => {
                      onChange(option.id);
                      close(true);
                    }}
                  >
                    <span>
                      <strong>{option.name}</strong>
                      {asset && (
                        <small>
                          {asset.kind === "reference"
                            ? "Uploaded"
                            : "Generated"}{" "}
                          · {new Date(asset.createdAt).toLocaleString()}
                        </small>
                      )}
                    </span>
                    {value === option.id && <Check size={15} />}
                  </button>
                );
              })}
              {!options.length && <p>No saved photos yet.</p>}
            </div>
          )}
          <p className="asset-picker-hint">
            Hover or focus to preview. Click to select.
          </p>
        </div>
        <figure className="asset-picker-preview" aria-live="polite">
          {preview ? (
            <Thumbnail key={preview.id} id={preview.id} />
          ) : (
            <div className="asset-picker-placeholder">
              <ImageIcon size={24} />
              <span>
                {allowNone && !previewId
                  ? "No style template"
                  : "Photo preview"}
              </span>
            </div>
          )}
        </figure>
      </div>
    </div>
  );
}
