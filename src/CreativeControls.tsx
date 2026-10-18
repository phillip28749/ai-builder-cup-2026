import AssetPicker from "./AssetPicker";
import { useState } from "react";
import {
  AD_FORMULAS,
  CREATIVE_DIRECTION_DESCRIPTIONS,
  SHOT_TYPE_DESCRIPTIONS,
  FORMAT_DIMENSIONS,
  SCENE_PRESETS,
  updateCreativeOption,
  type CreativeOptions,
} from "./creative-options";
import type { State, MediaAsset } from "./types";
type Choice = {
  value: string;
  label: string;
  detail?: string;
  swatch?: string;
};
function Choices({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Choice[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="creative-choice-section" role="group" aria-label={label}>
      <h4>{label}</h4>
      <div className="creative-choice-grid">
        {options.map((option) => (
          <button
            type="button"
            className={
              "creative-choice " + (value === option.value ? "selected" : "")
            }
            aria-pressed={value === option.value}
            key={option.value}
            onClick={() => onChange(option.value)}
          >
            {option.swatch && (
              <span
                className="creative-choice-swatch"
                style={{ background: option.swatch }}
              />
            )}
            <span className="creative-choice-label">{option.label}</span>
            {option.detail && <small>{option.detail}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export default function CreativeControls({
  value,
  onChange,
  state,
  assets,
  reference,
  video,
  subject,
  onSubjectChange,
  prompt,
  onPromptChange,
  disabled = false,
}: {
  value: CreativeOptions;
  onChange: (v: CreativeOptions) => void;
  state?: State;
  assets: MediaAsset[];
  reference: string;
  video: boolean;
  subject: string;
  onSubjectChange: (v: string) => void;
  prompt: string;
  onPromptChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<"choices" | "advanced">("choices");
  const set = <K extends keyof CreativeOptions>(
    key: K,
    v: CreativeOptions[K],
  ) => onChange(updateCreativeOption(value, key, v));
  const motion = video
    ? " Slow cinematic camera move and subtle background motion."
    : "";
  const scenes = Object.entries(SCENE_PRESETS).map(([key, text]) => ({
    value: text + motion,
    label: (
      {
        neutral: "Neutral studio",
        dark: "Dark studio",
        lifestyle: "Everyday setting",
        outdoors: "Natural outdoors",
      } as Record<string, string>
    )[key],
  }));
  const chosenScene = scenes.some((option) => option.value === prompt)
    ? prompt
    : "custom";
  const changeTab = (next: "choices" | "advanced") => {
    setTab(next);
  };
  return (
    <fieldset className="creative-controls" disabled={disabled}>
      <legend>Choose your creative</legend>
      <div
        className="tabs creative-config-tabs"
        role="tablist"
        aria-label="Creative configuration"
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const next =
              event.key === "Home"
                ? "choices"
                : event.key === "End"
                  ? "advanced"
                  : tab === "choices"
                    ? "advanced"
                    : "choices";
            setTab(next);
            document.getElementById("creative-tab-" + next)?.focus();
          }
        }}
      >
        {(
          [
            ["choices", "Creative setup"],
            ["advanced", "Advanced config"],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            role="tab"
            id={"creative-tab-" + id}
            aria-selected={tab === id}
            aria-controls={"creative-panel-" + id}
            tabIndex={tab === id ? 0 : -1}
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => changeTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="creative-panel-choices"
        aria-labelledby="creative-tab-choices"
        hidden={tab !== "choices"}
      >
        <p className="caption-note">
          Choose a look, shot, and format. Optional copy and subject details are
          in Advanced config.
        </p>
        {!video && (
          <Choices
            label="Reference use"
            value={value.referenceRole}
            onChange={(v) =>
              onChange({
                ...value,
                referenceRole: v as CreativeOptions["referenceRole"],
                templateAssetId: "",
              })
            }
            options={[
              {
                value: "product",
                label: "Actual product photo",
                detail: "Keep the photographed subject.",
              },
              {
                value: "style",
                label: "Style template only",
                detail: "Use the look; create a new subject.",
              },
            ]}
          />
        )}
        {value.referenceRole === "style" && (
          <p className="caption-note">
            Choose product facts below or describe the new subject in Advanced
            config.
          </p>
        )}
        <Choices
          label="Creative direction"
          value={value.direction}
          onChange={(v) => set("direction", v as CreativeOptions["direction"])}
          options={Object.entries(CREATIVE_DIRECTION_DESCRIPTIONS).map(
            ([key, detail]) => ({
              value: key,
              label: title(key),
              detail,
              swatch: (
                {
                  minimalist: "linear-gradient(135deg,#fff,#dedbd2)",
                  luxe: "linear-gradient(135deg,#1f2525,#8b734f)",
                  playful: "linear-gradient(135deg,#ef9abb,#d2f354)",
                  organic: "linear-gradient(135deg,#b5c09d,#d3a184)",
                } as Record<string, string>
              )[key],
            }),
          )}
        />
        <Choices
          label="Shot type"
          value={value.shot}
          onChange={(v) => set("shot", v as CreativeOptions["shot"])}
          options={Object.entries(SHOT_TYPE_DESCRIPTIONS).map(
            ([key, detail]) => ({
              value: key,
              label: (
                {
                  hero: "Hero shot",
                  lifestyle: "Lifestyle",
                  flatlay: "Flat lay",
                  macro: "Macro / detail",
                  environmental: "Environmental",
                } as Record<string, string>
              )[key],
              detail,
            }),
          )}
        />
        <Choices
          label="Scene"
          value={chosenScene}
          options={[
            ...scenes,
            {
              value: "custom",
              label: "Custom scene",
              detail: "Edit your direction in Advanced config.",
            },
          ]}
          onChange={(v) =>
            v === "custom" ? setTab("advanced") : onPromptChange(v)
          }
        />
        <Choices
          label="Ad formula"
          value={value.formula}
          onChange={(v) => set("formula", v as CreativeOptions["formula"])}
          options={Object.entries(AD_FORMULAS).map(([key, detail]) => ({
            value: key,
            label:
              key === "aida"
                ? "AIDA"
                : key === "pas"
                  ? "Problem / Solution"
                  : "Hook / Benefit / Proof",
            detail,
          }))}
        />
        <Choices
          label="Product facts"
          value={value.productId}
          onChange={(v) => set("productId", v)}
          options={[
            { value: "", label: "Reference photo only" },
            ...(state?.products.map((p) => ({ value: p.id, label: p.name })) ||
              []),
          ]}
        />
        <Choices
          label="Audience"
          value={value.audienceId}
          onChange={(v) => set("audienceId", v)}
          options={[
            { value: "", label: "Brand audience" },
            ...(state?.audiences.map((a) => ({ value: a.id, label: a.name })) ||
              []),
          ]}
        />
        <Choices
          label="Output format"
          value={value.format}
          onChange={(v) => {
            const format = v as CreativeOptions["format"];
            onChange({
              ...value,
              format,
              width: FORMAT_DIMENSIONS[format].width,
              height: FORMAT_DIMENSIONS[format].height,
            });
            if (format === "custom") setTab("advanced");
          }}
          options={Object.entries(FORMAT_DIMENSIONS)
            .filter(
              ([key]) =>
                !video || ["story", "portrait", "landscape"].includes(key),
            )
            .map(([key, f]) => ({ value: key, label: f.label }))}
        />
        <p className="caption-note">
          {video
            ? "Video exports at 720p in the chosen orientation."
            : `Image export: ${value.width} x ${value.height} pixels, fitted without cropping the subject.`}
        </p>
        {!video && value.referenceRole === "product" && (
          <AssetPicker
            label="Style/layout reference"
            value={value.templateAssetId}
            assets={assets.filter(
              (a) => a.kind !== "video" && a.id !== reference,
            )}
            onChange={(id) => set("templateAssetId", id)}
            emptyLabel="No style template"
            allowNone
            disabled={disabled}
          />
        )}
      </div>
      <div
        role="tabpanel"
        id="creative-panel-advanced"
        aria-labelledby="creative-tab-advanced"
        hidden={tab !== "advanced"}
      >
        <p className="caption-note">
          Optional overrides. Your selections and entered values are kept when
          switching tabs.
        </p>
        <label className="field">
          <span>
            {value.referenceRole === "style"
              ? "Subject to create"
              : "Main subject to preserve (optional)"}
          </span>
          <input
            maxLength={250}
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="e.g. The entire cat, including its collar"
          />
        </label>
        <p className="caption-note">
          Leave blank to preserve the dominant subject in an actual photo. For a
          style-only template, select a product or describe a new subject.
        </p>
        <label className="field">
          <span>Custom scene / creative direction</span>
          <textarea
            rows={4}
            maxLength={2000}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
          />
        </label>
        {(
          [
            "benefit",
            "proof",
            "offer",
            "headline",
            "subheadline",
            "cta",
          ] as const
        ).map((key) => (
          <label className="field" key={key}>
            <span>
              {
                {
                  benefit: "Specific benefit",
                  proof: "Approved proof (leave blank if unavailable)",
                  offer: "Approved offer (optional)",
                  headline: "Headline",
                  subheadline: "Subheadline",
                  cta: "Call to action",
                }[key]
              }
            </span>
            <input
              value={value[key]}
              maxLength={300}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
        <label className="creative-checkbox">
          <input
            type="checkbox"
            checked={value.textOverlay}
            onChange={(e) => set("textOverlay", e.target.checked)}
          />{" "}
          Include supplied text in the creative
        </label>
        <p className="caption-note">
          Headline, subheadline, approved offer, then CTA. The bottom 20% stays
          clear for a later logo overlay. Entering text in these fields turns
          this on automatically. Uncheck it for an image without added text.
        </p>
        {!value.textOverlay &&
          [value.headline, value.subheadline, value.offer].some((text) => text.trim()) && (
            <p className="caption-note" role="status">
              Text is off: your headline, subheadline and offer will not appear
              in the generated creative. Enable the checkbox above to include them.
            </p>
          )}
        {value.format === "custom" && !video && (
          <div className="form-grid">
            {(["width", "height"] as const).map((key) => (
              <label className="field" key={key}>
                <span>{title(key)} (pixels)</span>
                <input
                  type="number"
                  min={512}
                  max={4096}
                  value={value[key]}
                  onChange={(e) => set(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </fieldset>
  );
}
