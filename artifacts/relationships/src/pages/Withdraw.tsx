import React, { useEffect, useState } from "react";
import { ArrowUpFromLine, ChevronLeft, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t } from "../lib/i18n";

type WithdrawalRow = {
  id: string;
  amount: string;
  fee: string;
  netAmount: string;
  address: string;
  network: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
};

type Network = "TRC20" | "ERC20" | "BEP20" | "ETH" | "BNB" | "BTC" | "TRX";

const NETWORKS: { key: Network; label: string; color: string; bg: string; border: string; icon: string }[] = [
  { key: "TRC20", label: "USDT TRC20", color: "#26a17b", bg: "rgba(38,161,123,0.1)",  border: "rgba(38,161,123,0.25)", icon: "₮" },
  { key: "ERC20", label: "USDT ERC20", color: "#627eea", bg: "rgba(98,126,234,0.1)",  border: "rgba(98,126,234,0.25)", icon: "Ξ" },
  { key: "BEP20", label: "USDT BEP20", color: "#f0b90b", bg: "rgba(240,185,11,0.1)",  border: "rgba(240,185,11,0.25)", icon: "B" },
  { key: "TRX",   label: "TRX",        color: "#ff060a", bg: "rgba(255,6,10,0.1)",    border: "rgba(255,6,10,0.25)",  icon: "◉" },
  { key: "ETH",   label: "Ethereum",   color: "#627eea", bg: "rgba(98,126,234,0.1)",  border: "rgba(98,126,234,0.25)", icon: "Ξ" },
  { key: "BNB",   label: "BNB",        color: "#f0b90b", bg: "rgba(240,185,11,0.1)",  border: "rgba(240,185,11,0.25)", icon: "◈" },
  { key: "BTC",   label: "Bitcoin",    color: "#f7931a", bg: "rgba(247,147,26,0.1)",  border: "rgba(247,147,26,0.25)", icon: "₿" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  approved:  { bg: "rgba(34,197,94,0.1)",    color: "var(--color-success)", border: "rgba(34,197,94,0.2)"    },
  rejected:  { bg: "rgba(239,68,68,0.1)",    color: "var(--color-danger)",  border: "rgba(239,68,68,0.2)"    },
  cancelled: { bg: "rgba(120,120,160,0.1)",  color: "var(--color-muted)",   border: "rgba(120,120,160,0.2)"  },
  pending:   { bg: "rgba(245,158,11,0.1)",   color: "var(--color-warning)", border: "rgba(245,158,11,0.2)"   },
};

const STATUS_LABEL: Record<string, string> = {
  approved: "✅ مقبول", rejected: "❌ مرفوض", cancelled: "⛔ ملغي", pending: "⏳ معلق",
};

export function WithdrawPage(): React.ReactElement {
  const [, navigate] = useLocation();
  const { user, refresh: refreshUser } = useAuth();

  const [history, setHistory] = useState<WithdrawalRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [network, setNetwork] = useState<Network>("TRC20");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const netMeta = NETWORKS.find((n) => n.key === network) ?? NETWORKS[0];

  const loadData = async (): Promise<void> => {
    try {
      const histData = await api.get<WithdrawalRow[]>("/withdrawals");
      setHistory(histData);
    } catch { /* ignore */ }
  };

  useEffect(() => { void loadData(); }, []);

  const manualRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 600);
  };

  const submit = async (): Promise<void> => {
    setErr("");
    setSuccess("");
    const v = Number(amount);
    if (Number.isNaN(v) || v < 20) { setErr("الحد الأدنى للسحب 20$"); return; }
    if (Number(user?.balance ?? 0) < v) { setErr("رصيد غير كافٍ"); return; }
    if (!address.trim()) { setErr("أدخل عنوان محفظتك"); return; }
    setLoading(true);
    try {
      await api.post("/withdrawals", { amount: v, address: address.trim(), network });
      setAmount("");
      setAddress("");
      setShowForm(false);
      setSuccess("تم إرسال طلب السحب — سيُراجع خلال 24 ساعة ⏳");
      await Promise.all([loadData(), refreshUser()]);
      setTimeout(() => setSuccess(""), 5000);
    } catch (e) {
      const msg = (e as Error).message;
      const errMap: Record<string, string> = {
        below_minimum: "المبلغ أقل من الحد الأدنى (20$)",
        insufficient_balance: "رصيد غير كافٍ",
      };
      setErr(errMap[msg] ?? msg);
    } finally {
      setLoading(false);
    }
  };

  const cancelWithdrawal = async (id: string): Promise<void> => {
    setCancellingId(id);
    try {
      await api.post(`/withdrawals/${id}/cancel`);
      setSuccess(t("cancel_withdrawal_success"));
      await Promise.all([loadData(), refreshUser()]);
      setTimeout(() => setSuccess(""), 4000);
    } catch { /* ignore */ } finally {
      setCancellingId(null);
      setConfirmCancel(null);
    }
  };

  return (
    <div className="px-4 pt-5 pb-10">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "var(--color-surface-2)" }}
        >
          <ChevronLeft size={18} style={{ color: "var(--color-muted)" }} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold leading-none">{t("withdraw")}</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            {t("balance")}: <span className="font-bold gold-text">${Number(user?.balance ?? 0).toFixed(2)}</span>
          </p>
        </div>
      </div>

      {/* إشعار وقت المعالجة */}
      <div className="rounded-2xl px-4 py-3 mb-5 flex items-start gap-3"
        style={{ background: "rgba(98,126,234,0.07)", border: "1px solid rgba(98,126,234,0.2)" }}>
        <span className="text-lg mt-0.5">🕐</span>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
          سيتم إرسال الأموال إلى محفظتك خلال{" "}
          <span className="font-bold" style={{ color: "var(--color-fg)" }}>ساعتين إلى 5 أيام عمل</span>{" "}
          من تاريخ تقديم الطلب.
        </p>
      </div>

      {success && (
        <div className="text-xs font-semibold px-3 py-2.5 rounded-xl mb-4"
          style={{ background: "rgba(34,197,94,0.08)", color: "var(--color-success)", border: "1px solid rgba(34,197,94,0.2)" }}>
          {success}
        </div>
      )}

      {/* زر السحب الرئيسي */}
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setErr(""); }}
          className="w-full py-3.5 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 mb-5"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
        >
          <ArrowUpFromLine size={17} />
          طلب سحب جديد
        </button>
      )}

      {/* نموذج السحب */}
      {showForm && (
        <div className="rounded-2xl p-4 mb-5 space-y-4"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>

          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm">طلب سحب جديد</h2>
            <p className="text-xs font-semibold gold-text">{t("min_withdrawal")}</p>
          </div>

          {/* الشبكة */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--color-muted)" }}>
              {t("withdraw_network")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {NETWORKS.map((n) => (
                <button key={n.key} type="button" onClick={() => setNetwork(n.key)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
                  style={network === n.key ? {
                    background: n.bg, border: `1.5px solid ${n.color}`, color: n.color,
                  } : {
                    background: "var(--color-surface-2)", border: "1.5px solid var(--color-border)", color: "var(--color-muted)",
                  }}>
                  <span className="font-black">{n.icon}</span>
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* المبلغ */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--color-muted)" }}>
              {t("withdraw_amount")} <span className="text-[10px]">(الرسوم: {user?.hasDoubled ? "5%" : "25%"})</span>
            </label>
            <input className="input" type="number" inputMode="decimal" placeholder="0.00"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
            {amount && Number(amount) >= 20 && (
              <div className="mt-1.5 space-y-0.5">
                <p className="text-[11px] font-bold" style={{ color: "var(--color-success)" }}>
                  ✓ ستستلم: ${(Number(amount) * (user?.hasDoubled ? 0.95 : 0.75)).toFixed(2)} بعد الرسوم
                </p>
                <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                  رصيدك بعد السحب: ${Math.max(0, Number(user?.balance ?? 0) - Number(amount)).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* عنوان المحفظة */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--color-muted)" }}>
              {t("withdraw_address")}
            </label>
            <input className="input" dir="ltr"
              placeholder={`عنوان ${netMeta.label}`}
              value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          {err && (
            <div className="text-xs font-semibold px-3 py-2 rounded-xl"
              style={{ background: "rgba(239,68,68,0.08)", color: "var(--color-danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
              ⚠ {err}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setErr(""); }}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: "var(--color-surface-2)", color: "var(--color-muted)" }}>
              إلغاء
            </button>
            <button onClick={submit} disabled={loading}
              className="py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: netMeta.color, color: "#fff", flex: 2 }}>
              <ArrowUpFromLine size={15} />
              {loading ? "جارٍ الإرسال…" : t("submit_withdrawal")}
            </button>
          </div>
        </div>
      )}

      {/* dialog تأكيد الإلغاء */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setConfirmCancel(null)}>
          <div className="w-full max-w-sm rounded-3xl p-5 space-y-4"
            style={{ background: "var(--color-surface)" }}
            onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-center">{t("cancel_withdrawal_confirm")}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCancel(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: "var(--color-surface-2)", color: "var(--color-muted)" }}>
                تراجع
              </button>
              <button
                onClick={() => { void cancelWithdrawal(confirmCancel); }}
                disabled={cancellingId === confirmCancel}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: "rgba(239,68,68,0.85)", color: "#fff" }}>
                {cancellingId === confirmCancel ? "جارٍ…" : "نعم، إلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* سجل السحوبات */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold" style={{ color: "var(--color-muted)" }}>{t("history")}</h2>
        <button onClick={manualRefresh}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl"
          style={{ background: "var(--color-surface-2)", color: "var(--color-muted)" }}>
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--color-muted)" }}>
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">لا توجد طلبات سحب بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((w) => {
            const st = STATUS_STYLE[w.status] ?? STATUS_STYLE.pending;
            const nm = NETWORKS.find((n) => n.key === w.network) ?? NETWORKS[0];
            return (
              <div key={w.id} className="rounded-2xl p-4 space-y-2"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-[18px] leading-none">${Number(w.amount).toFixed(2)}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                      {nm.label} · صافي ${Number(w.netAmount).toFixed(2)}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                      {new Date(w.createdAt).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl shrink-0"
                    style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                    {STATUS_LABEL[w.status]}
                  </span>
                </div>

                <div className="rounded-xl p-2.5"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: "var(--color-muted)" }}>العنوان</p>
                  <code dir="ltr" className="text-[11px] break-all font-mono" style={{ color: "var(--color-muted)" }}>
                    {w.address}
                  </code>
                </div>

                {/* زر الإلغاء للطلبات المعلقة */}
                {w.status === "pending" && (
                  <button
                    onClick={() => setConfirmCancel(w.id)}
                    className="w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    style={{
                      background: "rgba(239,68,68,0.07)",
                      color: "var(--color-danger)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}>
                    ✕ {t("cancel_withdrawal")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
