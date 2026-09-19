import React, { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api";
import { useAdminAuth } from "../lib/auth";

export function LoginPage(): React.ReactElement {
  const [, navigate]   = useLocation();
  const { refresh }    = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.post("/admin/login", { username: username.trim(), password });
      await refresh();
      navigate("/");
    } catch {
      setErr("اسم المستخدم أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center">
          <div
            className="w-20 h-20 mx-auto rounded-3xl gold-bg flex items-center justify-center mb-4 shadow-2xl"
            style={{ boxShadow: "0 8px 32px rgba(212,175,55,0.35)" }}
          >
            <ShieldCheck size={36} style={{ color: "#080810" }} />
          </div>
          <h1 className="gold-text text-[28px] font-extrabold leading-none">Safe investment</h1>
          <p className="text-[13px] mt-1.5" style={{ color: "var(--color-muted)" }}>
            لوحة تحكم المسؤول
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={submit}
          className="card space-y-4"
          style={{ border: "1px solid var(--color-border-light)" }}
        >
          <div>
            <p className="text-[16px] font-extrabold mb-4">تسجيل الدخول</p>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label
              className="text-[12px] font-bold block"
              style={{ color: "var(--color-muted-2)" }}
            >
              اسم المستخدم
            </label>
            <input
              className="input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="admin"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              className="text-[12px] font-bold block"
              style={{ color: "var(--color-muted-2)" }}
            >
              كلمة المرور
            </label>
            <div className="relative">
              <input
                className="input pl-10"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-muted)" }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "var(--color-danger)",
              }}
            >
              ⚠️ {err}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full text-[15px] mt-2"
            style={{ height: 48 }}
          >
            {loading ? "جاري الدخول..." : "دخول إلى اللوحة"}
          </button>
        </form>

        {/* Hint */}
        <p
          className="text-center text-[11px]"
          style={{ color: "var(--color-muted)" }}
        >
          البيانات الافتراضية: admin / admin123
        </p>
      </div>
    </div>
  );
}
