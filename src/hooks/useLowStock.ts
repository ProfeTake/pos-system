import { useEffect, useMemo, useState } from "react";
import { Product } from "../types";

export type LowStockGroup = {
  critical: Product[]; // stock <= 0
  low: Product[]; // 0 < stock <= minStock
  near: Product[]; // stock > minStock && stock <= minStock*1.2
};

export interface UseLowStockOptions {
  includeNear?: boolean;
  nearFactor?: number; // default 1.2
  expireDays?: number; // firmas vencen luego de N días (default 7)
  storageKey?: string; // override localStorage key
}

interface SeenDataV1 {
  version: 1;
  updatedAt: string; // ISO date
  signatures: string[]; // id:stock:minStock
}

const DEFAULT_KEY = "pos.lowstock.signatures.v1";

function buildSignature(p: Product) {
  return `${p.id}:${p.stock}:${p.minStock}`;
}

function isExpired(iso: string, days: number) {
  try {
    const d = new Date(iso).getTime();
    if (!d) return true;
    const now = Date.now();
    const ms = days * 24 * 60 * 60 * 1000;
    return now - d > ms;
  } catch {
    return true;
  }
}

export interface InventoryRotationLite {
  id: number | string;
  avgDailySales?: number | null;
  daysOfStock?: number | null; // calculado por backend
}

export interface LowStockHookResult extends LowStockGroup {
  signatures: string[];
  unseenCount: number;
  markAllSeen: () => void;
  rotationMap: Record<string, InventoryRotationLite>;
  loadingRotation: boolean;
  refreshRotation: () => void;
}

export function useLowStock(
  products: Product[],
  opts: UseLowStockOptions = {}
): LowStockHookResult {
  const {
    includeNear = true,
    nearFactor = 1.2,
    expireDays = 7,
    storageKey = DEFAULT_KEY,
  } = opts;

  const activos = useMemo(
    () => products.filter((p) => p.estado !== "DESHABILITADO"),
    [products]
  );

  const groups: LowStockGroup = useMemo(() => {
    const critical: Product[] = [];
    const low: Product[] = [];
    const near: Product[] = [];
    for (const p of activos) {
      if (p.stock <= 0) critical.push(p);
      else if (p.stock <= p.minStock) low.push(p);
      else if (
        includeNear &&
        p.stock > p.minStock &&
        p.stock <= Math.ceil(p.minStock * nearFactor)
      )
        near.push(p);
    }
    // Ordenar por severidad y luego por valor monetario
    const valueDesc = (a: Product, b: Product) =>
      b.price * b.stock - a.price * a.stock;
    critical.sort(valueDesc);
    low.sort(valueDesc);
    near.sort(valueDesc);
    return { critical, low, near };
  }, [activos, includeNear, nearFactor]);

  const signatures = useMemo(() => {
    return [...groups.critical, ...groups.low].map(buildSignature).sort();
  }, [groups.critical, groups.low]);

  const [seen, setSeen] = useState<string[]>([]);

  // Load persisted
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const data: SeenDataV1 = JSON.parse(raw);
      if (data.version !== 1) return; // incompatible
      if (isExpired(data.updatedAt, expireDays)) return; // ignore expired
      setSeen(data.signatures || []);
    } catch { }
  }, [storageKey, expireDays]);

  const unseenCount = useMemo(
    () => signatures.filter((sig) => !seen.includes(sig)).length,
    [signatures, seen]
  );

  const markAllSeen = () => {
    try {
      const payload: SeenDataV1 = {
        version: 1,
        updatedAt: new Date().toISOString(),
        signatures,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setSeen(signatures);
    } catch { }
  };

  // Rotation analytics integration
  const [rotationMap, setRotationMap] = useState<
    Record<string, InventoryRotationLite>
  >({});
  const [loadingRotation, setLoadingRotation] = useState(false);

  const refreshRotation = async () => {
    setLoadingRotation(true);
    try {
      // Analytics endpoint removed - rotation feature disabled
      const map: Record<string, InventoryRotationLite> = {};
      // Analytics disabled
      setRotationMap(map);
    } catch (e) {
      // silent; UI can choose to show message if needed
    } finally {
      setLoadingRotation(false);
    }
  };

  useEffect(() => {
    // Lazy fetch only if there are low or critical products
    if (groups.critical.length + groups.low.length > 0) refreshRotation();
  }, [groups.critical.length, groups.low.length]);

  return {
    ...groups,
    signatures,
    unseenCount,
    markAllSeen,
    rotationMap,
    loadingRotation,
    refreshRotation,
  };
}
