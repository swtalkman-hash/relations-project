import React from "react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowDownToLine, ArrowUpFromLine, TrendingUp,
  Users, Gift, Shield, BarChart3, Sparkles, Clock,
  Wallet, Bell, ChevronRight, Zap,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t } from "../lib/i18n";

type Dashboard = {
  user: { balance: string; totalInvested: string; totalEarned: string };
  activeInvestment: {
    id: string; amount: string; level: number;
    dailyMinRate: string; dailyMaxRate: string;
    lastCollectedAt: string | null;
  } | null;
  canCollect: boolean;
  nextCollectAt: string | null;
  todayEarnings: string;
  totalReferrals: number;
};

function fmt(n: string | number): string {
  const v = typeof n === "string" ? Number(n) : n;
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCountdown(target: string): string {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء الخير";
  return "مساء النور";
}

const LEVEL_COLORS: Record<number, { from: string; to: string; badge: string; glow: string }> = {
  1: { from: "#cd7f3215", to: "#8B451310", badge: "#cd7f32", glow: "rgba(205,127,50,0.4)" },
  2: { from: "#a8a9ad15", to: "#60606010", badge: "#a8a9ad", glow: "rgba(168,169,173,0.35)" },
  3: { from: "#d4af3720", to: "#a07c1a12", badge: "#d4af37", glow: "rgba(212,175,55,0.45)" },
};

export function DashboardPage(): React.ReactElement {
  const { user, refresh } = useAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState<Dashboard | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = async (): Promise<void> => {
    try { setData(await api.get<Dashboard>("/me/dashboard")); }
    catch { /* ignore */ }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const collect = async (): Promise<void> => {
    setCollecting(true);
    try {
      const r = await api.post<{ collected: string; newBalance: string }>("/investments/collect");
      setPopup(r.collected);
      setTimeout(() => setPopup(null), 2800);
      await Promise.all([load(), refresh()]);
    } catch { /* ignore */ }
    finally { setCollecting(false); }
  };

  if (!user || !data) {
    return (
      <div className="p-4 space-y-4 pt-5">
        <div className="flex items-center justify-between">
          <div className="shimmer h-10 w-40 rounded-2xl" />
          <div className="shimmer h-10 w-20 rounded-2xl" />
        </div>
        <div className="shimmer h-56 rounded-3xl" />
        <div className="shimmer h-38 rounded-3xl" />
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-22 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  void tick;
  const inv = data.activeInvestment;
  const lvlColor = inv ? (LEVEL_COLORS[inv.level] ?? LEVEL_COLORS[1]) : LEVEL_COLORS[1];

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="fade-up">
          <p className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>{greeting()} 👋</p>
          <h1 className="text-xl font-extrabold leading-tight mt-0.5">{user.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/prices")}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
            style={{
              background: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(167,139,250,0.06))",
              border: "1px solid rgba(167,139,250,0.25)",
            }}
          >
            <BarChart3 size={17} style={{ color: "#a78bfa" }} />
          </button>
          <button
            onClick={() => navigate("/transactions")}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
          >
            <Wallet size={17} style={{ color: "var(--color-muted-2)" }} />
          </button>
        </div>
      </div>

      {/* ── Balance card ── */}
      <div
        className="rounded-3xl p-5 relative overflow-hidden fade-up"
        style={{
          background: "linear-gradient(145deg, #1a1500 0%, #0e0c00 45%, #080818 100%)",
          border: "1px solid rgba(212,175,55,0.28)",
          boxShadow: "0 24px 64px -20px rgba(212,175,55,0.2), inset 0 1px 0 rgba(212,175,55,0.12), inset 0 -1px 0 rgba(0,0,0,0.3)",
        }}
      >
        {/* خلفية متوهجة */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 70% at 15% -5%, rgba(212,175,55,0.18) 0%, transparent 65%)",
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 50% 40% at 90% 95%, rgba(160,80,200,0.1) 0%, transparent 55%)",
        }} />
        {/* خط ذهبي علوي */}
        <div className="absolute top-0 left-8 right-8 h-px" style={{
          background: "linear-gradient(to right, transparent, rgba(212,175,55,0.6), transparent)",
        }} />

        <div className="relative z-10">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "rgba(212,175,55,0.6)" }}>
            <Wallet size={11} />
            {t("balance")}
          </p>
          <div className="flex items-baseline gap-1 mb-5">
            <span className="text-[44px] font-black leading-none gold-text tracking-tight ticker">
              ${fmt(data.user.balance)}
            </span>
          </div>

          {/* أزرار الإيداع والسحب */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <button
              onClick={() => navigate("/deposit")}
              className="btn-gold py-3 flex items-center justify-center gap-2 text-[13px]"
            >
              <ArrowDownToLine size={15} />
              {t("deposit")}
            </button>
            <button
              onClick={() => navigate("/withdraw")}
              className="py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-[13px] transition active:scale-95"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            >
              <ArrowUpFromLine size={15} />
              {t("withdraw")}
            </button>
          </div>

          {/* إحصائيات */}
          <div className="grid grid-cols-3 gap-2 pt-4" style={{ borderTop: "1px solid rgba(212,175,55,0.1)" }}>
            <StatItem label={t("today_earnings")} value={`$${fmt(data.todayEarnings)}`} gold />
            <StatItem label={t("total_earned")} value={`$${fmt(data.user.totalEarned)}`} />
            <StatItem label={t("total_invested")} value={`$${fmt(data.user.totalInvested)}`} />
          </div>
        </div>
      </div>

      {/* ── بطاقة الاستثمار / الحث على الإيداع ── */}
      {inv ? (
        <div
          className="rounded-3xl p-4 relative overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${lvlColor.from} 0%, var(--color-surface) 100%)`,
            border: `1px solid ${lvlColor.badge}28`,
            boxShadow: `0 12px 40px -14px ${lvlColor.glow}`,
          }}
        >
          {/* خط علوي */}
          <div className="absolute top-0 left-6 right-6 h-px" style={{
            background: `linear-gradient(to right, transparent, ${lvlColor.badge}50, transparent)`,
          }} />

          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg"
                style={{
                  background: `linear-gradient(135deg, ${lvlColor.badge}25, ${lvlColor.badge}10)`,
                  border: `1.5px solid ${lvlColor.badge}40`,
                  color: lvlColor.badge,
                  boxShadow: `0 4px 12px ${lvlColor.glow}`,
                }}
              >
                {inv.level}
              </div>
              <div>
                <p className="text-[11px] font-semibold" style={{ color: "var(--color-muted)" }}>
                  {t("level")} {inv.level} · {t("active_investment")}
                </p>
                <p className="text-xl font-black">${fmt(data.user.balance)}</p>
              </div>
            </div>
            <div className="text-end">
              <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{t("daily_return")}</p>
              <p className="font-extrabold text-sm" style={{ color: lvlColor.badge }}>
                {(Number(inv.dailyMinRate) * 100).toFixed(1)}% – {(Number(inv.dailyMaxRate) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {data.canCollect ? (
            <button
              onClick={collect}
              disabled={collecting}
              className="btn-gold w-full flex items-center justify-center gap-2 pulse-glow"
            >
              <Sparkles size={17} />
              {collecting ? t("loading") : t("collect_profit")}
            </button>
          ) : (
            <div
              className="rounded-2xl p-3.5 flex items-center justify-between"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-center gap-2" style={{ color: "var(--color-muted)" }}>
                <Clock size={14} />
                <span className="text-sm">{t("next_collection")}</span>
              </div>
              <span className="font-mono font-extrabold text-base ticker" style={{ color: "var(--color-gold-light)" }} dir="ltr">
                {data.nextCollectAt ? formatCountdown(data.nextCollectAt) : "--:--:--"}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="rounded-3xl p-6 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #121220 0%, #0e0e1c 100%)",
            border: "1px dashed rgba(212,175,55,0.25)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 70%)",
          }} />
          <div
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 relative float"
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
              border: "1px solid rgba(212,175,55,0.25)",
            }}
          >
            <TrendingUp size={26} style={{ color: "var(--color-gold)" }} />
          </div>
          <p className="font-extrabold text-base mb-1">أودع لتبدأ أرباحك</p>
          <p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
            بمجرد قبول إيداعك تبدأ أرباحك اليومية تلقائياً
          </p>
          <button onClick={() => navigate("/deposit")} className="btn-gold inline-flex items-center gap-2 px-7">
            <ArrowDownToLine size={15} />
            أودع الآن
          </button>
        </div>
      )}

      {/* ── اختصارات سريعة ── */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { icon: Gift,       label: t("wheel"),  path: "/wheel",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
          { icon: Users,      label: t("team"),   path: "/team",   color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
          { icon: Shield,     label: t("tasks"),  path: "/tasks",  color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
          { icon: BarChart3,  label: t("prices"), path: "/prices", color: "#a78bfa", bg: "rgba(167,139,250,0.12)"},
        ].map(({ icon: Icon, label, path, color, bg }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="rounded-2xl flex flex-col items-center gap-2 py-3.5 transition-all duration-150 active:scale-90"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: bg, boxShadow: `0 4px 12px ${color}25` }}
            >
              <Icon size={19} style={{ color }} />
            </div>
            <span className="text-[11px] font-bold" style={{ color: "var(--color-muted-2)" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── بانر ترويجي ── */}
      <div
        className="rounded-3xl overflow-hidden relative"
        style={{ border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 8px 32px -8px rgba(212,175,55,0.15)" }}
      >
        <img src="/brand/gold-bar.jpg" alt="" className="w-full h-28 object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(6,6,16,0.9) 0%, rgba(6,6,16,0.4) 60%, rgba(6,6,16,0.15) 100%)" }}
        />
        <div className="absolute inset-0 flex flex-col justify-center px-5">
          <p className="text-[10px] font-bold mb-1 flex items-center gap-1.5" style={{ color: "var(--color-gold-light)" }}>
            <Zap size={10} fill="currentColor" />
            {t("market_open")}
          </p>
          <p className="text-sm font-extrabold text-white leading-snug max-w-[58%]">
            {t("tagline")}
          </p>
          <button
            onClick={() => navigate("/invest")}
            className="mt-2 self-start flex items-center gap-1 text-[11px] font-bold"
            style={{ color: "var(--color-gold-light)" }}
          >
            ابدأ الآن <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* ── نافذة الربح ── */}
      {popup !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className="pop rounded-3xl px-10 py-8 text-center"
            style={{
              background: "linear-gradient(145deg, #1e1a04 0%, #0e0e1c 100%)",
              border: "1px solid rgba(212,175,55,0.4)",
              boxShadow: "0 40px 100px -10px rgba(212,175,55,0.35)",
            }}
          >
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.3)" }}
            >
              <Sparkles size={30} style={{ color: "var(--color-gold-light)" }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-muted)" }}>تم تحصيل ربحك 🎉</p>
            <p className="text-4xl font-black gold-text ticker">+${fmt(popup)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, gold }: { label: string; value: string; gold?: boolean }): React.ReactElement {
  return (
    <div>
      <p className="text-[10px] font-medium mb-0.5" style={{ color: "rgba(212,175,55,0.5)" }}>{label}</p>
      <p className="text-sm font-extrabold ticker" style={{ color: gold ? "var(--color-gold-light)" : "rgba(255,255,255,0.9)" }}>
        {value}
      </p>
    </div>
  );
}
