import React from "react";
import { useEffect, useState, useRef } from "react";
import { Lock, Star } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t } from "../lib/i18n";

type Prize = { label: string; amount: number; isPhysical: boolean };
type Status = { eligible: boolean; spinsAvailable: number; reason: string; prizes: Prize[] };
type Result = { prize: Prize; newBalance: string; spinsRemaining: number };

const PRIZE_META: Record<string, {
  color: string; glow: string; bg: string; textColor: string; img?: string;
}> = {
  "$5":          { color: "#22c55e", glow: "#16a34a", bg: "linear-gradient(145deg,#052e16,#0d3b1f)", textColor: "#4ade80" },
  "$10":         { color: "#3b82f6", glow: "#2563eb", bg: "linear-gradient(145deg,#0c1a2e,#0f2545)", textColor: "#60a5fa" },
  "$20":         { color: "#f59e0b", glow: "#d97706", bg: "linear-gradient(145deg,#1c1200,#2a1b00)", textColor: "#fbbf24" },
  "$50":         { color: "#ef4444", glow: "#dc2626", bg: "linear-gradient(145deg,#2d0a0a,#3d0f0f)", textColor: "#f87171" },
  "$100":        { color: "#a855f7", glow: "#9333ea", bg: "linear-gradient(145deg,#1a0a2e,#250f3d)", textColor: "#c084fc" },
  "iPhone 17 Pro":      { color: "#94a3b8", glow: "#64748b", bg: "linear-gradient(145deg,#0f172a,#1e293b)", textColor: "#e2e8f0", img: "/prizes/iphone.jpg" },
  "رولكس دايتونا":     { color: "#d4af37", glow: "#b8960c", bg: "linear-gradient(145deg,#1c1000,#2a1a00)", textColor: "#f0d77a", img: "/prizes/watch.jpg" },
  "تويوتا كامري":      { color: "#64748b", glow: "#475569", bg: "linear-gradient(145deg,#0f1520,#1a2030)", textColor: "#94a3b8", img: "/prizes/car.jpg" },
};

/* ترتيب الخلايا في الشبكة 3×3 (عكس اتجاه عقارب الساعة):
   [0] [1] [2]
   [7] [-] [3]
   [6] [5] [4]            */
const GRID: number[][] = [
  [0, 1, 2],
  [7, -1, 3],
  [6, 5, 4],
];

/* 18 نقطة ضوئية حول حواف الإطار — مواضع [x%, y%] */
const BORDER_LIGHTS: [number, number][] = [
  [9,2],[25,2],[42,2],[58,2],[75,2],[91,2],       // top
  [98,28],[98,50],[98,72],                         // right
  [91,98],[75,98],[58,98],[42,98],[25,98],[9,98],  // bottom
  [2,72],[2,50],[2,28],                            // left
];

function fmt(n: string | number): string {
  const v = typeof n === "string" ? Number(n) : n;
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function WheelPage(): React.ReactElement {
  const { refresh } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [activePos, setActivePos] = useState<number>(-1);
  const [lightPhase, setLightPhase] = useState(0);
  const [pressed, setPressed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (): Promise<void> => {
    try { setStatus(await api.get<Status>("/wheel/status")); }
    catch { /* ignore */ }
  };

  useEffect(() => { void load(); }, []);

  /* أضواء الحدود — تومض باستمرار */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setLightPhase((p) => (p + 1) % 2);
    }, spinning ? 120 : 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [spinning]);

  const animateTo = (winnerIdx: number, onDone: () => void): void => {
    const total = 8;
    const minSteps = total * 4;
    let step = 0;
    let cur = 0;

    const tick = (): void => {
      setActivePos(cur);
      cur = (cur + 1) % total;
      step++;

      if (step >= minSteps && cur === winnerIdx) {
        setActivePos(winnerIdx);
        setTimeout(() => { setActivePos(-1); onDone(); }, 700);
        return;
      }

      let delay = 55;
      const slowStart = minSteps - 14;
      if (step > slowStart) {
        delay = 55 + (step - slowStart) * 38;
      }
      setTimeout(tick, Math.min(delay, 600));
    };
    tick();
  };

  const spin = async (): Promise<void> => {
    if (!status || spinning || status.spinsAvailable < 1) return;
    setSpinning(true);
    setResult(null);
    try {
      const r = await api.post<Result>("/wheel/spin");
      const winnerIdx = status.prizes.findIndex((p) => p.label === r.prize.label);
      animateTo(winnerIdx < 0 ? 0 : winnerIdx, async () => {
        setResult(r);
        setSpinning(false);
        await Promise.all([load(), refresh()]);
      });
    } catch {
      setActivePos(-1);
      setSpinning(false);
    }
  };

  if (!status) {
    return (
      <div className="p-5 space-y-4">
        <div className="shimmer h-8 w-44 rounded-xl mx-auto" />
        <div className="shimmer rounded-3xl mx-auto" style={{ width: 300, height: 300 }} />
      </div>
    );
  }

  const prizes = status.prizes;

  return (
    <div
      className="min-h-screen flex flex-col items-center pt-5 pb-10 select-none"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, #1a1000 0%, #080810 60%)" }}
    >
      {/* ── Header ── */}
      <p className="text-[11px] font-bold mb-1 tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.5)" }}>
        ✦ Gold Investment ✦
      </p>
      <h1 className="text-3xl font-black mb-1" style={{
        background: "linear-gradient(180deg, #f0d77a 0%, #d4af37 50%, #a07c1a 100%)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
        {t("spin_wheel")}
      </h1>
      <div className="flex items-center gap-2 mb-6">
        <Star size={11} fill="#d4af37" stroke="none" />
        <span className="text-xs font-extrabold" style={{ color: "#d4af37" }}>
          {status.spinsAvailable} {t("spins_available")}
        </span>
        <Star size={11} fill="#d4af37" stroke="none" />
      </div>

      {/* ── Machine body ── */}
      <div
        className="relative"
        style={{
          width: 310,
          borderRadius: 28,
          padding: "14px",
          background: "linear-gradient(160deg, #1e1a08 0%, #0e0c06 50%, #0a0814 100%)",
          boxShadow: [
            "0 0 0 1px rgba(212,175,55,0.25)",
            "0 0 0 3px rgba(0,0,0,0.8)",
            "0 0 0 4px rgba(212,175,55,0.12)",
            "0 40px 80px -20px rgba(0,0,0,0.9)",
            "0 0 60px -10px rgba(212,175,55,0.2)",
          ].join(", "),
        }}
      >
        {/* أضواء الحدود */}
        {BORDER_LIGHTS.map(([x, y], i) => {
          const isOn = spinning
            ? (i % 2) === (lightPhase % 2)
            : (i % 2) === lightPhase;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isOn
                  ? `radial-gradient(circle, #fff 0%, #f0d77a 40%, #d4af37 100%)`
                  : "rgba(80,60,10,0.5)",
                boxShadow: isOn ? "0 0 8px 3px rgba(212,175,55,0.8), 0 0 2px 1px #fff" : "none",
                transition: `all ${spinning ? 0.08 : 0.35}s ease`,
                zIndex: 10,
              }}
            />
          );
        })}

        {/* الشبكة */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 5,
            borderRadius: 18,
            overflow: "hidden",
            position: "relative",
            zIndex: 5,
          }}
        >
          {GRID.flat().map((pos, cellIdx) => {

            /* ── خلية المنتصف (زر الدوران) ── */
            if (pos === -1) {
              return (
                <button
                  key="center"
                  onMouseDown={() => setPressed(true)}
                  onMouseUp={() => setPressed(false)}
                  onTouchStart={() => setPressed(true)}
                  onTouchEnd={() => setPressed(false)}
                  onClick={!spinning ? spin : undefined}
                  disabled={!status.eligible || spinning}
                  style={{
                    aspectRatio: "1",
                    border: "none",
                    borderRadius: 12,
                    cursor: spinning ? "default" : "pointer",
                    background: "linear-gradient(145deg, #f0d77a 0%, #d4af37 40%, #a07c1a 70%, #c9980e 100%)",
                    boxShadow: pressed
                      ? "0 1px 3px rgba(0,0,0,0.8), inset 0 2px 8px rgba(0,0,0,0.4)"
                      : "0 6px 20px rgba(0,0,0,0.6), 0 0 20px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.35)",
                    transform: pressed ? "scale(0.95) translateY(2px)" : "scale(1)",
                    transition: "all 0.1s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  {spinning ? (
                    <>
                      <div style={{
                        width: 20, height: 20,
                        border: "3px solid rgba(10,10,12,0.6)",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "wh-spin 0.5s linear infinite",
                      }} />
                      <span style={{ fontSize: 8, fontWeight: 900, color: "rgba(10,10,12,0.7)" }}>يدور</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 22 }}>🎰</span>
                      <span style={{ fontSize: 9, fontWeight: 900, color: "rgba(10,10,12,0.8)", letterSpacing: 1 }}>أدر</span>
                    </>
                  )}
                </button>
              );
            }

            const prize = prizes[pos];
            if (!prize) return <div key={cellIdx} style={{ aspectRatio: "1", borderRadius: 12, background: "#0a0a10" }} />;

            const meta = PRIZE_META[prize.label] ?? {
              color: "#d4af37", glow: "#a07c1a", bg: "linear-gradient(145deg,#1c1000,#0a0a0c)",
              textColor: "#f0d77a",
            };
            const isActive = activePos === pos;

            return (
              <div
                key={pos}
                style={{
                  aspectRatio: "1",
                  borderRadius: 12,
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  background: meta.bg,
                  border: isActive
                    ? `2px solid ${meta.color}`
                    : "1.5px solid rgba(255,255,255,0.06)",
                  boxShadow: isActive
                    ? `0 0 24px 8px ${meta.glow}90, inset 0 0 20px ${meta.glow}30`
                    : "inset 0 1px 0 rgba(255,255,255,0.06)",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.07s ease",
                  zIndex: 1,
                }}
              >
                {/* وميض تنشيط */}
                {isActive && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `radial-gradient(circle at 50% 40%, ${meta.glow}50 0%, transparent 65%)`,
                    borderRadius: 10,
                    animation: "wh-flash 0.1s ease-out",
                  }} />
                )}

                {/* بريق زجاجي علوي */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: "45%",
                  borderRadius: "10px 10px 50% 50%",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)",
                  pointerEvents: "none",
                }} />

                {/* الصورة أو القيمة */}
                {meta.img ? (
                  <img
                    src={meta.img}
                    alt={prize.label}
                    style={{
                      width: "70%", height: "55%",
                      objectFit: "cover", borderRadius: 7,
                      filter: isActive
                        ? `brightness(1.25) drop-shadow(0 0 6px ${meta.glow})`
                        : "brightness(0.9)",
                    }}
                  />
                ) : (
                  <span style={{
                    fontSize: prize.label.startsWith("$") ? 18 : 15,
                    fontWeight: 900,
                    color: isActive ? "#fff" : meta.textColor,
                    textShadow: isActive ? `0 0 10px ${meta.glow}, 0 0 20px ${meta.color}` : "none",
                    letterSpacing: -0.5,
                    lineHeight: 1,
                  }}>
                    {prize.label}
                  </span>
                )}

                {/* الاسم */}
                <span style={{
                  fontSize: meta.img ? 8 : 7,
                  fontWeight: 800,
                  color: isActive ? "#fff" : `${meta.textColor}cc`,
                  textAlign: "center",
                  paddingInline: 3,
                  lineHeight: 1.2,
                  textShadow: isActive ? `0 0 8px ${meta.glow}` : "none",
                }}>
                  {prize.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── مستوى الأرباح (مؤشر بصري) ── */}
      <div className="flex items-center gap-3 mt-5">
        {["$5","$10","$20","$50","$100"].map((lbl) => {
          const m = PRIZE_META[lbl];
          return (
            <div
              key={lbl}
              className="flex flex-col items-center gap-1"
              style={{ opacity: 0.7 }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: m.color,
                boxShadow: `0 0 6px ${m.glow}`,
              }} />
              <span style={{ fontSize: 7, color: m.textColor, fontWeight: 700 }}>{lbl}</span>
            </div>
          );
        })}
      </div>

      {/* ── زر أدر / مقفل ── */}
      <div className="mt-5 w-full px-8">
        {status.eligible ? (
          <button
            onClick={spin}
            disabled={spinning}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 18,
              border: "none",
              cursor: spinning ? "default" : "pointer",
              background: spinning
                ? "linear-gradient(135deg,#6b5c1a,#3d3410)"
                : "linear-gradient(135deg,#f0d77a 0%,#d4af37 45%,#a07c1a 100%)",
              color: "#0a0a0c",
              fontSize: 16,
              fontWeight: 900,
              boxShadow: spinning
                ? "none"
                : "0 8px 24px -4px rgba(212,175,55,0.5), 0 0 0 1px rgba(212,175,55,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              letterSpacing: 0.5,
            }}
          >
            {spinning ? (
              <>
                <div style={{
                  width: 18, height: 18,
                  border: "3px solid rgba(255,255,255,0.3)",
                  borderTopColor: "rgba(255,255,255,0.8)",
                  borderRadius: "50%",
                  animation: "wh-spin 0.5s linear infinite",
                }} />
                جارٍ الدوران…
              </>
            ) : (
              <>🎰 {t("spin_wheel")}</>
            )}
          </button>
        ) : (
          <div
            className="rounded-3xl p-5 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Lock size={24} className="mx-auto mb-2" style={{ color: "var(--color-gold)" }} />
            <p className="font-bold mb-1">{t("wheel_locked")}</p>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              {status.reason || t("wheel_invite")}
            </p>
          </div>
        )}
      </div>

      {/* ── نافذة الفوز ── */}
      {result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
          onClick={() => setResult(null)}
        >
          {/* confetti sparks */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${10 + i * 7}%`,
                top: `${15 + (i % 3) * 20}%`,
                width: 6, height: 6,
                borderRadius: "50%",
                background: ["#f59e0b","#22c55e","#3b82f6","#ef4444","#a855f7","#d4af37"][i % 6],
                animation: `wh-confetti-${i % 3} 1.2s ease-out ${i * 0.08}s both`,
                pointerEvents: "none",
              }}
            />
          ))}

          {(() => {
            const meta = PRIZE_META[result.prize.label] ?? {
              color: "#d4af37", glow: "#a07c1a", bg: "linear-gradient(145deg,#1c1000,#0a0a0c)",
              textColor: "#f0d77a",
            };
            return (
              <div
                className="pop max-w-xs w-full rounded-3xl p-7 text-center relative overflow-hidden"
                style={{
                  background: "linear-gradient(160deg,#18140a 0%,#0e0c14 100%)",
                  border: `1.5px solid ${meta.color}55`,
                  boxShadow: `0 40px 100px -15px ${meta.glow}60, 0 0 0 1px rgba(0,0,0,0.5)`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  position: "absolute", inset: 0,
                  background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${meta.glow}25 0%, transparent 60%)`,
                }} />

                <div
                  className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-4 relative overflow-hidden"
                  style={{
                    background: meta.bg,
                    border: `2px solid ${meta.color}55`,
                    boxShadow: `0 0 32px 8px ${meta.glow}50`,
                  }}
                >
                  {meta.img ? (
                    <img src={meta.img} alt={result.prize.label} style={{ width: "85%", height: "80%", objectFit: "cover", borderRadius: 10 }} />
                  ) : (
                    <span style={{ fontSize: 36, fontWeight: 900, color: meta.textColor }}>
                      {result.prize.label}
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  🎉 مبروك! فزت بـ
                </p>
                <p className="text-2xl font-black mb-2" style={{ color: meta.color }}>
                  {result.prize.label}
                </p>

                {result.prize.isPhysical && (
                  <p className="text-xs mb-4 leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
                    سيتواصل معك فريق الدعم لتسليم جائزتك
                  </p>
                )}
                {!result.prize.isPhysical && result.prize.amount > 0 && (
                  <p className="text-sm font-bold mb-4" style={{ color: "var(--color-success)" }}>
                    +${fmt(result.prize.amount)} أُضيفت لرصيدك ✓
                  </p>
                )}

                <button
                  onClick={() => setResult(null)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 14,
                    border: "none",
                    background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.glow} 100%)`,
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 15,
                    cursor: "pointer",
                    boxShadow: `0 8px 20px -4px ${meta.glow}80`,
                  }}
                >
                  رائع! 🙌
                </button>
              </div>
            );
          })()}
        </div>
      )}

      <style>{`
        @keyframes wh-spin { to { transform: rotate(360deg); } }
        @keyframes wh-flash {
          0%   { opacity: 0; }
          50%  { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes wh-confetti-0 {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-120px) scale(0); opacity: 0; }
        }
        @keyframes wh-confetti-1 {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100px) translateX(30px) scale(0); opacity: 0; }
        }
        @keyframes wh-confetti-2 {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 1; }
          100% { transform: translateY(-80px) translateX(-30px) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
