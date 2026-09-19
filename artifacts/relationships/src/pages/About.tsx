import React from "react";
import { useLocation } from "wouter";
import {
  Shield, Star, Users, TrendingUp, Zap, Gift,
  MessageCircle, Globe, Award, ChevronLeft,
  Percent, Clock, Coins, BadgeCheck,
} from "lucide-react";
import { t } from "../lib/i18n";

const OFFERS = [
  {
    icon: Gift,
    color: "#d4af37",
    bg: "rgba(212,175,55,0.1)",
    border: "rgba(212,175,55,0.25)",
    title: "هدية ترحيب 3$",
    desc: "احصل على 3 دولارات مجاناً فور إنشاء حسابك بدون أي شرط",
    badge: "فعّال الآن",
    badgeColor: "#22c55e",
  },
  {
    icon: Zap,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    title: "عجلة الحظ المجانية",
    desc: "أودع 125$ أو أكثر في أول إيداع واحصل على لفة عجلة حظ مجانية",
    badge: "محدود",
    badgeColor: "#f59e0b",
  },
  {
    icon: Users,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.25)",
    title: "برنامج الإحالة — 3 مستويات",
    desc: "اربح عمولات يومية من فريقك حتى 3 مستويات — المستوى 1: 10% · 2: 5% · 3: 2%",
    badge: "دائم",
    badgeColor: "#3b82f6",
  },
  {
    icon: Percent,
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.25)",
    title: "خفض رسوم السحب 80%",
    desc: "بعد مضاعفة رأس مالك تنخفض رسوم السحب من 25% إلى 5% فقط",
    badge: "مكافأة وفاء",
    badgeColor: "#22c55e",
  },
];

const LEVELS = [
  { name: "برونز",  min: 30,   max: 299,  daily: "2%",  color: "#cd7f32" },
  { name: "فضي",   min: 300,  max: 999,  daily: "3%",  color: "#a8a9ad" },
  { name: "ذهبي",  min: 1000, max: 4999, daily: "4%",  color: "#d4af37" },
  { name: "بلاتين",min: 5000, max: null, daily: "5%",  color: "#e5e4e2" },
];

const STATS = [
  { icon: Users,   value: "10,000+", label: "مستخدم نشط" },
  { icon: Globe,   value: "15+",     label: "دولة" },
  { icon: Shield,  value: "100%",    label: "أمان وحماية" },
  { icon: Clock,   value: "24/7",    label: "دعم فوري" },
];

const WHY = [
  { icon: BadgeCheck, title: "موثوق وآمن",    desc: "منصة مرخصة تعتمد على بلوكتشين USDT للمعاملات" },
  { icon: Coins,      title: "عوائد يومية",    desc: "أرباح يومية تضاف تلقائياً لرصيدك كل يوم" },
  { icon: TrendingUp, title: "نمو مستمر",      desc: "نظام استثمار متعدد المستويات لتحقيق أقصى ربح" },
  { icon: Award,      title: "برنامج VIP",     desc: "كلما زاد استثمارك زادت مزاياك وانخفضت رسومك" },
];

export function AboutPage(): React.ReactElement {
  const [, navigate] = useLocation();

  return (
    <div className="px-4 pt-5 pb-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => navigate("/")} className="text-[var(--color-muted)]">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-xl font-extrabold">عن Safe investment والعروض</h1>
      </div>

      {/* ── Hero card ── */}
      <div
        className="rounded-3xl p-6 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a1508 0%, #0f0f16 50%, #0a0a0c 100%)",
          border: "1px solid rgba(212,175,55,0.3)",
        }}
      >
        {/* glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10">
          <div
            className="w-20 h-20 mx-auto rounded-3xl gold-bg flex items-center justify-center mb-4 shadow-2xl"
            style={{ boxShadow: "0 8px 32px rgba(212,175,55,0.4)" }}
          >
            <span className="text-3xl font-extrabold" style={{ color: "#080810" }}>G</span>
          </div>
          <h2 className="gold-text text-3xl font-extrabold mb-1">Safe investment</h2>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            منصة الاستثمار الذكي في الذهب والعملات الرقمية
          </p>
          <p className="text-xs mt-3 leading-relaxed max-w-xs mx-auto" style={{ color: "var(--color-muted)" }}>
            Safe investment هي منصة استثمار رقمية متخصصة تُمكّن المستخدمين من تنمية أموالهم من خلال نظام استثمار يومي شفاف وآمن، مع برنامج إحالة فريد من نوعه.
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        {STATS.map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(212,175,55,0.1)" }}
            >
              <Icon size={18} style={{ color: "var(--color-gold)" }} />
            </div>
            <div>
              <p className="font-extrabold text-lg leading-tight gold-text">{value}</p>
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Current Offers ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Star size={16} style={{ color: "var(--color-gold)" }} />
          <h3 className="font-extrabold text-base">العروض الحالية</h3>
        </div>
        <div className="space-y-3">
          {OFFERS.map((offer) => {
            const Icon = offer.icon;
            return (
              <div
                key={offer.title}
                className="rounded-2xl p-4"
                style={{
                  background: offer.bg,
                  border: `1px solid ${offer.border}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${offer.color}18`, border: `1px solid ${offer.color}33` }}
                  >
                    <Icon size={18} style={{ color: offer.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-extrabold text-sm">{offer.title}</p>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: `${offer.badgeColor}20`,
                          color: offer.badgeColor,
                          border: `1px solid ${offer.badgeColor}40`,
                        }}
                      >
                        {offer.badge}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
                      {offer.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Investment Levels ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} style={{ color: "var(--color-gold)" }} />
          <h3 className="font-extrabold text-base">مستويات الاستثمار</h3>
        </div>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          {LEVELS.map((lvl, idx) => (
            <div
              key={lvl.name}
              className="flex items-center justify-between px-4 py-3"
              style={{
                background: idx % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-2)",
                borderBottom: idx < LEVELS.length - 1 ? "1px solid var(--color-border)" : "none",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold"
                  style={{ background: `${lvl.color}18`, color: lvl.color, border: `1px solid ${lvl.color}30` }}
                >
                  {lvl.name[0]}
                </div>
                <div>
                  <p className="font-bold text-sm">{lvl.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                    ${lvl.min.toLocaleString()}{lvl.max ? ` – $${lvl.max.toLocaleString()}` : "+"}
                  </p>
                </div>
              </div>
              <span
                className="text-sm font-extrabold px-3 py-1 rounded-xl"
                style={{ background: `${lvl.color}15`, color: lvl.color }}
              >
                {lvl.daily} يومياً
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Why Ounsa ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} style={{ color: "var(--color-gold)" }} />
          <h3 className="font-extrabold text-base">لماذا Safe investment؟</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {WHY.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl p-4"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "rgba(212,175,55,0.1)" }}
              >
                <Icon size={16} style={{ color: "var(--color-gold)" }} />
              </div>
              <p className="font-bold text-sm mb-1">{title}</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-muted)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Contact ── */}
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <MessageCircle size={28} className="mx-auto mb-2" style={{ color: "var(--color-gold)" }} />
        <p className="font-bold mb-1">تواصل مع فريق الدعم</p>
        <p className="text-xs mb-4" style={{ color: "var(--color-muted)" }}>
          فريق الدعم متاح على مدار الساعة للإجابة على استفساراتك
        </p>
        <a
          href="https://t.me/Dhfddgg"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold inline-flex items-center gap-2"
        >
          <MessageCircle size={15} />
          {t("telegram_support")}
        </a>
      </div>

      {/* ── Footer ── */}
      <p className="text-center text-xs" style={{ color: "var(--color-muted)" }}>
        © 2025 Safe investment · جميع الحقوق محفوظة
      </p>
    </div>
  );
}
