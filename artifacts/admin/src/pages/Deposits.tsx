import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle, XCircle, ExternalLink, RefreshCw,
  AlertTriangle, ArrowDownToLine, Link as LinkIcon, ImageIcon, X,
} from "lucide-react";
import { api } from "../lib/api";
import { fmt, fmtDate, statusBadge, statusLabel } from "../lib/format";
import { usePending } from "../lib/pending";

type Deposit = {
  id: string;
  userId: string;
  userName: string | null;
  userPhone: string | null;
  userEmail: string | null;
  amount: string;
  txHash: string | null;
  network: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  hasProof: boolean;
  notes: string | null;
};

type FilterVal = "pending" | "approved" | "rejected" | "all";

const FILTERS: { key: FilterVal; label: string; activeColor: string }[] = [
  { key: "pending",  label: "معلقة",   activeColor: "var(--color-warning)" },
  { key: "approved", label: "مقبولة",  activeColor: "var(--color-success)" },
  { key: "rejected", label: "مرفوضة", activeColor: "var(--color-danger)"  },
  { key: "all",      label: "الكل",    activeColor: "var(--color-gold)"    },
];

function explorerUrl(network: string, hash: string): string {
  return network === "ERC20"
    ? `https://etherscan.io/tx/${hash}`
    : `https://tronscan.org/#/transaction/${hash}`;
}

export function DepositsPage(): React.ReactElement {
  const [, navigate] = useLocation();
  const { refresh: refreshPending } = usePending();
  const [rows, setRows]   = useState<Deposit[] | null>(null);
  const [filter, setFilter] = useState<FilterVal>("pending");
  const [busy, setBusy]   = useState<string>("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState<string>("");

  const openProof = async (id: string): Promise<void> => {
    setLoadingProof(id);
    try {
      const data = await api.get<{ proofImage: string }>(`/admin/deposits/${id}/proof`);
      setLightbox(data.proofImage);
    } catch { /* ignore */ }
    finally { setLoadingProof(""); }
  };

  const load = useCallback(async () => {
    const data = await api.get<Deposit[]>("/admin/deposits");
    setRows(data);
  }, []);

  useEffect(() => { void load().catch(() => setRows([])); }, [load]);

  const action = async (id: string, act: "approve" | "reject"): Promise<void> => {
    setBusy(id + act);
    try {
      await api.post(`/admin/deposits/${id}/${act}`);
      await load();
      refreshPending();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(""); }
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

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.12)" }}
            onClick={() => setLightbox(null)}
          >
            <X size={18} color="#fff" />
          </button>
          <img
            src={lightbox}
            alt="إثبات الإيداع"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-icon" style={{ background: "rgba(34,197,94,0.12)" }}>
          <ArrowDownToLine size={18} style={{ color: "var(--color-success)" }} />
        </div>
        <div className="flex-1">
          <p className="page-header-title">الإيداعات</p>
          <p className="page-header-sub">
            {rows === null ? "جاري التحميل..." : `${counts.all} إيداع · ${counts.pending} معلق`}
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
          const count = counts[key];
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

      {/* ── Alert ── */}
      {filter === "pending" && counts.pending > 0 && (
        <div
          className="flex items-center gap-3 p-4 rounded-2xl text-[13px] font-semibold"
          style={{
            background: "rgba(245,158,11,0.07)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "var(--color-warning)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0" />
          تحقق من صحة Hash المعاملة على الـ blockchain قبل الموافقة على أي إيداع
        </div>
      )}

      {/* ── Table ── */}
      <div className="card !p-0 overflow-hidden">

        {/* Table header bar */}
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
            <ArrowDownToLine size={36} className="mx-auto mb-3 opacity-15" style={{ color: "var(--color-muted)" }} />
            <p className="font-semibold" style={{ color: "var(--color-muted)" }}>
              {filter === "pending" ? "✅ لا توجد إيداعات معلقة حالياً" : "لا توجد نتائج"}
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
                  <th>المبلغ</th>
                  <th>رقم العملية (Hash)</th>
                  <th>صورة الإثبات</th>
                  <th>التاريخ</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((d, i) => (
                  <tr key={d.id}>

                    {/* # */}
                    <td style={{ color: "var(--color-muted)", fontSize: 11 }}>{i + 1}</td>

                    {/* User */}
                    <td>
                      <button
                        onClick={() => navigate(`/users/${d.userId}`)}
                        className="text-start group"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg gold-bg flex items-center justify-center text-[11px] font-extrabold shrink-0"
                            style={{ color: "#080810" }}
                          >
                            {(d.userName ?? "؟")[0].toUpperCase()}
                          </div>
                          <div>
                            <p
                              className="font-semibold text-[13px] flex items-center gap-1 transition"
                              style={{ color: "var(--color-text)" }}
                            >
                              {d.userName ?? "—"}
                              <ExternalLink size={10} className="opacity-0 group-hover:opacity-60" />
                            </p>
                            <p className="text-[11px]" style={{ color: "var(--color-muted)" }} dir="ltr">
                              {d.userPhone ?? d.userEmail ?? d.userId.slice(0, 10) + "…"}
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
                        {d.network}
                      </span>
                    </td>

                    {/* Amount */}
                    <td>
                      <span className="font-extrabold text-[15px]" style={{ color: "var(--color-gold)" }}>
                        ${fmt(d.amount)}
                      </span>
                    </td>

                    {/* Hash */}
                    <td>
                      {d.txHash ? (
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
                            {d.txHash.slice(0, 10)}…{d.txHash.slice(-6)}
                          </code>
                          <a
                            href={explorerUrl(d.network, d.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="فتح على المستكشف"
                            className="w-6 h-6 flex items-center justify-center rounded-lg transition"
                            style={{ color: "var(--color-gold)" }}
                          >
                            <LinkIcon size={11} />
                          </a>
                        </div>
                      ) : (
                        <span style={{ color: "var(--color-muted)", fontSize: 12 }}>لم يُرسل</span>
                      )}
                    </td>

                    {/* Proof Image */}
                    <td>
                      {d.hasProof ? (
                        <button
                          onClick={() => void openProof(d.id)}
                          disabled={loadingProof === d.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition"
                          style={{
                            background: "rgba(34,197,94,0.08)",
                            border: "1px solid rgba(34,197,94,0.25)",
                            color: "var(--color-success)",
                            opacity: loadingProof === d.id ? 0.6 : 1,
                          }}
                        >
                          <ImageIcon size={12} />
                          <span className="text-[11px] font-bold">
                            {loadingProof === d.id ? "..." : "عرض"}
                          </span>
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--color-muted)" }}>—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ fontSize: 11, color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                      {fmtDate(d.createdAt)}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={statusBadge(d.status)}>{statusLabel(d.status)}</span>
                    </td>

                    {/* Action */}
                    <td>
                      {d.status === "pending" ? (
                        <div className="flex gap-1.5">
                          <button
                            disabled={!!busy}
                            onClick={() => action(d.id, "approve")}
                            className="btn btn-success"
                          >
                            <CheckCircle size={12} />
                            {busy === d.id + "approve" ? "..." : "قبول"}
                          </button>
                          <button
                            disabled={!!busy}
                            onClick={() => action(d.id, "reject")}
                            className="btn btn-danger"
                          >
                            <XCircle size={12} />
                            {busy === d.id + "reject" ? "..." : "رفض"}
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
