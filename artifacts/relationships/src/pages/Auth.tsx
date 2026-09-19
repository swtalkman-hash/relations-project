import React from "react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t } from "../lib/i18n";
import { COUNTRIES } from "../lib/countries";
import { Logo } from "../components/Logo";
import { SupportButton } from "../components/SupportButton";
import { Phone, Mail, Eye, EyeOff, Star, Send, CheckCircle } from "lucide-react";

type Mode = "login" | "signup";
type Method = "phone" | "email";

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${5 + Math.floor(((i * 37 + 11) % 90))}%`,
  size: 2 + (i % 4),
  delay: `${(i * 0.6) % 7}s`,
  duration: `${7 + (i % 8)}s`,
  drift: `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 25))}px`,
  top: `${60 + (i % 35)}%`,
}));

function OtpBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, ch: string) => {
    const digit = ch.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(6, " ").split("");
    arr[i] = digit || " ";
    const next = arr.join("").replace(/ /g, "");
    onChange(next.slice(0, 6));
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text) { onChange(text); inputs.current[Math.min(text.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center my-2" dir="ltr">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="text-center text-xl font-bold rounded-xl"
          style={{
            width: 44,
            height: 52,
            background: "rgba(212,175,55,0.08)",
            border: value[i] ? "2px solid rgba(212,175,55,0.7)" : "2px solid rgba(255,255,255,0.1)",
            color: "var(--color-gold-light)",
            outline: "none",
            caretColor: "transparent",
            transition: "border-color 0.2s",
          }}
        />
      ))}
    </div>
  );
}

export function AuthPage({ initialMode }: { initialMode: Mode }): React.ReactElement {
  const [, navigate] = useLocation();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [method, setMethod] = useState<Method>("phone");
  const [country, setCountry] = useState("+966");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referral, setReferral] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("ref") ?? "";
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [mounted, setMounted] = useState(false);

  // OTP state
  useEffect(() => { setMounted(true); }, []);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErr("");

    setLoading(true);
    try {
      if (mode === "signup") {
        await api.post("/auth/signup", {
          name: name.trim(),
          phone: method === "phone" ? `${country}${phone.trim()}` : null,
          countryCode: method === "phone" ? country : null,
          email: method === "email" ? email.trim().toLowerCase() : null,
          password,
          referralCode: referral.trim() || null,
          language: "ar",
        });
      } else {
        const identifier =
          method === "phone" ? `${country}${phone.trim()}` : email.trim().toLowerCase();
        await api.post("/auth/login", { identifier, password });
      }
      await refresh();
      navigate("/");
    } catch (e) {
      const msg = (e as Error).message;
      const map: Record<string, string> = {
        invalid_credentials: "بيانات الدخول غير صحيحة",
        phone_taken: "رقم الجوال مسجل مسبقاً",
        email_taken: "البريد مسجل مسبقاً",
        password_too_short: "كلمة المرور يجب 6 أحرف على الأقل",
        phone_or_email_required: "أدخل رقم الجوال أو الإيميل",
      };
      setErr(map[msg] ?? msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-8 relative overflow-hidden">
      <SupportButton />

      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(212,175,55,0.18) 0%, transparent 65%), radial-gradient(ellipse 60% 40% at 80% 110%, rgba(100,60,200,0.12) 0%, transparent 60%), var(--color-bg)",
      }} />

      {mounted && PARTICLES.map((p) => (
        <div
          key={p.id}
          style={{
            position: "fixed",
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, #f0d77a, #d4af37)`,
            boxShadow: `0 0 ${p.size * 2}px rgba(212,175,55,0.8)`,
            animation: `particle-rise ${p.duration} ${p.delay} infinite ease-in`,
            "--drift": p.drift,
            pointerEvents: "none",
            zIndex: 0,
          } as React.CSSProperties}
        />
      ))}

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8 mt-4">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl opacity-50" style={{
              background: "radial-gradient(circle, rgba(212,175,55,0.6) 0%, transparent 70%)",
              transform: "scale(1.8)",
            }} />
            <div className="relative"><Logo size="lg" /></div>
          </div>
          <p className="text-[var(--color-muted)] mt-3 text-sm tracking-wide">{t("tagline")}</p>
          {mode === "signup" && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-2xl" style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.06))",
              border: "1px solid rgba(212,175,55,0.3)",
            }}>
              <Star size={12} fill="#d4af37" stroke="none" />
              <span className="text-xs font-bold" style={{ color: "var(--color-gold-light)" }}>
                {t("signup_bonus")}
              </span>
              <Star size={12} fill="#d4af37" stroke="none" />
            </div>
          )}
        </div>

        <div
          className="fade-up"
          style={{
            background: "linear-gradient(145deg, rgba(22,22,40,0.95) 0%, rgba(14,14,28,0.98) 100%)",
            border: "1px solid rgba(212,175,55,0.18)",
            borderRadius: 28,
            padding: 22,
            boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* تبويب تسجيل الدخول / إنشاء حساب */}
          <div className="flex rounded-2xl p-1 mb-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border)" }}>
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErr(""); }}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
                style={mode === m ? {
                  background: "linear-gradient(135deg, #f5e070, #d4af37 50%, #9a7010)",
                  color: "#06060e",
                  boxShadow: "0 4px 16px -4px rgba(212,175,55,0.6)",
                } : {
                  color: "var(--color-muted)",
                }}
              >
                {m === "login" ? t("login") : t("signup")}
              </button>
            ))}
          </div>

          <h2 className="text-xl font-bold mb-4">
            {mode === "login" ? t("welcome_back") : t("welcome_signup")}
          </h2>

          {/* اختيار الطريقة */}
          <div className="flex gap-2 mb-4">
            {(["phone", "email"] as Method[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className="flex-1 py-2.5 px-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-200"
                style={method === m ? {
                  background: "rgba(212,175,55,0.12)",
                  border: "1.5px solid rgba(212,175,55,0.5)",
                  color: "var(--color-gold-light)",
                } : {
                  background: "transparent",
                  border: "1.5px solid var(--color-border)",
                  color: "var(--color-muted)",
                }}
              >
                {m === "phone" ? <Phone size={14} /> : <Mail size={14} />}
                {m === "phone" ? t("continue_phone") : t("continue_email")}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                className="input"
                placeholder={t("name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}

            {method === "phone" ? (
              <div className="flex gap-2 w-full">
                <select
                  className="input shrink-0"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={{
                    width: "90px",
                    background: "#161626",
                    color: "#f0f0ff",
                    WebkitTextFillColor: "#f0f0ff",
                    padding: "13px 8px",
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  className="input min-w-0"
                  type="tel"
                  inputMode="numeric"
                  placeholder={t("phone")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  required
                  autoComplete="tel"
                  style={{
                    flex: "1 1 0%",
                    width: "auto",
                    background: "#161626",
                    color: "#f0f0ff",
                    WebkitTextFillColor: "#f0f0ff",
                    caretColor: "#f0f0ff",
                  }}
                />
              </div>
            ) : (
              <input
                className="input"
                type="email"
                placeholder={t("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}

            <div className="relative">
              <input
                className="input pr-10"
                type={showPassword ? "text" : "password"}
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute top-1/2 -translate-y-1/2 left-3"
                style={{ color: "var(--color-muted)" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {mode === "signup" && (
              <input
                className="input"
                placeholder={t("referral_code")}
                value={referral}
                onChange={(e) => setReferral(e.target.value.toUpperCase())}
              />
            )}

            {err && (
              <div
                className="text-sm rounded-2xl px-4 py-3 flex items-center gap-2"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--color-danger)" }}
              >
                <span>⚠</span> {err}
              </div>
            )}

            <button
              type="submit"
              className="btn-gold w-full text-base mt-1"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span style={{ width: 16, height: 16, border: "2.5px solid rgba(6,6,14,0.4)", borderTopColor: "rgba(6,6,14,0.9)", borderRadius: "50%", display: "inline-block", animation: "spin-slow 0.7s linear infinite" }} />
                  {t("loading")}
                </span>
              ) : mode === "login" ? t("login") : t("signup")}
            </button>

          </form>

          <p className="text-center text-sm mt-4" style={{ color: "var(--color-muted)" }}>
            {mode === "login" ? t("no_account") : t("have_account")}{" "}
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}
              className="font-bold"
              style={{ color: "var(--color-gold-light)" }}
            >
              {mode === "login" ? t("signup") : t("login")}
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
