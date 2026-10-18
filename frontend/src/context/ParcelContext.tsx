import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { apiRequest } from "../api";
import type { ParcelDetails } from "../types/dashboard";

interface ParcelContextType {
  parcelId: string;
  parcelDetails: ParcelDetails | null;
  watchlist: string[];
  loading: boolean;
  error: string | null;
  selectParcel: (newId: string) => void;
  toggleWatchlist: (targetId?: string) => void;
  isWatched: (targetId: string) => boolean;
  refreshParcel: () => Promise<void>;
}

const ParcelContext = createContext<ParcelContextType | null>(null);

const DEFAULT_PARCEL_ID = "LS-PARCEL-000001";
const STORAGE_PARCEL_KEY = "landsure_selected_parcel_id";

export function ParcelProvider({
  children,
  token,
  username = "demo",
}: {
  children: ReactNode;
  token?: string;
  username?: string;
}) {
  const [parcelId, setParcelIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_PARCEL_KEY) || DEFAULT_PARCEL_ID;
    } catch {
      return DEFAULT_PARCEL_ID;
    }
  });

  const [parcelDetails, setParcelDetails] = useState<ParcelDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWatchlistKey = useCallback((u: string) => `landsure_watchlist_${u || "guest"}`, []);

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(getWatchlistKey(username));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
      return [DEFAULT_PARCEL_ID];
    } catch {
      return [DEFAULT_PARCEL_ID];
    }
  });

  const fetchDetails = useCallback(async (id: string, authToken?: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ parcel?: ParcelDetails } | ParcelDetails>(
        `/api/v1/parcels/${encodeURIComponent(id)}`,
        { token: authToken }
      );
      const details = (data as { parcel?: ParcelDetails }).parcel ?? (data as ParcelDetails);
      setParcelDetails(details);
    } catch (err) {
      console.warn(`[ParcelContext] Failed to fetch parcel ${id}:`, err);
      // Keep optimistic minimal details if backend fetch fails
      setParcelDetails((prev) => prev && prev.parcel_id === id ? prev : { parcel_id: id });
      setError(err instanceof Error ? err.message : "পার্সেল তথ্য লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch parcel details when parcelId or token changes
  useEffect(() => {
    fetchDetails(parcelId, token);
  }, [parcelId, token, fetchDetails]);

  // Sync watchlist with username changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getWatchlistKey(username));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setWatchlist(parsed);
      }
    } catch {
      // Ignore
    }
  }, [username, getWatchlistKey]);

  const selectParcel = useCallback((newId: string) => {
    if (!newId || typeof newId !== "string") return;
    const clean = newId.trim().toUpperCase();
    setParcelIdState(clean);
    try {
      localStorage.setItem(STORAGE_PARCEL_KEY, clean);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleWatchlist = useCallback(
    (targetId?: string) => {
      const idToToggle = (targetId || parcelId).trim().toUpperCase();
      if (!idToToggle) return;

      setWatchlist((prev) => {
        const exists = prev.includes(idToToggle);
        const next = exists ? prev.filter((id) => id !== idToToggle) : [...prev, idToToggle];
        try {
          localStorage.setItem(getWatchlistKey(username), JSON.stringify(next));
        } catch {
          // Ignore storage errors
        }
        return next;
      });
    },
    [parcelId, username, getWatchlistKey]
  );

  const isWatched = useCallback(
    (targetId: string) => {
      const clean = targetId.trim().toUpperCase();
      return watchlist.includes(clean);
    },
    [watchlist]
  );

  const refreshParcel = useCallback(async () => {
    await fetchDetails(parcelId, token);
  }, [fetchDetails, parcelId, token]);

  return (
    <ParcelContext.Provider
      value={{
        parcelId,
        parcelDetails,
        watchlist,
        loading,
        error,
        selectParcel,
        toggleWatchlist,
        isWatched,
        refreshParcel,
      }}
    >
      {children}
    </ParcelContext.Provider>
  );
}

export function useParcelContext() {
  const context = useContext(ParcelContext);
  if (!context) {
    throw new Error("useParcelContext must be used within a ParcelProvider");
  }
  return context;
}
