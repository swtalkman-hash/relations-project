import React, { useState } from "react";
import { useLocation } from "wouter";
import { ReactNode } from "react";
import { Home, TrendingUp, Gift, Users, User, Info, Moon, Sun, Download, X } from "lucide-react";
import { t } from "../lib/i18n";
import { SupportButton } from "./SupportButton";
import { useTheme } from "../lib/theme";
import { useInstallPrompt } from "../lib/useInstallPrompt";

const TABS = [
  { path: "/",        icon: Home,        key: "home",   color: "#d4af37" },
  { path: "/invest",  icon: TrendingUp,  key: "invest", color: "#22c55e" },
  { path: "/wheel",   icon: Gift,        key: "wheel",  color: "#f59e0b" },
  { path: "/team",    icon: Users,       key: "team",   color: "#3b82f6" },
  { path: "/about",   icon: Info,        key: "about",  color: "#a78bfa" },
  { path: "/profile", icon: User,        key: "profile",color: "#f472b6" },
];

export function Layout({ children }: { children: ReactNode }): React.ReactElement {
  const [loc, navigate] = useLocation();
  const { theme, toggle } = useTheme();
  const { canInstall, install } = useInstallPrompt();
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    localStorage.getItem("install_banner_dismissed") === "1"
  );

  const showBanner = canInstall && !bannerDismissed;

  const dismissBanner = (): void => {
    localStorage.setItem("install_banner_dismissed", "1");
    setBannerDismissed(true);
  };

  return (
    <div className="min-h-full pb-[76px]">
      {/* ── بانر تثبيت التطبيق ── */}
      {showBanner && (
        <div
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5"
          style={{
            background: "linear-gradient(135deg, #1a1400 0%, #100e00 100%)",
            borderBottom: "1px solid rgba(212,175,55,0.3)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)" }}
          >
            <Download size={16} style={{ color: "var(--color-gold)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-extrabold" style={{ color: "#e8d062" }}>ثبّت التطبيق</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>أضفه للشاشة الرئيسية للوصول الفوري</p>
          </div>
          <button
            onClick={async () => {
              const r = await install();
              if (r === "accepted") dismissBanner();
            }}
            className="shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-extrabold transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg,#d4af37,#a07c1a)", color: "#080810" }}
          >
            تثبيت
          </button>
          <button
            onClick={dismissBanner}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="max-w-md mx-auto">{children}</div>
      <SupportButton />

      {/* زر تبديل الوضع */}
      <button
        onClick={toggle}
        aria-label={theme === "dark" ? "وضع نهاري" : "وضع ليلي"}
        style={{
          position: "fixed",
          top: 14,
          left: 14,
          zIndex: 50,
          width: 38,
          height: 38,
          borderRadius: 13,
          border: "1px solid rgba(212,175,55,0.2)",
          background: "var(--color-surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
          transition: "background 0.25s, border-color 0.25s, transform 0.15s",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.88)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.88)")}
        onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {theme === "dark" ? (
          <Sun size={16} color="#f0d77a" strokeWidth={2.3} />
        ) : (
          <Moon size={16} color="#d4af37" strokeWidth={2.3} />
        )}
      </button>

      {/* شريط التنقل السفلي */}
      <nav className="fixed bottom-0 left-0 right-0 tab-bar z-40">
        <div
          className="max-w-md mx-auto flex justify-around px-1 pt-1.5"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active =
              tab.path === "/" ? loc === "/" : loc === tab.path || loc.startsWith(tab.path + "/");

            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex-1 flex flex-col items-center gap-0.5 py-1.5 relative transition-all duration-200 active:scale-90"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {/* خلفية الزر النشط */}
                {active && (
                  <div
                    className="absolute top-0.5 left-1/2 -translate-x-1/2 rounded-2xl"
                    style={{
                      width: 42,
                      height: 36,
                      background: `linear-gradient(160deg, ${tab.color}22, ${tab.color}0a)`,
                      border: `1px solid ${tab.color}30`,
                    }}
                  />
                )}

                {/* نقطة مؤشر */}
                {active && (
                  <div
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      width: 22,
                      height: 3,
                      background: `linear-gradient(to right, transparent, ${tab.color}, transparent)`,
                      boxShadow: `0 0 8px ${tab.color}`,
                    }}
                  />
                )}

                <div className="relative z-10 mt-1">
                  <Icon
                    size={active ? 21 : 20}
                    style={{
                      color: active ? tab.color : "var(--color-muted)",
                      transition: "color 0.2s, filter 0.2s",
                      filter: active ? `drop-shadow(0 0 6px ${tab.color}90)` : "none",
                    }}
                  />
                </div>
                <span
                  className="relative z-10 text-[9.5px] font-bold transition-all duration-200"
                  style={{ color: active ? tab.color : "var(--color-muted)" }}
                >
                  {t(tab.key)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
