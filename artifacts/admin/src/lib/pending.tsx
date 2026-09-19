import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

type Counts = { pendingDeposits: number; pendingWithdrawals: number };
type Ctx = { counts: Counts; refresh: () => void };

const PendingCtx = createContext<Ctx>({ counts: { pendingDeposits: 0, pendingWithdrawals: 0 }, refresh: () => {} });

export function PendingProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [counts, setCounts] = useState<Counts>({ pendingDeposits: 0, pendingWithdrawals: 0 });

  const refresh = useCallback(() => {
    void api.get<Counts>("/admin/stats")
      .then((s) => setCounts({ pendingDeposits: s.pendingDeposits, pendingWithdrawals: s.pendingWithdrawals }))
      .catch(() => null);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const value = useMemo(() => ({ counts, refresh }), [counts, refresh]);
  return <PendingCtx.Provider value={value}>{children}</PendingCtx.Provider>;
}

export function usePending(): Ctx { return useContext(PendingCtx); }
