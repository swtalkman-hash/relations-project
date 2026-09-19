import React from "react";
import { useEffect, useState } from "react";
import { Sparkles, Clock, ArrowDownToLine, CheckCircle2, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

type Level = {
  level: number;
  name: string;
  minAmount: number;
  dailyMinRate: number;
  dailyMaxRate: number;
};

type Dashboard = {
  activeInvestment: {
    id: string; level: number;
    dailyMinRate: string; dailyMaxRate: string;
    lastCollectedAt: string | null;
  } | null;
  canCollect: boolean;
  nextCollectAt: string | null;
  todayEarnings: string;
  user: { balance: string; totalEarned: string };
};


const LEVEL_META: Record<number, { color: string; bg: string; border: string; label: string; emoji: string }> = {
  1: { color: "#cd7f32", bg: "rgba(205,127,50,0.10)", border: "rgba(205,127,50,0.25)", label: "برونزي", emoji: "🥉" },
  2: { color: "#a8a9ad", bg: "rgba(168,169,173,0.10)", border: "rgba(168,169,173,0.20)", label: "فضي",   emoji: "🥈" },
  3: { color: "#d4af37", bg: "rgba(212,175,55,0.12)",  border: "rgba(212,175,55,0.28)", label: "ذهبي",  emoji: "🥇" },
};

function fmt(n: string | number): string {
  const v = typeof n === "string" ? Number(n) : n;
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCountdown(target: string): string {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function InvestPage(): React.ReactElement {
  const { user, refresh } = useAuth();
  const [, navigate] = useLocation();
  const [levels, setLevels] = useState<Level[]>([]);
  const [data, setData] = useState<Dashboard | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = async (): Promise<void> => {
    const [lvls, dash] = await Promise.all([
      api.get<Level[]>("/investments/levels"),
      api.get<Dashboard>("/me/dashboard"),
    ]);
    setLevels(lvls);
    setData(dash);
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const collect = async (): Promise<void> => {
    setCollecting(true);
    try {
      const r = await api.post<{ collected: string }>("/investments/collect");
      setPopup(r.collected);
      setTimeout(() => setPopup(null), 2800);
      await Promise.all([load(), refresh()]);
    } catch { /* ignore */ }
    finally { setCollecting(false); }
  };

  void tick;
  const balance = Number(user?.balance ?? 0);

  // أعلى مستوى يؤهّل له الرصيد
  const qualifiedLevel = levels.reduce<Level | null>((best, lvl) => {
    if (balance >= lvl.minAmount) return lvl;
    return best;
  }, null);

  const meta = qualifiedLevel ? LEVEL_META[qualifiedLevel.level] : null;
  const inv = data?.activeInvestment ?? null;

  // ── حالة: رصيد أقل من الحد ──
  if (!qualifiedLevel) {
    return (
      <div className="px-4 pt-6 pb-8 flex flex-col items-center text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
          style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.18)" }}
        >
          <Lock size={32} style={{ color: "var(--color-gold)" }} />
        </div>
        <h1 className="text-xl font-extrabold mb-2">أرباحك اليومية</h1>
        <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--color-muted)" }}>
          أودع <span className="font-bold text-white">$3 على الأقل</span> لتبدأ في الحصول على أرباح يومية تلقائية على رصيدك
        </p>
        <button
          onClick={() => navigate("/deposit")}
          className="btn-gold flex items-center gap-2 px-8"
        >
          <ArrowDownToLine size={16} />
          أودع الآن
        </button>

        {/* جدول المستويات */}
        <div className="w-full mt-8 space-y-3">
          <p className="text-xs font-bold text-right mb-2" style={{ color: "var(--color-muted)" }}>مستويات الأرباح</p>
          {levels.map((lvl) => {
            const m = LEVEL_META[lvl.level];
            return (
              <div
                key={lvl.level}
                className="rounded-2xl p-4 flex items-center justify-between"
                style={{ background: m.bg, border: `1.5px solid ${m.border}` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{m.emoji}</span>
                  <div className="text-right">
                    <p className="font-extrabold text-sm" style={{ color: m.color }}>{m.label}</p>
                    <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>من ${lvl.minAmount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-black text-base" style={{ color: m.color }}>
                    {(lvl.dailyMinRate * 100).toFixed(1)}% – {(lvl.dailyMaxRate * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>يومياً</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── حالة: لديه رصيد ──
  return (
    <div className="px-4 pt-5 pb-8 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">أرباحي اليومية</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
          تُضاف أرباحك يومياً على رصيدك البالغ{" "}
          <span className="font-bold text-white">${fmt(balance)}</span>
        </p>
      </div>

      {/* بطاقة المستوى الحالي */}
      <div
        className="rounded-3xl p-5 relative overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${meta!.bg} 0%, var(--color-surface) 100%)`,
          border: `1.5px solid ${meta!.border}`,
          boxShadow: `0 12px 40px -12px ${meta!.color}22`,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{meta!.emoji}</span>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>مستواك الحالي</p>
              <p className="text-lg font-extrabold" style={{ color: meta!.color }}>{meta!.label}</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>ربح يومي</p>
            <p className="text-xl font-black" style={{ color: meta!.color }}>
              {(qualifiedLevel.dailyMinRate * 100).toFixed(1)}%–{(qualifiedLevel.dailyMaxRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* إجمالي الأرباح */}
        <div
          className="grid grid-cols-2 gap-3 pt-4"
          style={{ borderTop: `1px solid ${meta!.color}22` }}
        >
          <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(0,0,0,0.25)" }}>
            <p className="text-[10px] mb-1" style={{ color: "var(--color-muted)" }}>إجمالي الأرباح</p>
            <p className="font-extrabold text-base" style={{ color: meta!.color }}>
              ${fmt(data?.user.totalEarned ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(0,0,0,0.25)" }}>
            <p className="text-[10px] mb-1" style={{ color: "var(--color-muted)" }}>ربح اليوم</p>
            <p className="font-extrabold text-base" style={{ color: "var(--color-success)" }}>
              ${fmt(data?.todayEarnings ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* ── زر الجمع أو العداد ── */}
      {data?.canCollect || !inv ? (
        <button
          onClick={collect}
          disabled={collecting}
          className="btn-gold w-full flex items-center justify-center gap-2 text-base pulse-glow"
        >
          <Sparkles size={19} />
          {collecting ? "جارٍ الجمع…" : "اجمع أرباحك الآن"}
        </button>
      ) : (
        <div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2" style={{ color: "var(--color-muted)" }}>
            <Clock size={15} />
            <span className="text-sm font-semibold">الجمع القادم</span>
          </div>
          <span className="font-mono font-extrabold text-lg" style={{ color: "var(--color-gold-light)" }} dir="ltr">
            {data?.nextCollectAt ? formatCountdown(data.nextCollectAt) : "--:--:--"}
          </span>
        </div>
      )}

      {/* معلومة */}
      <div
        className="flex items-start gap-2.5 rounded-2xl p-4"
        style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}
      >
        <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: "var(--color-success)" }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
          رصيدك <span className="font-bold text-white">${fmt(balance)}</span> يبقى في حسابك كاملاً — الأرباح تُضاف فوقه يومياً بمجرد أن تضغط على زر الجمع
        </p>
      </div>

      {/* ── قائمة المستويات ── */}
      <p className="text-xs font-bold pt-1" style={{ color: "var(--color-muted)" }}>مستويات الأرباح</p>
      <div className="space-y-2">
        {levels.map((lvl) => {
          const m = LEVEL_META[lvl.level];
          const isActive = qualifiedLevel.level === lvl.level;
          const isLocked = balance < lvl.minAmount;
          return (
            <div
              key={lvl.level}
              className="rounded-2xl p-3.5 flex items-center justify-between"
              style={{
                background: isActive ? m.bg : "var(--color-surface)",
                border: `1.5px solid ${isActive ? m.color + "55" : "var(--color-border)"}`,
                opacity: isLocked ? 0.5 : 1,
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{m.emoji}</span>
                <div>
                  <p className="font-extrabold text-sm" style={{ color: isActive ? m.color : "var(--color-text)" }}>
                    {m.label} {isActive && "✓"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                    من ${lvl.minAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="font-black text-sm" style={{ color: m.color }}>
                {(lvl.dailyMinRate * 100).toFixed(1)}%–{(lvl.dailyMaxRate * 100).toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>

      {/* Popup */}
      {popup !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className="pop rounded-3xl px-10 py-8 text-center"
            style={{
              background: "linear-gradient(145deg, #1e1a08 0%, #111118 100%)",
              border: "1px solid rgba(212,175,55,0.35)",
              boxShadow: "0 32px 80px -10px rgba(212,175,55,0.3)",
            }}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "rgba(212,175,55,0.15)" }}>
              <Sparkles size={30} style={{ color: "var(--color-gold-light)" }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-muted)" }}>تم تحصيل ربحك 🎉</p>
            <p className="text-4xl font-black gold-text">+${fmt(popup)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
