import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Search, ChevronLeft, ArrowDownUp, Users } from "lucide-react";
import { api } from "../lib/api";
import { fmt, fmtDate } from "../lib/format";

type User = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  countryCode: string | null;
  balance: string;
  totalInvested: string;
  totalEarned: string;
  totalWithdrawn: string;
  qualifiedReferralCount: number;
  referralCode: string;
  referredBy: string | null;
  createdAt: string;
};

type SortKey = "name" | "balance" | "totalInvested" | "createdAt";

export function UsersPage(): React.ReactElement {
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<User[] | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [asc, setAsc] = useState(false);

  useEffect(() => {
    void api.get<User[]>("/admin/users").then(setUsers).catch(() => setUsers([]));
  }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    let list = [...users];
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(s) ||
          (u.phone ?? "").includes(s) ||
          (u.email ?? "").toLowerCase().includes(s) ||
          u.referralCode.toLowerCase().includes(s),
      );
    }
    list.sort((a, b) => {
      let va: string | number = a[sort];
      let vb: string | number = b[sort];
      if (sort === "balance" || sort === "totalInvested") {
        va = Number(va); vb = Number(vb);
        return asc ? (va as number) - (vb as number) : (vb as number) - (va as number);
      }
      return asc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return list;
  }, [users, q, sort, asc]);

  const toggleSort = (k: SortKey): void => {
    if (sort === k) setAsc((v) => !v);
    else { setSort(k); setAsc(false); }
  };

  const SortTh = ({ label, k }: { label: string; k: SortKey }): React.ReactElement => (
    <th>
      <button
        onClick={() => toggleSort(k)}
        className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-[10.5px] transition hover:text-[var(--color-gold-light)]"
        style={{ color: sort === k ? "var(--color-gold)" : "var(--color-muted)" }}
      >
        {label}
        <ArrowDownUp size={9} style={{ opacity: sort === k ? 1 : 0.4 }} />
      </button>
    </th>
  );

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="page-header">
        <div className="page-header-icon" style={{ background: "rgba(212,175,55,0.12)" }}>
          <Users size={18} style={{ color: "var(--color-gold)" }} />
        </div>
        <div className="flex-1">
          <p className="page-header-title">المستخدمون</p>
          <p className="page-header-sub">
            {users === null ? "جاري التحميل..." : `${users.length} مستخدم مسجّل`}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute top-1/2 -translate-y-1/2 right-3.5"
            style={{ color: "var(--color-muted)" }}
          />
          <input
            className="input pr-10"
            placeholder="بحث بالاسم، الجوال، الإيميل، كود الإحالة..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {q && (
          <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
            {filtered.length} نتيجة
          </p>
        )}
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {users === null ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="shimmer h-12" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Search size={32} className="mx-auto mb-3 opacity-20" style={{ color: "var(--color-muted)" }} />
            <p className="font-semibold" style={{ color: "var(--color-muted)" }}>
              {q ? "لا توجد نتائج مطابقة" : "لا يوجد مستخدمون بعد"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th><span className="text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>#</span></th>
                  <SortTh label="المستخدم" k="name" />
                  <th><span className="text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>التواصل</span></th>
                  <SortTh label="الرصيد" k="balance" />
                  <SortTh label="الاستثمار" k="totalInvested" />
                  <th><span className="text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>الأرباح</span></th>
                  <th><span className="text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>إحالات</span></th>
                  <th><span className="text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>الكود</span></th>
                  <SortTh label="التسجيل" k="createdAt" />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <tr
                    key={u.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/users/${u.id}`)}
                  >
                    <td className="text-[11px] w-10" style={{ color: "var(--color-muted)" }}>{idx + 1}</td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl gold-bg flex items-center justify-center text-[12px] font-extrabold shrink-0"
                          style={{ color: "#080810" }}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-[13px]">{u.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-[11px]" style={{ color: "var(--color-muted)" }} dir="ltr">
                        {u.phone && <p>{u.phone}</p>}
                        {u.email && <p className="truncate max-w-[130px]">{u.email}</p>}
                        {!u.phone && !u.email && <p>—</p>}
                      </div>
                    </td>
                    <td>
                      <span className="font-extrabold text-[13px]" style={{ color: "var(--color-gold)" }}>
                        ${fmt(u.balance)}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold text-[13px]" style={{ color: "var(--color-success)" }}>
                        ${fmt(u.totalInvested)}
                      </span>
                    </td>
                    <td className="text-[13px]">${fmt(u.totalEarned)}</td>
                    <td>
                      {u.qualifiedReferralCount > 0 ? (
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold"
                          style={{ background: "rgba(212,175,55,0.12)", color: "var(--color-gold)" }}
                        >
                          {u.qualifiedReferralCount}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>—</span>
                      )}
                    </td>
                    <td>
                      <code
                        className="text-[10px] px-2 py-1 rounded-lg font-mono"
                        style={{
                          background: "var(--color-surface-2)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-muted-2)",
                        }}
                        dir="ltr"
                      >
                        {u.referralCode}
                      </code>
                    </td>
                    <td className="text-[11px] whitespace-nowrap" style={{ color: "var(--color-muted)" }}>
                      {fmtDate(u.createdAt)}
                    </td>
                    <td>
                      <ChevronLeft size={14} style={{ color: "var(--color-muted)" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
