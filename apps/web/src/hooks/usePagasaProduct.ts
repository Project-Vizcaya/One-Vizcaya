import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parsePagasaProduct, type PagasaProduct } from "@/lib/pagasa";

/** Live view of pagasa_products/nueva_vizcaya — the same document mobile reads. */
export function usePagasaProduct() {
  const [product, setProduct] = useState<PagasaProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      doc(db, "pagasa_products", "nueva_vizcaya"),
      (snap) => {
        setProduct(snap.exists() ? parsePagasaProduct(snap.data()) : null);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setProduct(null);
        setError(e.message);
        setLoading(false);
      },
    );
  }, []);

  return { product, loading, error };
}
