import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle, XCircle, ExternalLink, RefreshCw,
  Copy, Check, AlertTriangle, ArrowUpFromLine,
} from "lucide-react";
import { api } from "../lib/api";
import { fmt, fmtDate, statusBadge, statusLabel } from "../lib/format";
import { usePending } from "../lib/pending";

type Withdrawal = {
  id: string;
  userId: string;
  userName: string | null;
  userPhone: string | null;
  userEmail: string | null;
  amount: string;
  fee: string;
  netAmount: string;
  address: string;
  network: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type FilterVal = "pending" | "approved" | "rejected" | "all";

const FILTERS: { key: FilterVal; label: string; activeColor: string }[] = [
  { key: "pending",  label: "معلقة",   activeColor: "var(--color-warning)" },
  { key: "approved", label: "مقبولة",  activeColor: "var(--color-success)" },
  { key: "rejected", label: "مرفوضة", activeColor: "var(--color-danger)"  },
  { key: "all",      label: "الكل",    activeColor: "var(--color-gold)"    },
];

export function WithdrawalsPage(): React.ReactElement {
  const [, navigate]              = useLocation();
  const { refresh: refreshPending } = usePending();
  const [rows, setRows]           = useState<Withdrawal[] | null>(null);
  const [filter, setFilter]       = useState<FilterVal>("pending");
  const [busy, setBusy]           = useState<string>("");
  const [copied, setCopied]       = useState<string>("");

  const load = useCallback(async () => {
    const data = await api.get<Withdrawal[]>("/admin/withdrawals");
    setRows(data);
  }, []);

  useEffect(() => { void load().catch(() => setRows([])); }, [load]);

  const action = async (id: string, act: "approve" | "reject"): Promise<void> => {
    if (act === "approve" && !confirm("تأكيد قبول طلب السحب؟\n⚠️ تأكد من إرسال المبلغ الفعلي للمستخدم أولاً!")) return;
    setBusy(id + act);
    try {
      await api.post(`/admin/withdrawals/${id}/${act}`);
      await load();
      refreshPending();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(""); }
  };

  const copyAddr = async (addr: string, id: string): Promise<void> => {
    await navigator.clipboard.writeText(addr);
    setCopied(id);
    setTimeout(() => setCopied(""), 2500);
  };

  const counts = {
    pending:  rows?.filter(r => r.status === "pending").length  ?? 0,
    approved: rows?.filter(r => r.status === "approved").length ?? 0,
    rejected: rows?.filter(r => r.status === "rejected").length ?? 0,
    all:      rows?.length ?? 0,
  };
  const visible = rows?.filter(r => filter === "all" || r.status === filter) ?? [];

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-icon" style={{ background: "rgba(239,68,68,0.12)" }}>
          <ArrowUpFromLine size={18} style={{ color: "var(--color-danger)" }} />
        </div>
        <div className="flex-1">
          <p className="page-header-title">السحوبات</p>
          <p className="page-header-sub">
            {rows === null ? "جاري التحميل..." : `${counts.all} طلب سحب · ${counts.pending} معلق`}
          </p>
        </div>
        <button
          onClick={() => load().catch(() => null)}
          className="btn-ghost flex items-center gap-2"
        >
          <RefreshCw size={13} />
          تحديث
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(({ key, label, activeColor }) => {
          const count  = counts[key];
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition"
              style={{
                background: active ? `${activeColor}18` : "var(--color-surface-2)",
                border: `1.5px solid ${active ? activeColor : "var(--color-border)"}`,
                color: active ? activeColor : "var(--color-muted-2)",
              }}
            >
              {label}
              <span
                className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-lg min-w-[22px] text-center"
                style={{
                  background: active ? `${activeColor}30` : "var(--color-surface-3)",
                  color: active ? activeColor : "var(--color-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Warning ── */}
      {filter === "pending" && counts.pending > 0 && (
        <div
          className="flex items-center gap-3 p-4 rounded-2xl text-[13px] font-semibold"
          style={{
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "var(--color-danger)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0" />
          أرسل المبلغ الصافي إلى عنوان محفظة المستخدم أولاً، ثم اضغط قبول
        </div>
      )}

      {/* ── Table ── */}
      <div className="card !p-0 overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <p className="font-bold text-[14px]">
            {FILTERS.find(f => f.key === filter)?.label}
            <span className="font-normal text-[13px] mr-1.5" style={{ color: "var(--color-muted)" }}>
              ({visible.length} طلب)
            </span>
          </p>
        </div>

        {rows === null ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="shimmer h-16" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center">
            <ArrowUpFromLine size={36} className="mx-auto mb-3 opacity-15" style={{ color: "var(--color-muted)" }} />
            <p className="font-semibold" style={{ color: "var(--color-muted)" }}>
              {filter === "pending" ? "✅ لا توجد سحوبات معلقة حالياً" : "لا توجد نتائج"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>المستخدم</th>
                  <th>الشبكة</th>
                  <th>المبلغ المطلوب</th>
                  <th>الرسوم</th>
                  <th>الصافي للإرسال</th>
                  <th>عنوان المحفظة</th>
                  <th>التاريخ</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((w, i) => (
                  <tr key={w.id}>

                    <td style={{ color: "var(--color-muted)", fontSize: 11 }}>{i + 1}</td>

                    {/* User */}
                    <td>
                      <button onClick={() => navigate(`/users/${w.userId}`)} className="text-start group">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg gold-bg flex items-center justify-center text-[11px] font-extrabold shrink-0"
                            style={{ color: "#080810" }}
                          >
                            {(w.userName ?? "؟")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[13px] flex items-center gap-1 transition" style={{ color: "var(--color-text)" }}>
                              {w.userName ?? "—"}
                              <ExternalLink size={10} className="opacity-0 group-hover:opacity-60" />
                            </p>
                            <p className="text-[11px]" style={{ color: "var(--color-muted)" }} dir="ltr">
                              {w.userPhone ?? w.userEmail ?? w.userId.slice(0, 10) + "…"}
                            </p>
                          </div>
                        </div>
                      </button>
                    </td>

                    {/* Network */}
                    <td>
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                        style={{
                          background: "var(--color-surface-3)",
                          border: "1px solid var(--color-border-light)",
                          color: "var(--color-text-soft)",
                        }}
                      >
                        {w.network}
                      </span>
                    </td>

                    {/* Amount */}
                    <td>
                      <span className="font-bold text-[13px]" style={{ color: "var(--color-text)" }}>
                        ${fmt(w.amount)}
                      </span>
                    </td>

                    {/* Fee */}
                    <td>
                      <span className="font-semibold text-[12px]" style={{ color: "var(--color-danger)" }}>
                        −${fmt(w.fee)}
                      </span>
                    </td>

                    {/* Net */}
                    <td>
                      <span className="font-extrabold text-[15px]" style={{ color: "var(--color-success)" }}>
                        ${fmt(w.netAmount)}
                      </span>
                    </td>

                    {/* Address + copy */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        <code
                          className="text-[10px] px-2 py-1 rounded-lg"
                          style={{
                            background: "var(--color-surface-2)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-muted-2)",
                            maxWidth: 120,
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          dir="ltr"
                        >
                          {w.address}
                        </code>
                        <button
                          onClick={() => copyAddr(w.address, w.id)}
                          title="نسخ العنوان"
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition shrink-0"
                          style={{ background: copied === w.id ? "rgba(34,197,94,0.15)" : "var(--color-surface-3)" }}
                        >
                          {copied === w.id
                            ? <Check size={12} style={{ color: "var(--color-success)" }} />
                            : <Copy size={11} style={{ color: "var(--color-muted)" }} />}
                        </button>
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ fontSize: 11, color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                      {fmtDate(w.createdAt)}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={statusBadge(w.status)}>{statusLabel(w.status)}</span>
                    </td>

                    {/* Action */}
                    <td>
                      {w.status === "pending" ? (
                        <div className="flex gap-1.5">
                          <button disabled={!!busy} onClick={() => action(w.id, "approve")} className="btn btn-success">
                            <CheckCircle size={12} />
                            {busy === w.id + "approve" ? "..." : "قبول"}
                          </button>
                          <button disabled={!!busy} onClick={() => action(w.id, "reject")} className="btn btn-danger">
                            <XCircle size={12} />
                            {busy === w.id + "reject" ? "..." : "رفض"}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--color-muted)" }}>—</span>
                      )}
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
