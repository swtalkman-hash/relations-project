import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowRight, CheckCircle, XCircle,
  TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  Users, Clock, Phone, Mail, Calendar, Hash,
  Link as LinkIcon, KeyRound, Eye, EyeOff, X, Copy, Check,
  Wallet, PlusCircle, MinusCircle, RefreshCw,
} from "lucide-react";
import { api } from "../lib/api";
import { fmt, fmtDate, statusBadge, statusLabel } from "../lib/format";

type User = {
  id: string; name: string; phone: string | null; email: string | null;
  countryCode: string | null; balance: string; totalInvested: string;
  totalEarned: string; totalWithdrawn: string;
  qualifiedReferralCount: number; referralCode: string;
  referredBy: string | null; createdAt: string;
  depositAddressTrc20: string | null;
  depositAddressErc20: string | null;
  depositAddressBtc: string | null;
};
type Deposit    = { id: string; amount: string; network: string; txHash: string | null; status: string; createdAt: string };
type Withdrawal = { id: string; amount: string; fee: string; netAmount: string; address: string; network: string; status: string; createdAt: string };
type Investment = { id: string; amount: string; level: number; totalCollected: string; active: boolean; createdAt: string };
type Transaction = { id: string; type: string; amount: string; description: string; createdAt: string };
type Referral   = { id: string; name: string; joinedAt: string };

type UserDetail = {
  user: User; deposits: Deposit[]; withdrawals: Withdrawal[];
  investments: Investment[]; transactions: Transaction[]; referrals: Referral[];
};

type TabKey = "deposits" | "withdrawals" | "investments" | "transactions" | "referrals";

function explorerUrl(network: string, hash: string): string {
  return network === "ERC20"
    ? `https://etherscan.io/tx/${hash}`
    : `https://tronscan.org/#/transaction/${hash}`;
}

export function UserDetailPage(): React.ReactElement {
  const { id }         = useParams<{ id: string }>();
  const [, navigate]   = useLocation();
  const [data, setData] = useState<UserDetail | null>(null);
  const [tab, setTab]  = useState<TabKey>("deposits");
  const [busy, setBusy] = useState<string>("");
  const [copiedAddr, setCopiedAddr] = useState("");

  const copyAddr = async (key: string, val: string): Promise<void> => {
    await navigator.clipboard.writeText(val);
    setCopiedAddr(key);
    setTimeout(() => setCopiedAddr(""), 2000);
  };

  /* ── Password modal state ── */
  const [pwOpen,    setPwOpen]    = useState(false);
  const [newPw,     setNewPw]     = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg,     setPwMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  /* ── Balance modal state ── */
  const [balOpen,    setBalOpen]    = useState(false);
  const [balType,    setBalType]    = useState<"set" | "add" | "subtract">("add");
  const [balAmount,  setBalAmount]  = useState("");
  const [balLoading, setBalLoading] = useState(false);
  const [balMsg,     setBalMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    void api.get<UserDetail>(`/admin/users/${id}`).then(setData).catch(() => null);
  }, [id]);

  const depAction = async (depId: string, act: "approve" | "reject"): Promise<void> => {
    setBusy(depId + act);
    try {
      await api.post(`/admin/deposits/${depId}/${act}`);
      const fresh = await api.get<UserDetail>(`/admin/users/${id}`);
      setData(fresh);
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(""); }
  };

  const wAction = async (wId: string, act: "approve" | "reject"): Promise<void> => {
    if (act === "approve" && !confirm("تأكيد قبول طلب السحب؟\n⚠️ أرسل المبلغ للمستخدم أولاً!")) return;
    setBusy(wId + act);
    try {
      await api.post(`/admin/withdrawals/${wId}/${act}`);
      const fresh = await api.get<UserDetail>(`/admin/users/${id}`);
      setData(fresh);
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(""); }
  };

  const changeBalance = async (): Promise<void> => {
    const val = Number(balAmount);
    if (!balAmount || isNaN(val) || val < 0) {
      setBalMsg({ ok: false, text: "أدخل مبلغاً صحيحاً" });
      return;
    }
    setBalLoading(true);
    setBalMsg(null);
    try {
      const res = await api.patch<{ ok: boolean; newBalance: number }>(
        `/admin/users/${id}/balance`,
        { type: balType, amount: val }
      );
      const fresh = await api.get<UserDetail>(`/admin/users/${id}`);
      setData(fresh);
      setBalMsg({ ok: true, text: `تم التحديث ✓ الرصيد الجديد: $${res.newBalance.toFixed(2)}` });
      setBalAmount("");
    } catch (e) {
      setBalMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBalLoading(false);
    }
  };

  const changePassword = async (): Promise<void> => {
    if (newPw.trim().length < 6) {
      setPwMsg({ ok: false, text: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      await api.patch(`/admin/users/${id}/password`, { newPassword: newPw.trim() });
      setPwMsg({ ok: true, text: "تم تغيير كلمة المرور بنجاح ✓" });
      setNewPw("");
    } catch (e) {
      setPwMsg({ ok: false, text: (e as Error).message });
    } finally {
      setPwLoading(false);
    }
  };

  /* ── Loading ── */
  if (!data) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="shimmer h-8 w-44 rounded-xl" />
        <div className="shimmer h-40 rounded-2xl" />
        <div className="shimmer h-10 w-full rounded-xl" />
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  const { user, deposits, withdrawals, investments, transactions, referrals } = data;

  const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number }>; count: number }[] = [
    { key: "deposits",     label: "الإيداعات",    icon: ArrowDownToLine, count: deposits.length },
    { key: "withdrawals",  label: "السحوبات",     icon: ArrowUpFromLine, count: withdrawals.length },
    { key: "investments",  label: "الاستثمارات",  icon: TrendingUp,      count: investments.length },
    { key: "transactions", label: "المعاملات",    icon: Clock,           count: transactions.length },
    { key: "referrals",    label: "الإحالات",     icon: Users,           count: referrals.length },
  ];

  /* ── Stat card ── */
  const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div
      className="rounded-2xl p-4 text-center"
      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
        {label}
      </p>
      <p className="font-extrabold text-[18px]" style={{ color: color ?? "var(--color-text)" }}>
        {value}
      </p>
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Password modal ── */}
      {pwOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setPwOpen(false); setPwMsg(null); setNewPw(""); } }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound size={18} style={{ color: "var(--color-gold)" }} />
                <h3 className="font-extrabold text-base">تغيير كلمة المرور</h3>
              </div>
              <button
                onClick={() => { setPwOpen(false); setPwMsg(null); setNewPw(""); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--color-surface-2)", color: "var(--color-muted)" }}
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
              المستخدم: <span className="font-bold" style={{ color: "var(--color-text)" }}>{user.name}</span>
            </p>

            {/* Input */}
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void changePassword(); }}
                className="w-full px-4 py-3 rounded-xl text-sm pr-11"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  outline: "none",
                }}
                dir="ltr"
                autoFocus
              />
              <button
                onClick={() => setShowPw(!showPw)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-muted)" }}
                type="button"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Message */}
            {pwMsg && (
              <p
                className="text-[12px] font-semibold px-3 py-2 rounded-xl"
                style={{
                  background: pwMsg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  color: pwMsg.ok ? "var(--color-success)" : "var(--color-danger)",
                  border: `1px solid ${pwMsg.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                {pwMsg.text}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setPwOpen(false); setPwMsg(null); setNewPw(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "var(--color-surface-2)", color: "var(--color-muted)", border: "1px solid var(--color-border)" }}
              >
                إلغاء
              </button>
              <button
                onClick={() => void changePassword()}
                disabled={pwLoading || !newPw.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{
                  background: "var(--color-gold)",
                  color: "#080810",
                  opacity: pwLoading || !newPw.trim() ? 0.6 : 1,
                }}
              >
                <KeyRound size={13} />
                {pwLoading ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Balance modal ── */}
      {balOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setBalOpen(false); setBalMsg(null); setBalAmount(""); } }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={18} style={{ color: "var(--color-gold)" }} />
                <h3 className="font-extrabold text-base">التحكم في الرصيد</h3>
              </div>
              <button
                onClick={() => { setBalOpen(false); setBalMsg(null); setBalAmount(""); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--color-surface-2)", color: "var(--color-muted)" }}
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
              المستخدم: <span className="font-bold" style={{ color: "var(--color-text)" }}>{data?.user.name}</span>
              {" · "}الرصيد الحالي: <span className="font-bold" style={{ color: "var(--color-gold)" }}>${fmt(data?.user.balance ?? "0")}</span>
            </p>

            {/* نوع العملية */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "add",      label: "إضافة",  icon: PlusCircle,  color: "#22c55e" },
                { key: "subtract", label: "خصم",    icon: MinusCircle, color: "#ef4444" },
                { key: "set",      label: "تعيين",  icon: RefreshCw,   color: "#f59e0b" },
              ] as { key: "add" | "subtract" | "set"; label: string; icon: React.ComponentType<{ size?: number }>; color: string }[]).map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => setBalType(key)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[12px] font-bold transition-all"
                  style={{
                    background: balType === key ? `${color}18` : "var(--color-surface-2)",
                    border: `1.5px solid ${balType === key ? color : "var(--color-border)"}`,
                    color: balType === key ? color : "var(--color-muted)",
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* المبلغ */}
            <div className="relative">
              <span
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold"
                style={{ color: "var(--color-gold)" }}
              >$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={balAmount}
                onChange={(e) => setBalAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void changeBalance(); }}
                className="w-full px-4 py-3 rounded-xl text-sm pr-8"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  outline: "none",
                }}
                dir="ltr"
                autoFocus
              />
            </div>

            {/* معاينة النتيجة */}
            {balAmount && Number(balAmount) >= 0 && data && (
              <div
                className="text-[12px] font-semibold px-3 py-2 rounded-xl text-center"
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "var(--color-gold)" }}
              >
                الرصيد بعد التعديل:{" "}
                <strong>
                  ${(
                    balType === "set" ? Number(balAmount) :
                    balType === "add" ? Number(data.user.balance) + Number(balAmount) :
                    Math.max(0, Number(data.user.balance) - Number(balAmount))
                  ).toFixed(2)}
                </strong>
              </div>
            )}

            {/* رسالة */}
            {balMsg && (
              <p
                className="text-[12px] font-semibold px-3 py-2 rounded-xl"
                style={{
                  background: balMsg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  color: balMsg.ok ? "var(--color-success)" : "var(--color-danger)",
                  border: `1px solid ${balMsg.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                {balMsg.text}
              </p>
            )}

            {/* أزرار */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setBalOpen(false); setBalMsg(null); setBalAmount(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "var(--color-surface-2)", color: "var(--color-muted)", border: "1px solid var(--color-border)" }}
              >
                إلغاء
              </button>
              <button
                onClick={() => void changeBalance()}
                disabled={balLoading || !balAmount}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{
                  background: "var(--color-gold)",
                  color: "#080810",
                  opacity: balLoading || !balAmount ? 0.6 : 1,
                }}
              >
                <Wallet size={13} />
                {balLoading ? "جارٍ التحديث..." : "تحديث الرصيد"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Back ── */}
      <button
        onClick={() => navigate("/users")}
        className="flex items-center gap-2 text-[13px] font-semibold transition"
        style={{ color: "var(--color-muted)" }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--color-text)")}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--color-muted)")}
      >
        <ArrowRight size={15} />
        العودة إلى المستخدمين
      </button>

      {/* ── Profile card ── */}
      <div className="card space-y-5">

        {/* Avatar + info */}
        <div className="flex items-start gap-5">
          <div
            className="w-16 h-16 rounded-2xl gold-bg flex items-center justify-center text-2xl font-extrabold shrink-0 shadow-lg"
            style={{ color: "#080810", boxShadow: "0 4px 20px rgba(212,175,55,0.25)" }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-[20px] font-extrabold leading-tight">{user.name}</h1>
              <button
                onClick={() => { setPwOpen(true); setPwMsg(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold shrink-0"
                style={{
                  background: "rgba(212,175,55,0.1)",
                  border: "1px solid rgba(212,175,55,0.25)",
                  color: "var(--color-gold)",
                }}
              >
                <KeyRound size={12} />
                تغيير كلمة المرور
              </button>
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {user.phone && (
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--color-muted-2)" }}>
                  <Phone size={12} />
                  <span dir="ltr">{user.phone}</span>
                </span>
              )}
              {user.email && (
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--color-muted-2)" }}>
                  <Mail size={12} />
                  {user.email}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--color-muted-2)" }}>
                <Calendar size={12} />
                انضم {fmtDate(user.createdAt)}
              </span>
              <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--color-muted-2)" }}>
                <Hash size={12} />
                كود الإحالة:{" "}
                <code className="font-mono" style={{ color: "var(--color-gold)" }} dir="ltr">
                  {user.referralCode}
                </code>
              </span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* بطاقة الرصيد مع زر التحكم */}
          <div
            className="rounded-2xl p-4 text-center relative"
            style={{ background: "var(--color-surface-2)", border: "1px solid rgba(212,175,55,0.35)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
              الرصيد
            </p>
            <p className="font-extrabold text-[18px]" style={{ color: "var(--color-gold)" }}>
              ${fmt(user.balance)}
            </p>
            <button
              onClick={() => { setBalOpen(true); setBalMsg(null); setBalAmount(""); }}
              className="mt-2 w-full flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95"
              style={{
                background: "rgba(212,175,55,0.12)",
                border: "1px solid rgba(212,175,55,0.3)",
                color: "var(--color-gold)",
              }}
            >
              <Wallet size={10} />
              تعديل
            </button>
          </div>
          <Stat label="إجمالي الإيداع" value={`$${fmt(user.totalInvested)}`} color="var(--color-success)" />
          <Stat label="إجمالي الأرباح" value={`$${fmt(user.totalEarned)}`} />
          <Stat label="إجمالي السحب" value={`$${fmt(user.totalWithdrawn)}`} color="var(--color-danger)" />
          <Stat label="إحالات مؤهلة" value={String(user.qualifiedReferralCount)} color="var(--color-info)" />
          <Stat label="إجمالي الإحالات" value={String(referrals.length)} />
        </div>

        {/* Deposit addresses */}
        {(user.depositAddressTrc20 || user.depositAddressErc20 || user.depositAddressBtc) && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.18)" }}>
            <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: "var(--color-gold)" }}>
              عناوين الإيداع الشخصية
            </p>
            {[
              { key: "trc20", label: "TRC20 (TRON)", val: user.depositAddressTrc20 },
              { key: "erc20", label: "ERC20 (ETH)",  val: user.depositAddressErc20 },
              { key: "btc", label: "BTC (Bitcoin)", val: user.depositAddressBtc },
            ].map(({ key, label, val }) => val && (
              <div key={key} className="flex items-center gap-3">
                <span className="text-[11px] font-bold shrink-0 w-24" style={{ color: "var(--color-muted)" }}>{label}</span>
                <code className="flex-1 text-[10px] break-all leading-relaxed" style={{ color: "var(--color-muted-2)" }} dir="ltr">{val}</code>
                <button
                  onClick={() => void copyAddr(key, val)}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition"
                  style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.2)", color: "var(--color-gold)" }}
                >
                  {copiedAddr === key ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon: Icon, count }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition"
              style={{
                background: active ? "rgba(212,175,55,0.12)" : "var(--color-surface-2)",
                border: `1.5px solid ${active ? "var(--color-gold)" : "var(--color-border)"}`,
                color: active ? "var(--color-gold-light)" : "var(--color-muted-2)",
              }}
            >
              <Icon size={13} />
              {label}
              <span
                className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-lg min-w-[20px] text-center"
                style={{
                  background: active ? "rgba(212,175,55,0.2)" : "var(--color-surface-3)",
                  color: active ? "var(--color-gold)" : "var(--color-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="card !p-0 overflow-hidden">

        {/* Deposits */}
        {tab === "deposits" && (
          deposits.length === 0 ? <Empty text="لا توجد إيداعات" /> : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>المبلغ</th><th>الشبكة</th><th>رقم العملية</th>
                    <th>التاريخ</th><th>الحالة</th><th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map(d => (
                    <tr key={d.id}>
                      <td>
                        <span className="font-extrabold text-[14px]" style={{ color: "var(--color-gold)" }}>
                          ${fmt(d.amount)}
                        </span>
                      </td>
                      <td>
                        <NetworkBadge network={d.network} />
                      </td>
                      <td>
                        {d.txHash ? (
                          <div className="flex items-center gap-1.5">
                            <code className="text-[10px] px-2 py-1 rounded-lg" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-muted-2)" }} dir="ltr">
                              {d.txHash.slice(0, 10)}…{d.txHash.slice(-5)}
                            </code>
                            <a href={explorerUrl(d.network, d.txHash)} target="_blank" rel="noopener noreferrer" className="w-6 h-6 flex items-center justify-center rounded-lg" style={{ color: "var(--color-gold)" }}>
                              <LinkIcon size={11} />
                            </a>
                          </div>
                        ) : <span style={{ color: "var(--color-muted)", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--color-muted)", whiteSpace: "nowrap" }}>{fmtDate(d.createdAt)}</td>
                      <td><span className={statusBadge(d.status)}>{statusLabel(d.status)}</span></td>
                      <td>
                        {d.status === "pending" ? (
                          <div className="flex gap-1.5">
                            <button disabled={!!busy} onClick={() => depAction(d.id, "approve")} className="btn btn-success">
                              <CheckCircle size={11} />{busy === d.id + "approve" ? "..." : "قبول"}
                            </button>
                            <button disabled={!!busy} onClick={() => depAction(d.id, "reject")} className="btn btn-danger">
                              <XCircle size={11} />{busy === d.id + "reject" ? "..." : "رفض"}
                            </button>
                          </div>
                        ) : <span style={{ fontSize: 11, color: "var(--color-muted)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Withdrawals */}
        {tab === "withdrawals" && (
          withdrawals.length === 0 ? <Empty text="لا توجد سحوبات" /> : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>المبلغ</th><th>الرسوم</th><th>الصافي</th>
                    <th>الشبكة</th><th>العنوان</th><th>التاريخ</th><th>الحالة</th><th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w.id}>
                      <td><span className="font-bold text-[13px]">${fmt(w.amount)}</span></td>
                      <td><span className="text-[12px] font-semibold" style={{ color: "var(--color-danger)" }}>−${fmt(w.fee)}</span></td>
                      <td><span className="font-extrabold text-[14px]" style={{ color: "var(--color-success)" }}>${fmt(w.netAmount)}</span></td>
                      <td><NetworkBadge network={w.network} /></td>
                      <td>
                        <code className="text-[10px] px-2 py-1 rounded-lg" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-muted-2)" }} dir="ltr">
                          {w.address.slice(0, 12)}…
                        </code>
                      </td>
                      <td style={{ fontSize: 11, color: "var(--color-muted)", whiteSpace: "nowrap" }}>{fmtDate(w.createdAt)}</td>
                      <td><span className={statusBadge(w.status)}>{statusLabel(w.status)}</span></td>
                      <td>
                        {w.status === "pending" ? (
                          <div className="flex gap-1.5">
                            <button disabled={!!busy} onClick={() => wAction(w.id, "approve")} className="btn btn-success">
                              <CheckCircle size={11} />{busy === w.id + "approve" ? "..." : "قبول"}
                            </button>
                            <button disabled={!!busy} onClick={() => wAction(w.id, "reject")} className="btn btn-danger">
                              <XCircle size={11} />{busy === w.id + "reject" ? "..." : "رفض"}
                            </button>
                          </div>
                        ) : <span style={{ fontSize: 11, color: "var(--color-muted)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Investments */}
        {tab === "investments" && (
          investments.length === 0 ? <Empty text="لا توجد استثمارات" /> : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr><th>المبلغ</th><th>المستوى</th><th>الأرباح المجمعة</th><th>الحالة</th><th>تاريخ البدء</th></tr>
                </thead>
                <tbody>
                  {investments.map(inv => (
                    <tr key={inv.id}>
                      <td>
                        <span className="font-extrabold text-[14px]" style={{ color: "var(--color-gold)" }}>
                          ${fmt(inv.amount)}
                        </span>
                      </td>
                      <td>
                        <span
                          className="text-[12px] font-bold px-2.5 py-1 rounded-lg"
                          style={{ background: "rgba(212,175,55,0.15)", color: "var(--color-gold)" }}
                        >
                          المستوى {inv.level}
                        </span>
                      </td>
                      <td>
                        <span className="font-semibold" style={{ color: "var(--color-success)" }}>
                          ${fmt(inv.totalCollected)}
                        </span>
                      </td>
                      <td>
                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                          style={{
                            background: inv.active ? "rgba(34,197,94,0.12)" : "rgba(100,100,120,0.15)",
                            color: inv.active ? "var(--color-success)" : "var(--color-muted)",
                            border: `1px solid ${inv.active ? "rgba(34,197,94,0.25)" : "rgba(100,100,120,0.2)"}`,
                          }}
                        >
                          {inv.active ? "● نشط" : "○ منتهي"}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: "var(--color-muted)", whiteSpace: "nowrap" }}>{fmtDate(inv.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Transactions */}
        {tab === "transactions" && (
          transactions.length === 0 ? <Empty text="لا توجد معاملات" /> : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr><th>النوع</th><th>المبلغ</th><th>التفاصيل</th><th>التاريخ</th></tr>
                </thead>
                <tbody>
                  {transactions.map(tx => {
                    const pos = Number(tx.amount) > 0;
                    return (
                      <tr key={tx.id}>
                        <td>
                          <code
                            className="text-[10px] px-2 py-1 rounded-lg"
                            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-muted-2)" }}
                            dir="ltr"
                          >
                            {tx.type}
                          </code>
                        </td>
                        <td>
                          <span className="font-bold text-[13px]" style={{ color: pos ? "var(--color-success)" : "var(--color-muted)" }}>
                            {pos ? "+" : ""}${fmt(tx.amount)}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--color-muted)", maxWidth: 220 }}>{tx.description}</td>
                        <td style={{ fontSize: 11, color: "var(--color-muted)", whiteSpace: "nowrap" }}>{fmtDate(tx.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Referrals */}
        {tab === "referrals" && (
          referrals.length === 0 ? <Empty text="لا توجد إحالات" /> : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr><th>#</th><th>الاسم</th><th>تاريخ الانضمام</th></tr>
                </thead>
                <tbody>
                  {referrals.map((r, idx) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 11, color: "var(--color-muted)", width: 40 }}>{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{ background: "rgba(212,175,55,0.12)", color: "var(--color-gold)" }}
                          >
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-[13px]">{r.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: "var(--color-muted)", whiteSpace: "nowrap" }}>{fmtDate(r.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function NetworkBadge({ network }: { network: string }): React.ReactElement {
  return (
    <span
      className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
      style={{
        background: "var(--color-surface-3)",
        border: "1px solid var(--color-border-light)",
        color: "var(--color-text-soft)",
      }}
    >
      {network}
    </span>
  );
}

function Empty({ text }: { text: string }): React.ReactElement {
  return (
    <div className="py-16 text-center" style={{ color: "var(--color-muted)" }}>
      <p className="font-semibold">{text}</p>
    </div>
  );
}
