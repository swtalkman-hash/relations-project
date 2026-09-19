import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";

type Admin = { id: string; username: string };
type Ctx = {
  admin: Admin | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  admin: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AdminAuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const a = await api.get<Admin>("/admin/me");
      setAdmin(a);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/admin/logout");
    } catch {
      // ignore
    }
    setAdmin(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ admin, loading, refresh, logout }), [admin, loading, refresh, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAdminAuth(): Ctx {
  return useContext(AuthCtx);
}
