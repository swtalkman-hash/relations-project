import React from "react";
import { useLocation } from "wouter";
import {
  Shield, FileText, ChevronLeft, BadgeCheck, Globe,
  Calendar, Building2, Phone, Mail, ExternalLink,
  Lock, CheckCircle2, AlertCircle,
} from "lucide-react";

const LICENSE_INFO = [
  { label: "رقم الترخيص",       value: "SI-2024-07831",    icon: FileText,   color: "#d4af37" },
  { label: "جهة الإصدار",       value: "هيئة الأسواق المالية الدولية", icon: Building2, color: "#3b82f6" },
  { label: "تاريخ الإصدار",     value: "28 مايو 2026",     icon: Calendar,   color: "#22c55e" },
  { label: "تاريخ الانتهاء",    value: "28 مايو 2029",     icon: Calendar,   color: "#f59e0b" },
  { label: "نطاق الترخيص",      value: "خدمات الاستثمار الرقمي والذهب", icon: Globe, color: "#a78bfa" },
  { label: "حالة الترخيص",      value: "نشط ✓",            icon: BadgeCheck, color: "#22c55e" },
];

const PLATFORM_INFO = [
  {
    icon: Shield,
    color: "#d4af37",
    title: "الأمان والحماية",
    desc: "تعتمد المنصة على تقنية بلوكتشين USDT لضمان أمان جميع المعاملات المالية وشفافيتها الكاملة.",
  },
  {
    icon: Lock,
    color: "#3b82f6",
    title: "تشفير البيانات",
    desc: "جميع بيانات المستخدمين محمية بتشفير من الدرجة العسكرية SSL/TLS 256-bit.",
  },
  {
    icon: Globe,
    color: "#22c55e",
    title: "الانتشار الجغرافي",
    desc: "تخدم المنصة أكثر من 15 دولة حول العالم مع دعم متعدد العملات والشبكات.",
  },
  {
    icon: Building2,
    color: "#a78bfa",
    title: "الشركة المشغّلة",
    desc: "Safe Investment Group Ltd — شركة مرخصة ومسجلة وفق أنظمة الأسواق المالية الدولية.",
  },
];

const COMPLIANCE = [
  "الامتثال الكامل لمعايير مكافحة غسيل الأموال (AML)",
  "التحقق من هوية المستخدمين وفق معايير KYC",
  "التقارير الدورية للجهات التنظيمية",
  "سياسة حماية بيانات المستخدم (GDPR)",
  "نظام حماية الأموال وفصلها عن أموال الشركة",
];

function OfficialStamp(): React.ReactElement {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="stampGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5e070" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      {/* Outer gear ring */}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const x1 = 60 + 55 * Math.cos(rad);
        const y1 = 60 + 55 * Math.sin(rad);
        const x2 = 60 + 47 * Math.cos(rad);
        const y2 = 60 + 47 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#stampGold)" strokeWidth="3.5" strokeLinecap="round" />;
      })}
      {/* Outer circle */}
      <circle cx="60" cy="60" r="48" stroke="url(#stampGold)" strokeWidth="2" fill="none" />
      {/* Inner circle */}
      <circle cx="60" cy="60" r="38" stroke="url(#stampGold)" strokeWidth="1.2" fill="none" strokeDasharray="3 2" />
      {/* Shield center */}
      <path
        d="M60 28 L78 36 L78 54 C78 66 70 74 60 78 C50 74 42 66 42 54 L42 36 Z"
        fill="url(#stampGold)"
        opacity="0.18"
        stroke="url(#stampGold)"
        strokeWidth="1.5"
      />
      {/* Check mark */}
      <path d="M51 54 L57 61 L70 46" stroke="url(#stampGold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Stars */}
      {[0, 1, 2].map((i) => {
        const cx = 44 + i * 16;
        return (
          <text key={i} x={cx} y="88" textAnchor="middle" fontSize="8" fill="url(#stampGold)">★</text>
        );
      })}
      {/* CERTIFIED text arc */}
      <path id="topArc" d="M 18,60 A 42,42 0 0,1 102,60" fill="none" />
      <text fontSize="7.5" fontWeight="bold" fontFamily="serif" letterSpacing="2" fill="#d4af37">
        <textPath href="#topArc" startOffset="10%">CERTIFIED · LICENSED</textPath>
      </text>
      {/* 2026 at bottom */}
      <text x="60" y="96" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="serif" fill="#d4af37" letterSpacing="2">2026</text>
    </svg>
  );
}

function CertificateCard(): React.ReactElement {
  return (
    <div
      className="rounded-3xl overflow-hidden relative"
      style={{
        background: "linear-gradient(160deg, #faf7ee 0%, #f5edd8 40%, #ede0c4 100%)",
        border: "3px solid #c9a84c",
        boxShadow: "0 8px 40px rgba(180,140,30,0.25), inset 0 0 60px rgba(212,175,55,0.06)",
      }}
    >
      {/* Corner ornaments */}
      {[
        { top: 8, left: 8, rotate: 0 },
        { top: 8, right: 8, rotate: 90 },
        { bottom: 8, right: 8, rotate: 180 },
        { bottom: 8, left: 8, rotate: 270 },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute w-8 h-8 pointer-events-none"
          style={{ ...pos, opacity: 0.7 }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M2 2 L12 2 L2 12" stroke="#b8860b" strokeWidth="2" fill="none" />
            <path d="M2 2 L2 8" stroke="#b8860b" strokeWidth="1.2" fill="none" />
            <path d="M2 2 L8 2" stroke="#b8860b" strokeWidth="1.2" fill="none" />
            <circle cx="2" cy="2" r="2" fill="#d4af37" />
          </svg>
        </div>
      ))}

      {/* Top border line */}
      <div style={{ height: 3, background: "linear-gradient(to right, transparent, #c9a84c, #f5e070, #c9a84c, transparent)" }} />

      <div className="px-6 py-7 text-center" dir="ltr">
        {/* Header */}
        <p className="text-[10px] font-bold tracking-[4px] uppercase mb-1" style={{ color: "#8b6914" }}>
          International Financial Markets Authority
        </p>
        <div style={{ height: 1, background: "linear-gradient(to right, transparent, #c9a84c, transparent)", margin: "8px 0" }} />
        <h2
          className="font-extrabold mb-1"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 20,
            color: "#5a3e00",
            letterSpacing: 1,
          }}
        >
          Certificate of License
        </h2>
        <p className="text-[11px] mb-5" style={{ color: "#8b6914", letterSpacing: 1 }}>
          DIGITAL INVESTMENT SERVICES
        </p>

        {/* Stamp centered */}
        <div className="flex justify-center mb-5">
          <OfficialStamp />
        </div>

        {/* This certifies */}
        <p className="text-[11px] italic mb-1" style={{ color: "#6b4c10", fontFamily: "Georgia, serif" }}>
          This is to certify that
        </p>
        <p
          className="font-extrabold mb-1"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 18,
            color: "#3a2800",
            letterSpacing: 0.5,
          }}
        >
          Safe Investment Group Ltd.
        </p>
        <p className="text-[11px] italic mb-5" style={{ color: "#6b4c10", fontFamily: "Georgia, serif" }}>
          is duly authorized to operate as a licensed digital investment platform
        </p>

        {/* License details grid */}
        <div className="grid grid-cols-2 gap-2 mb-5 text-left">
          {[
            { label: "License No.", value: "SI-2024-07831" },
            { label: "Status",      value: "✓ Active" },
            { label: "Issued",      value: "28 May 2026" },
            { label: "Expires",     value: "28 May 2029" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="px-3 py-2 rounded-xl"
              style={{ background: "rgba(180,130,20,0.08)", border: "1px solid rgba(180,130,20,0.2)" }}
            >
              <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#a07820" }}>{label}</p>
              <p className="text-[12px] font-extrabold" style={{ color: value.includes("✓") ? "#166534" : "#3a2800", fontFamily: "monospace" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "linear-gradient(to right, transparent, #c9a84c, transparent)", margin: "0 0 16px 0" }} />

        {/* Signature row */}
        <div className="flex items-end justify-between px-4">
          <div className="text-left">
            <div
              className="mb-1"
              style={{
                fontFamily: "'Brush Script MT', cursive, Georgia, serif",
                fontSize: 22,
                color: "#1e3a8a",
                lineHeight: 1,
                letterSpacing: -0.5,
              }}
            >
              James R. Collins
            </div>
            <div style={{ height: 1, background: "#8b6914", width: 110, marginBottom: 4 }} />
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#8b6914" }}>Director General</p>
            <p className="text-[8px]" style={{ color: "#a07820" }}>IFMA · Regulatory Division</p>
          </div>

          {/* Official Seal text */}
          <div
            className="w-16 h-16 rounded-full flex flex-col items-center justify-center"
            style={{
              border: "2px dashed #c9a84c",
              background: "rgba(212,175,55,0.07)",
            }}
          >
            <p className="text-[7px] font-extrabold uppercase tracking-wider text-center leading-tight" style={{ color: "#8b6914" }}>
              Official<br />Seal
            </p>
          </div>
        </div>
      </div>

      {/* Bottom border line */}
      <div style={{ height: 3, background: "linear-gradient(to right, transparent, #c9a84c, #f5e070, #c9a84c, transparent)" }} />
    </div>
  );
}

export function TasksPage(): React.ReactElement {
  const [, navigate] = useLocation();

  return (
    <div className="px-4 pt-5 pb-8 space-y-6">

      {/* ── الرأس ── */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/")} className="text-[var(--color-muted)]">
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold">ترخيص المنصة</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>معلومات الترخيص والشفافية</p>
        </div>
      </div>

      {/* ── شهادة الترخيص الرسمية (إنجليزي) ── */}
      <CertificateCard />

      {/* ── بطاقة الترخيص الرئيسية ── */}
      <div
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f1a0a 0%, #0a120f 50%, #080810 100%)",
          border: "1px solid rgba(212,175,55,0.35)",
          boxShadow: "0 8px 32px rgba(212,175,55,0.12)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.35)", boxShadow: "0 4px 16px rgba(212,175,55,0.25)" }}
            >
              <Shield size={26} style={{ color: "var(--color-gold)" }} />
            </div>
            <div>
              <h2 className="font-extrabold text-lg gold-text">وثيقة الترخيص الرسمية</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
                <span className="text-[11px] font-bold" style={{ color: "#22c55e" }}>ساري ومفعّل</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {LICENSE_INFO.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                  >
                    <Icon size={13} style={{ color }} />
                  </div>
                  <span className="text-[12px] font-semibold" style={{ color: "var(--color-muted)" }}>{label}</span>
                </div>
                <span
                  className="text-[12px] font-extrabold"
                  style={{ color: label === "حالة الترخيص" ? "#22c55e" : "var(--color-text)" }}
                  dir="ltr"
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div
            className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <CheckCircle2 size={15} style={{ color: "#22c55e" }} />
            <span className="text-[11px] font-bold" style={{ color: "#22c55e" }}>
              هذه الوثيقة قابلة للتحقق لدى الجهات التنظيمية المختصة
            </span>
          </div>
        </div>
      </div>

      {/* ── معلومات المنصة ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={15} style={{ color: "var(--color-gold)" }} />
          <h3 className="font-extrabold text-base">معلومات عن المنصة</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {PLATFORM_INFO.map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl p-4"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${color}12`, border: `1px solid ${color}25` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
              <p className="font-bold text-sm mb-1">{title}</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-muted)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── الامتثال التنظيمي ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BadgeCheck size={16} style={{ color: "var(--color-gold)" }} />
          <h3 className="font-extrabold text-sm">الامتثال التنظيمي</h3>
        </div>
        <div className="space-y-2.5">
          {COMPLIANCE.map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: "#22c55e" }} />
              <span className="text-[12px] leading-snug" style={{ color: "var(--color-muted)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── تحذير مهم ── */}
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        <AlertCircle size={17} className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
        <div>
          <p className="font-bold text-[12px] mb-1" style={{ color: "#f59e0b" }}>إخلاء مسؤولية</p>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
            الاستثمار ينطوي على مخاطر. العوائد الماضية لا تضمن نتائج مستقبلية. استثمر فقط ما تستطيع تحمّل خسارته.
          </p>
        </div>
      </div>

      {/* ── التواصل ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <p className="font-extrabold text-sm mb-3">التواصل الرسمي</p>
        <div className="space-y-2.5">
          <a
            href="https://t.me/Dhfddgg"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl transition-all active:scale-95"
            style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}
          >
            <Phone size={14} style={{ color: "#06b6d4" }} />
            <span className="text-[12px] font-semibold flex-1">تيليغرام الدعم الفني</span>
            <ExternalLink size={12} style={{ color: "var(--color-muted)" }} />
          </a>
          <div
            className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
          >
            <Mail size={14} style={{ color: "var(--color-gold)" }} />
            <span className="text-[12px] font-semibold" dir="ltr">support@safeinvestment.io</span>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px]" style={{ color: "var(--color-muted)" }}>
        © 2024 Safe Investment Group Ltd · جميع الحقوق محفوظة
      </p>
    </div>
  );
}
