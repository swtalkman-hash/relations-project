import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Users, ArrowDownToLine, ArrowUpFromLine,
  Wallet, UserPlus, TrendingUp, ArrowLeft, Clock,
  LayoutDashboard, KeyRound,
} from "lucide-react";
import { api } from "../lib/api";
import { fmt, fmtInt } from "../lib/format";

type Stats = {
  totalUsers: number;
  totalDeposited: string;
  totalWithdrawn: string;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalBalance: string;
  recentSignups: number;
};

export function DashboardPage(): React.ReactElement {
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void api.get<Stats>("/admin/stats").then(setStats).catch(() => null);
  }, []);

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-9 w-48" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="shimmer h-[110px]" />)}
        </div>
      </div>
    );
  }

  const net = Number(stats.totalDeposited) - Number(stats.totalWithdrawn);

  return (
    <div className="space-y-7">

      {/* Page header */}
      <div className="page-header">
        <div className="page-header-icon" style={{ background: "rgba(212,175,55,0.12)" }}>
          <LayoutDashboard size={18} style={{ color: "var(--color-gold)" }} />
        </div>
        <div>
          <p className="page-header-title">لوحة التحكم</p>
          <p className="page-header-sub">نظرة عامة على المنصة</p>
        </div>
      </div>

      {/* Alert banners */}
      {(stats.pendingDeposits > 0 || stats.pendingWithdrawals > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {stats.pendingDeposits > 0 && (
            <AlertBanner
              label="إيداعات بانتظار الموافقة"
              count={stats.pendingDeposits}
              onClick={() => navigate("/deposits")}
            />
          )}
          {stats.pendingWithdrawals > 0 && (
            <AlertBanner
              label="سحوبات بانتظار الموافقة"
              count={stats.pendingWithdrawals}
              onClick={() => navigate("/withdrawals")}
            />
          )}
        </div>
      )}

      {/* Primary stats */}
      <section>
        <p className="section-label">المستخدمون والأرصدة</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            strip="gold"
            icon={Users}
            iconColor="var(--color-gold)"
            iconBg="rgba(212,175,55,0.12)"
            label="إجمالي المستخدمين"
            value={fmtInt(stats.totalUsers)}
            sub="مستخدم مسجّل"
            onClick={() => navigate("/users")}
          />
          <StatCard
            strip="info"
            icon={UserPlus}
            iconColor="var(--color-info)"
            iconBg="rgba(59,130,246,0.12)"
            label="تسجيلات جديدة"
            value={fmtInt(stats.recentSignups)}
            sub="آخر 7 أيام"
          />
          <StatCard
            strip="gold"
            icon={Wallet}
            iconColor="var(--color-gold)"
            iconBg="rgba(212,175,55,0.12)"
            label="إجمالي الأرصدة"
            value={`$${fmt(stats.totalBalance)}`}
            sub="رصيد المستخدمين"
          />
          <StatCard
            strip={net >= 0 ? "success" : "danger"}
            icon={TrendingUp}
            iconColor={net >= 0 ? "var(--color-success)" : "var(--color-danger)"}
            iconBg={net >= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)"}
            label="صافي الإيداع"
            value={`$${fmt(Math.abs(net))}`}
            sub="إيداع ناقص سحب"
            valueColor={net >= 0 ? "var(--color-success)" : "var(--color-danger)"}
          />
        </div>
      </section>

      {/* Financial stats */}
      <section>
        <p className="section-label">الإيداعات والسحوبات</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            strip="success"
            icon={ArrowDownToLine}
            iconColor="var(--color-success)"
            iconBg="rgba(34,197,94,0.12)"
            label="الإيداعات المعتمدة"
            value={`$${fmt(stats.totalDeposited)}`}
            sub="إجمالي ما استُلم"
            onClick={() => navigate("/deposits")}
          />
          <StatCard
            strip="warning"
            icon={Clock}
            iconColor="var(--color-warning)"
            iconBg="rgba(245,158,11,0.12)"
            label="إيداعات معلقة"
            value={fmtInt(stats.pendingDeposits)}
            sub={stats.pendingDeposits > 0 ? "تحتاج مراجعة" : "لا توجد معلقة"}
            valueColor={stats.pendingDeposits > 0 ? "var(--color-warning)" : undefined}
            onClick={() => navigate("/deposits")}
          />
          <StatCard
            strip="danger"
            icon={ArrowUpFromLine}
            iconColor="var(--color-danger)"
            iconBg="rgba(239,68,68,0.12)"
            label="السحوبات المعتمدة"
            value={`$${fmt(stats.totalWithdrawn)}`}
            sub="إجمالي ما صُرف"
            onClick={() => navigate("/withdrawals")}
          />
          <StatCard
            strip="warning"
            icon={Clock}
            iconColor="var(--color-warning)"
            iconBg="rgba(245,158,11,0.12)"
            label="سحوبات معلقة"
            value={fmtInt(stats.pendingWithdrawals)}
            sub={stats.pendingWithdrawals > 0 ? "تحتاج مراجعة" : "لا توجد معلقة"}
            valueColor={stats.pendingWithdrawals > 0 ? "var(--color-warning)" : undefined}
            onClick={() => navigate("/withdrawals")}
          />
        </div>
      </section>

      {/* Quick links */}
      <section>
        <p className="section-label">وصول سريع</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <QuickLink
            icon={ArrowDownToLine}
            label="مراجعة طلبات الإيداع"
            desc={stats.pendingDeposits > 0 ? `${stats.pendingDeposits} طلب معلق يحتاج مراجعة` : "لا توجد طلبات معلقة"}
            iconBg="rgba(34,197,94,0.12)"
            iconColor="var(--color-success)"
            urgent={stats.pendingDeposits > 0}
            onClick={() => navigate("/deposits")}
          />
          <QuickLink
            icon={ArrowUpFromLine}
            label="مراجعة طلبات السحب"
            desc={stats.pendingWithdrawals > 0 ? `${stats.pendingWithdrawals} طلب معلق يحتاج مراجعة` : "لا توجد طلبات معلقة"}
            iconBg="rgba(239,68,68,0.12)"
            iconColor="var(--color-danger)"
            urgent={stats.pendingWithdrawals > 0}
            onClick={() => navigate("/withdrawals")}
          />
          <QuickLink
            icon={Users}
            label="إدارة المستخدمين"
            desc={`${fmtInt(stats.totalUsers)} مستخدم مسجّل في المنصة`}
            iconBg="rgba(212,175,55,0.12)"
            iconColor="var(--color-gold)"
            onClick={() => navigate("/users")}
          />
          <QuickLink
            icon={Wallet}
            label="إجمالي الأرصدة"
            desc={`$${fmt(stats.totalBalance)} موزعة على المستخدمين`}
            iconBg="rgba(59,130,246,0.12)"
            iconColor="var(--color-info)"
            onClick={() => navigate("/users")}
          />
          <QuickLink
            icon={KeyRound}
            label="إعداد محفظة الإيداع"
            desc="أدخل كلمات المحفظة لتفعيل العناوين الخاصة لكل عميل"
            iconBg="rgba(168,85,247,0.12)"
            iconColor="#a855f7"
            onClick={() => navigate("/settings")}
          />
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function AlertBanner({ label, count, onClick }: { label: string; count: number; onClick: () => void }): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-2xl text-start transition hover:opacity-90 active:scale-[0.99]"
      style={{
        background: "rgba(245,158,11,0.07)",
        border: "1px solid rgba(245,158,11,0.3)",
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(245,158,11,0.15)" }}
      >
        <Clock style={{ color: "var(--color-warning)" }} size={20} />
      </div>
      <div className="flex-1">
        <p className="text-[13px] font-bold" style={{ color: "var(--color-warning)" }}>{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>اضغط للمراجعة والبت</p>
      </div>
      <p className="text-3xl font-extrabold" style={{ color: "var(--color-warning)" }}>{count}</p>
      <ArrowLeft size={16} style={{ color: "var(--color-warning)" }} className="shrink-0" />
    </button>
  );
}

function StatCard({
  strip, icon: Icon, iconColor, iconBg,
  label, value, sub, valueColor, onClick,
}: {
  strip: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  onClick?: () => void;
}): React.ReactElement {
  const Tag = (onClick ? "button" : "div") as "button";
  return (
    <Tag
      onClick={onClick}
      className={`card stat-strip-${strip} text-start transition`}
      style={onClick ? { cursor: "pointer" } : undefined}
      onMouseEnter={onClick ? (e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.35)") : undefined}
      onMouseLeave={onClick ? (e) => ((e.currentTarget as HTMLElement).style.borderColor = "") : undefined}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: iconBg }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--color-muted)" }}>{label}</p>
      <p
        className="text-[24px] font-extrabold leading-none mb-1.5"
        style={{ color: valueColor ?? "var(--color-text)" }}
      >
        {value}
      </p>
      {sub && <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{sub}</p>}
    </Tag>
  );
}

function QuickLink({
  icon: Icon, label, desc, iconBg, iconColor, urgent, onClick,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  desc: string;
  iconBg: string;
  iconColor: string;
  urgent?: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="card flex items-center gap-4 text-start transition active:scale-[0.99] group"
      style={urgent ? { borderColor: "rgba(245,158,11,0.3)" } : undefined}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-light)")}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = urgent ? "rgba(245,158,11,0.3)" : "")}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[13px]">{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: urgent ? "var(--color-warning)" : "var(--color-muted)" }}>
          {desc}
        </p>
      </div>
      <ArrowLeft
        size={15}
        className="shrink-0 transition-transform group-hover:-translate-x-1"
        style={{ color: "var(--color-muted)" }}
      />
    </button>
  );
}
