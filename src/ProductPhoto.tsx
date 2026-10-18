import { useEffect, useState, type ReactNode } from "react";
import { apiBlob } from "./api";
import type { Product } from "./types";

export default function ProductPhoto({
  product,
  publicView = false,
  fallback,
  hero = false,
  fit = "cover",
}: {
  product: Pick<Product, "id" | "name" | "photoAssetId">;
  publicView?: boolean;
  fallback: ReactNode;
  hero?: boolean;
  fit?: "cover" | "contain";
}) {
  const [image, setImage] = useState<{ id: string; url: string }>();
  const [error, setError] = useState("");
  const assetId = product.photoAssetId;
  const productId = product.id;
  useEffect(() => {
    setImage(undefined);
    setError("");
    if (!assetId) return;
    let active = true;
    let url = "";
    apiBlob(
      publicView
        ? hero
          ? "/public/store/hero-photo"
          : `/public/products/${productId}/photo`
        : `/owner/media/${assetId}/file`,
    )
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setImage({ id: assetId, url });
      })
      .catch(() => {
        if (active) setError("Photo unavailable");
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [assetId, productId, publicView, hero]);
  if (!assetId) return <>{fallback}</>;
  return (
    <div className={`product-photo product-photo-fit-${fit}`}>
      {image?.id === assetId ? (
        <img src={image.url} alt={product.name} style={{ objectFit: fit }} />
      ) : (
        <span role="status">{error || "Loading photo..."}</span>
      )}
    </div>
  );
}
