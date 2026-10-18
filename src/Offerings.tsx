import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { Plus, Leaf, RefreshCw, Image } from "lucide-react";
import { api } from "./api";
import AssetPicker from "./AssetPicker";
import ProductPhoto from "./ProductPhoto";
import type { MediaAsset, Product, State } from "./types";

type Props = {
  s: State;
  busy: boolean;
  run: (fn: () => Promise<unknown>, success?: string) => Promise<void>;
  renderArt: (product: Product) => ReactNode;
};
function NoPhoto() {
  return (
    <div className="offering-no-photo">
      <Leaf size={28} />
      <span>No product photo</span>
    </div>
  );
}
export default function Offerings({ s, busy, run, renderArt }: Props) {
  const [adding, setAdding] = useState(false);
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const [photoProduct, setPhotoProduct] = useState("");
  const [photoId, setPhotoId] = useState("");
  const [photos, setPhotos] = useState<MediaAsset[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const photoTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!photoProduct) return;
    let active = true;
    setLoadingPhotos(true);
    setPhotoError("");
    setPhotos([]);
    api<{ assets: MediaAsset[] }>("/owner/media")
      .then(({ assets }) => {
        if (active) setPhotos(assets.filter((a) => a.kind !== "video"));
      })
      .catch((e) => {
        if (active) setPhotoError(e.message);
      })
      .finally(() => {
        if (active) setLoadingPhotos(false);
      });
    return () => {
      active = false;
    };
  }, [photoProduct]);
  function closePhotos() {
    setPhotoProduct("");
    photoTrigger.current?.focus();
  }
  const branches = [
    ...new Set(s.products.flatMap((p) => Object.keys(p.stock))),
  ];
  if (!branches.length) branches.push("Main");
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    return run(async () => {
      await api("/owner/products", {
        id: newId,
        name: form.get("name"),
        description: form.get("description"),
        price: Number(form.get("price")),
        stock: Object.fromEntries(
          branches.map((branch, i) => [branch, Number(form.get(`stock-${i}`))]),
        ),
      });
      setAdding(false);
      setNewId(crypto.randomUUID());
    }, "New item saved. Sheet sync status is shown on its card.");
  }
  function save(product: Product, form: FormData) {
    return run(
      () =>
        api(
          "/owner/products/" + product.id,
          {
            name: form.get("name"),
            description: form.get("description"),
            price: Number(form.get("price")),
          },
          "PATCH",
        ),
      "Offering saved. Sheet sync status is shown on its card.",
    );
  }
  return (
    <>
      <div className="section-heading offerings-heading">
        <div>
          <h2>Your offerings</h2>
          <p className="caption-note">
            Names, descriptions, and prices sync to the connected Sheet when
            saved. Existing Sheet stock is preserved.
          </p>
        </div>
        <button
          disabled={busy}
          className="secondary small-button"
          onClick={() => setAdding(!adding)}
        >
          <Plus size={16} />
          {adding ? "Close new item" : "Add new item"}
        </button>
      </div>
      {adding && (
        <section className="panel new-offering-panel">
          <h3>Add a new item</h3>
          <form onSubmit={add}>
            <div className="two-columns">
              <label className="field">
                <span>Name</span>
                <input name="name" required maxLength={100} autoFocus />
              </label>
              <label className="field">
                <span>Price (PHP)</span>
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max="1000000"
                  required
                />
              </label>
            </div>
            <label className="field">
              <span>Description</span>
              <textarea name="description" rows={3} maxLength={2000} />
            </label>
            <h4>Starting stock</h4>
            <div className="offering-stock-inputs">
              {branches.map((branch, i) => (
                <label className="field" key={branch}>
                  <span>{branch}</span>
                  <input
                    name={`stock-${i}`}
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    defaultValue="0"
                    required
                  />
                </label>
              ))}
            </div>
            <p className="caption-note">
              Creates this item's Products row and starting BranchStock rows
              when Sheets is connected. Without a connection, it is saved in
              your studio.
            </p>
            <button disabled={busy}>
              <Plus size={16} />
              {busy ? "Saving…" : "Add item"}
            </button>
          </form>
        </section>
      )}
      <div className="product-grid">
        {s.products.map((product) => (
          <section className="panel product-edit" key={product.id}>
            <div className="offering-photo-frame">
              <ProductPhoto
                product={product}
                fallback={product.image ? renderArt(product) : <NoPhoto />}
              />
              <button
                type="button"
                className="offering-change-photo"
                disabled={busy}
                aria-label={`Change photo for ${product.name}`}
                aria-expanded={photoProduct === product.id}
                aria-controls={`offering-photo-${product.id}`}
                onClick={(event) => {
                  photoTrigger.current = event.currentTarget;
                  setPhotoId(product.photoAssetId || "");
                  setPhotoProduct(
                    photoProduct === product.id ? "" : product.id,
                  );
                }}
              >
                <Image size={16} />{" "}
                {product.photoAssetId || product.image
                  ? "Change photo"
                  : "Add photo"}
              </button>
            </div>
            {photoProduct === product.id && (
              <section
                className="offering-photo-picker"
                id={`offering-photo-${product.id}`}
                aria-label={`Photo for ${product.name}`}
              >
                {loadingPhotos ? (
                  <p role="status">Loading library...</p>
                ) : photoError ? (
                  <p role="alert">{photoError} Close and reopen to retry.</p>
                ) : photos.length ? (
                  <AssetPicker
                    label="Choose a library photo"
                    value={photoId}
                    assets={photos}
                    onChange={setPhotoId}
                    disabled={busy}
                  />
                ) : (
                  <p>
                    No photos in your library yet. Upload or generate a photo in
                    Content Studio first.
                  </p>
                )}
                <p className="caption-note">
                  This photo will be visible on your storefront when saved.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="small-button"
                    disabled={
                      busy ||
                      loadingPhotos ||
                      !photos.some((a) => a.id === photoId)
                    }
                    onClick={() =>
                      run(async () => {
                        await api(
                          `/owner/products/${product.id}/photo`,
                          { assetId: photoId },
                          "PATCH",
                        );
                        closePhotos();
                      }, "Product photo updated on your storefront.")
                    }
                  >
                    {busy ? "Saving..." : "Use photo"}
                  </button>
                  <button
                    type="button"
                    className="secondary small-button"
                    disabled={busy}
                    onClick={closePhotos}
                  >
                    Cancel
                  </button>
                </div>
              </section>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                save(product, new FormData(event.currentTarget));
              }}
            >
              <label className="field">
                <span>Name</span>
                <input
                  name="name"
                  defaultValue={product.name}
                  maxLength={100}
                  required
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  name="description"
                  defaultValue={product.description}
                  maxLength={2000}
                  rows={3}
                />
              </label>
              <label className="field">
                <span>Price (PHP)</span>
                <input
                  type="number"
                  name="price"
                  min="0.01"
                  step="0.01"
                  max="1000000"
                  defaultValue={product.price}
                  required
                />
              </label>
              <div className="stock-labels">
                {Object.entries(product.stock).map(([branch, q]) => (
                  <span className="badge" key={branch}>
                    {branch}: {q}
                  </span>
                ))}
              </div>
              <p
                role="status"
                className={
                  "offering-sync " +
                  (s.sheetConnected && product.sheetStatus === "error"
                    ? "has-error"
                    : "")
                }
              >
                {!s.sheetConnected
                  ? "Saved in studio · Google Sheets not connected"
                  : product.sheetStatus === "synced"
                    ? "Synced to Google Sheets"
                    : product.sheetStatus === "error"
                      ? product.sheetError
                      : product.sheetStatus === "pending"
                        ? "Saved in studio · Sheet sync pending"
                        : "Save or sync workbook to update this item in Sheets."}
              </p>
              <div className="actions">
                <button className="secondary small-button" disabled={busy}>
                  Save offering
                </button>
                {s.sheetConnected &&
                  (product.sheetStatus === "error" ||
                    product.sheetStatus === "pending") && (
                    <button
                      className="secondary small-button"
                      disabled={busy}
                      type="button"
                      onClick={() =>
                        run(
                          () =>
                            api("/owner/products/" + product.id + "/sync", {}),
                          "Sheet sync attempted. Check the item status.",
                        )
                      }
                    >
                      <RefreshCw size={14} /> Retry Sheet sync
                    </button>
                  )}
              </div>
            </form>
          </section>
        ))}
      </div>
    </>
  );
}
