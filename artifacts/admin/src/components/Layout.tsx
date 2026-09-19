import React, { ReactNode, useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine,
  LogOut, ExternalLink, Bell, ShieldCheck, Menu, X, Settings,
} from "lucide-react";
import { useAdminAuth } from "../lib/auth";
import { usePending } from "../lib/pending";

export function AdminLayout({ children }: { children: ReactNode }): React.ReactElement {
  const [loc, navigate]     = useLocation();
  const { admin, logout }   = useAdminAuth();
  const { counts }          = usePending();
  const [open, setOpen]     = useState(false);

  const total = counts.pendingDeposits + counts.pendingWithdrawals;

  /* close drawer on route change */
  useEffect(() => { setOpen(false); }, [loc]);

  /* lock body scroll when drawer is open */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const NAV = [
    { path: "/",            icon: LayoutDashboard, label: "لوحة التحكم",  badge: 0 },
    { path: "/users",       icon: Users,            label: "المستخدمون",   badge: 0 },
    { path: "/deposits",    icon: ArrowDownToLine,  label: "الإيداعات",    badge: counts.pendingDeposits },
    { path: "/withdrawals", icon: ArrowUpFromLine,  label: "السحوبات",     badge: counts.pendingWithdrawals },
    { path: "/settings",    icon: Settings,         label: "إعدادات الإيداع", badge: 0 },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Brand */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl gold-bg flex items-center justify-center shrink-0"
              style={{ boxShadow: "0 4px 16px rgba(212,175,55,0.3)" }}
            >
              <ShieldCheck size={18} style={{ color: "#080810" }} />
            </div>
            <div>
              <p className="gold-text font-extrabold text-[15px] leading-none">Admin</p>
              <p className="text-[10px] font-medium" style={{ color: "var(--color-muted)" }}>لوحة الإدارة</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-2 rounded-xl"
            style={{ color: "var(--color-muted)", background: "var(--color-surface-3)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Alert pill */}
        {total > 0 && (
          <button
            onClick={() => navigate(counts.pendingDeposits > 0 ? "/deposits" : "/withdrawals")}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              color: "var(--color-warning)",
            }}
          >
            <Bell size={12} className="shrink-0 animate-pulse" />
            <span className="flex-1 text-start">{total} طلب بانتظار المراجعة</span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
              style={{ background: "var(--color-warning)", color: "#080810" }}
            >
              {total}
            </span>
          </button>
        )}
      </div>

      <div className="divider mx-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p
          className="text-[10px] font-extrabold px-3 pt-1 pb-2.5 uppercase tracking-widest"
          style={{ color: "var(--color-muted)" }}
        >
          القائمة الرئيسية
        </p>
        {NAV.map((item) => {
          const Icon   = item.icon;
          const active = item.path === "/" ? loc === "/" : loc.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold transition-all"
              style={active ? {
                background: "rgba(212,175,55,0.12)",
                color: "var(--color-gold-light)",
                borderRight: "3px solid var(--color-gold)",
              } : {
                color: "var(--color-muted-2)",
              }}
            >
              <Icon size={17} className="shrink-0" style={active ? { color: "var(--color-gold)" } : undefined} />
              <span className="flex-1 text-start">{item.label}</span>
              {item.badge > 0 && (
                <span
                  className="nav-badge"
                  style={active ? { background: "var(--color-gold)", color: "#080810" } : undefined}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="divider mx-4" />

      {/* Footer */}
      <div className="p-3 space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] transition"
          style={{ color: "var(--color-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-3)")}
          onMouseLeave={e => (e.currentTarget.style.background = "")}
        >
          <ExternalLink size={13} />
          <span>عرض تطبيق المستخدمين</span>
        </a>

        {/* Admin card */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-1"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
        >
          <div
            className="w-8 h-8 rounded-xl gold-bg flex items-center justify-center text-[13px] font-extrabold shrink-0"
            style={{ color: "#080810" }}
          >
            {admin?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold truncate">{admin?.username}</p>
            <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>مسؤول النظام</p>
          </div>
          <button
            onClick={async () => { await logout(); navigate("/login"); }}
            title="تسجيل الخروج"
            className="p-1.5 rounded-lg transition"
            style={{ color: "var(--color-muted)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted)";
              (e.currentTarget as HTMLButtonElement).style.background = "";
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "var(--color-bg)" }}>

      {/* ── Sidebar — desktop (always visible) ── */}
      <aside
        className="hidden lg:flex shrink-0 flex-col"
        style={{
          width: "var(--sidebar-w)",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Sidebar — mobile (drawer overlay) ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
            onClick={() => setOpen(false)}
          />
          {/* Drawer panel */}
          <aside
            className="fixed inset-y-0 right-0 z-50 flex flex-col lg:hidden"
            style={{
              width: "min(80vw, 280px)",
              background: "var(--color-surface)",
              borderLeft: "1px solid var(--color-border)",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
            }}
          >
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header
          className="shrink-0 flex items-center gap-3 px-4 lg:px-7"
          style={{
            height: "var(--header-h)",
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-2 rounded-xl transition"
            style={{
              color: "var(--color-muted-2)",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Menu size={18} />
          </button>

          {/* Date */}
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-bold uppercase tracking-widest truncate"
              style={{ color: "var(--color-muted)" }}
            >
              {new Date().toLocaleDateString("ar-EG", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </div>

          {/* Pending alert */}
          {total > 0 && (
            <button
              onClick={() => navigate(counts.pendingDeposits > 0 ? "/deposits" : "/withdrawals")}
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl transition shrink-0"
              style={{
                color: "var(--color-warning)",
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.22)",
              }}
            >
              <Bell size={12} className="animate-pulse" />
              <span className="hidden sm:inline">{total} طلب</span>
              <span className="sm:hidden">{total}</span>
            </button>
          )}

          {/* Online indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold shrink-0"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.18)",
              color: "var(--color-success)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
            <span className="hidden sm:inline">متصل</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
