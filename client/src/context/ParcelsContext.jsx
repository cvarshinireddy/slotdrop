import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, connectRealtime } from '@/lib/api';

const ParcelsContext = createContext(null);

// Resident-only store: the flat's parcels + realtime updates + optimistic helpers.
export function ParcelsProvider({ children }) {
  const [parcels, setParcels] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [slotByParcel, setSlotByParcel] = useState({}); // parcelId -> { bookingId, slot }
  const [freshIds, setFreshIds] = useState(() => new Set()); // parcels that just arrived (for the entry highlight)
  const known = useRef(new Set());

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setStatus('loading');
    try {
      const [list, bookings] = await Promise.all([api.listParcels(), api.listBookings()]);
      setSlotByParcel(Object.fromEntries(bookings.filter((b) => b.status === 'ACTIVE').map((b) => [b.parcelId, { bookingId: b._id, slot: b.slotId }])));
      const arrived = list.filter((p) => known.current.size && !known.current.has(p._id)).map((p) => p._id);
      known.current = new Set(list.map((p) => p._id));
      setParcels(list);
      setStatus('ready');
      if (arrived.length) {
        setFreshIds((s) => new Set([...s, ...arrived]));
        setTimeout(() => setFreshIds((s) => new Set([...s].filter((id) => !arrived.includes(id)))), 4000);
      }
    } catch {
      if (!silent) setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
    return connectRealtime({
      'parcel:new': () => refresh({ silent: true }),
      'parcel:updated': () => refresh({ silent: true }),
    });
  }, [refresh]);

  // Optimistic UI: flip the status locally first; the realtime refresh (or rollback) reconciles with the server.
  const patchParcel = useCallback((id, patch) => setParcels((list) => list.map((p) => (p._id === id ? { ...p, ...patch } : p))), []);

  const value = useMemo(() => ({ parcels, status, freshIds, slotByParcel, refresh, patchParcel }), [parcels, status, freshIds, slotByParcel, refresh, patchParcel]);
  return <ParcelsContext.Provider value={value}>{children}</ParcelsContext.Provider>;
}

export const useParcels = () => useContext(ParcelsContext);
