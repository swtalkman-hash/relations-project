import React from "react";
import { useEffect, useState, useRef } from "react";
import { Copy, Check, ArrowDownToLine, ExternalLink, RefreshCw, Zap, ChevronLeft, QrCode, ImagePlus, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation } from "wouter";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { WALLETS } from "../lib/wallets";

type DepositRow = {
  id: string;
  amount: string;
  network: string;
  status: "pending" | "approved" | "rejected";
  txHash: string | null;
  notes: string | null;
  createdAt: string;
};

type Network = "TRC20" | "TRX" | "ERC20" | "BEP20" | "ETH" | "BNB" | "BTC";

const NETWORK_META: Record<Network, {
  label: string; sublabel: string; icon: string;
  color: string; bg: string; border: string; explorerBase: string; explorerName: string;
}> = {
  TRC20: {
    label: "USDT",        sublabel: "TRC20 · Tron Network",
    icon: "₮",            color: "#26a17b",
    bg: "rgba(38,161,123,0.1)",  border: "rgba(38,161,123,0.25)",
    explorerBase: "https://tronscan.org/#/transaction/", explorerName: "TronScan",
  },
  TRX: {
    label: "TRX",         sublabel: "TRX · Tron Network",
    icon: "◉",            color: "#ff060a",
    bg: "rgba(255,6,10,0.1)",  border: "rgba(255,6,10,0.25)",
    explorerBase: "https://tronscan.org/#/transaction/", explorerName: "TronScan",
  },
  ERC20: {
    label: "USDT",        sublabel: "ERC20 · Ethereum Network",
    icon: "Ξ",            color: "#627eea",
    bg: "rgba(98,126,234,0.1)",  border: "rgba(98,126,234,0.25)",
    explorerBase: "https://etherscan.io/tx/",            explorerName: "Etherscan",
  },
  BEP20: {
    label: "USDT",        sublabel: "BEP20 · BSC Network",
    icon: "B",            color: "#f0b90b",
    bg: "rgba(240,185,11,0.1)",  border: "rgba(240,185,11,0.25)",
    explorerBase: "https://bscscan.com/tx/",             explorerName: "BscScan",
  },
  ETH: {
    label: "Ethereum",    sublabel: "ETH · Ethereum Network",
    icon: "Ξ",            color: "#627eea",
    bg: "rgba(98,126,234,0.1)",  border: "rgba(98,126,234,0.25)",
    explorerBase: "https://etherscan.io/tx/",            explorerName: "Etherscan",
  },
  BNB: {
    label: "BNB",         sublabel: "BNB · BSC Network",
    icon: "◈",            color: "#f0b90b",
    bg: "rgba(240,185,11,0.1)",  border: "rgba(240,185,11,0.25)",
    explorerBase: "https://bscscan.com/tx/",             explorerName: "BscScan",
  },
  BTC: {
    label: "Bitcoin",     sublabel: "BTC · Bitcoin Network",
    icon: "₿",            color: "#f7931a",
    bg: "rgba(247,147,26,0.1)",  border: "rgba(247,147,26,0.25)",
    explorerBase: "https://www.blockchain.com/explorer/transactions/btc/", explorerName: "Blockchain.com",
  },
};

const NETWORKS_ORDER: Network[] = ["TRC20", "TRX", "ERC20", "BEP20", "ETH", "BNB", "BTC"];

export function DepositPage(): React.ReactElement {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [network, setNetwork] = useState<Network>("TRC20");
  const [copiedKey, setCopiedKey] = useState<string>("");
  const [history, setHistory] = useState<DepositRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // HD mode only for TRC20 and ERC20
  const hdMode = !!(user?.depositAddressTrc20) && (network === "TRC20" || network === "ERC20");

  const getAddress = (n: Network): string => {
    if (n === "TRC20") return user?.depositAddressTrc20 ?? WALLETS.TRC20.address;
    if (n === "ERC20") return user?.depositAddressErc20 ?? WALLETS.ERC20.address;
    return WALLETS[n].address;
  };

  const [showQr, setShowQr] = useState(false);
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [verifyMsg, setVerifyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setErr("الصورة يجب أن تكون أقل من 10 ميجابايت"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        setProofImage(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistory = async (): Promise<void> => {
    try {
      const rows = await api.get<DepositRow[]>("/deposits");
      setHistory(rows);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    void loadHistory();
    if (hdMode) {
      pollerRef.current = setInterval(() => { void loadHistory(); }, 30_000);
    }
    return () => { if (pollerRef.current) clearInterval(pollerRef.current); };
  }, [hdMode]);

  const copy = async (key: string, value: string): Promise<void> => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  const manualRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadHistory();
    setTimeout(() => setRefreshing(false), 600);
  };

  const submit = async (): Promise<void> => {
    setErr("");
    setVerifyMsg(null);
    const v = Number(amount);
    if (Number.isNaN(v) || v <= 0) { setErr("أدخل مبلغاً صحيحاً"); return; }
    if (txHash.trim().length < 10 && !proofImage) { setErr("أدخل رقم العملية أو ارفع صورة الإيداع"); return; }
    setLoading(true);
    try {
      await api.post("/deposits", {
        amount: v,
        txHash: txHash.trim() || null,
        network,
        proofImage: proofImage ?? null,
      });
      setAmount("");
      setTxHash("");
      setProofImage(null);
      setShowForm(false);
      setVerifyMsg({ ok: true, text: "تم إرسال طلبك — سيُراجع خلال 24 ساعة ⏳" });
      setTimeout(async () => { await loadHistory(); setVerifyMsg(null); }, 4000);
    } catch (e) {
      const msg = (e as Error).message;
      setErr(msg.includes("tx_already_used") ? "رقم العملية مستخدم من قبل" : msg);
    } finally {
      setLoading(false);
    }
  };

  const meta = NETWORK_META[network];
  const address = getAddress(network);

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
          <h1 className="text-xl font-extrabold leading-none">الإيداع</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>اختر شبكة وأرسل العملة</p>
        </div>
      </div>

      {/* HD banner */}
      {hdMode && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-5 text-xs font-bold"
          style={{ background: "rgba(34,197,94,0.08)", color: "var(--color-success)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <Zap size={13} />
          عنوانك الشخصي — سيُضاف الرصيد تلقائياً خلال دقيقتين ✨
        </div>
      )}

      {/* Network cards — vertical */}
      <div className="space-y-2.5 mb-5">
        {NETWORKS_ORDER.map((n) => {
          const m = NETWORK_META[n];
          const selected = network === n;
          return (
            <button
              key={n}
              onClick={() => { setNetwork(n); setShowForm(false); setErr(""); setVerifyMsg(null); setShowQr(false); }}
              className="w-full text-start transition active:scale-[0.99]"
              style={{
                background: selected ? m.bg : "var(--color-surface)",
                border: `1.5px solid ${selected ? m.color : "var(--color-border)"}`,
                borderRadius: "16px",
                padding: "13px 15px",
              }}
            >
              <div className="flex items-center gap-3">
                {/* Coin icon */}
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black"
                  style={{
                    background: m.bg,
                    border: `1px solid ${m.border}`,
                    color: m.color,
                    fontSize: n === "BNB" ? "20px" : "22px",
                  }}
                >
                  {m.icon}
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[15px] leading-none"
                    style={{ color: selected ? m.color : "var(--color-text)" }}>
                    {m.label}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{m.sublabel}</p>
                </div>

                {/* Radio dot */}
                <div
                  className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-all"
                  style={{
                    background: selected ? m.color : "transparent",
                    border: `2px solid ${selected ? m.color : "var(--color-border)"}`,
                  }}
                >
                  {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Address card */}
      <div className="rounded-2xl p-4 mb-4"
        style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-sm"
            style={{ background: meta.color, color: "#fff" }}>
            {meta.icon}
          </div>
          <p className="font-bold text-sm" style={{ color: meta.color }}>
            {hdMode ? "عنوانك الشخصي" : "عنوان الإيداع"} · {meta.sublabel}
          </p>
        </div>

        {/* QR Code */}
        {showQr && (
          <div className="flex flex-col items-center py-4 mb-3 rounded-2xl"
            style={{ background: "#ffffff" }}>
            <QRCodeSVG
              value={address}
              size={180}
              bgColor="#ffffff"
              fgColor="#111111"
              level="M"
              includeMargin
            />
            <p className="text-[10px] mt-2 font-mono text-center px-4"
              style={{ color: "#666", wordBreak: "break-all" }}>
              {address}
            </p>
          </div>
        )}

        {/* Address text */}
        {!showQr && (
          <div className="rounded-xl p-3 mb-3"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <code dir="ltr" className="text-[12px] break-all leading-relaxed font-mono block"
              style={{ color: "var(--color-text)" }}>
              {address}
            </code>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => copy(network, address)}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition"
            style={{
              background: copiedKey === network ? "rgba(34,197,94,0.15)" : meta.color,
              color: copiedKey === network ? "var(--color-success)" : "#fff",
              border: copiedKey === network ? "1px solid rgba(34,197,94,0.3)" : "none",
            }}
          >
            {copiedKey === network ? <Check size={15} /> : <Copy size={15} />}
            {copiedKey === network ? "تم النسخ ✓" : "نسخ"}
          </button>
          <button
            onClick={() => setShowQr(!showQr)}
            className="py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition"
            style={{
              background: showQr ? meta.bg : "var(--color-surface)",
              color: showQr ? meta.color : "var(--color-muted)",
              border: `1.5px solid ${showQr ? meta.color : "var(--color-border)"}`,
            }}
          >
            <QrCode size={16} />
            {showQr ? "إخفاء" : "QR"}
          </button>
        </div>
      </div>

      {/* Submit form — always visible for all users */}
      <div className="mb-5">
        {!showForm ? (
          <>
            {verifyMsg && (
              <div className="text-xs font-semibold px-3 py-2.5 rounded-xl mb-3" style={{
                background: verifyMsg.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                color: verifyMsg.ok ? "var(--color-success)" : "var(--color-danger)",
                border: `1px solid ${verifyMsg.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}>
                {verifyMsg.text}
              </div>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
            >
              <ArrowDownToLine size={16} />
              أرسلت العملة؟ أدخل رقم العملية (TXID)
            </button>
          </>
        ) : (
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <h2 className="font-bold text-sm">تأكيد الإيداع</h2>
            <p className="text-xs -mt-1" style={{ color: "var(--color-muted)" }}>
              الشبكة: <span className="font-bold" style={{ color: meta.color }}>{meta.sublabel}</span>
            </p>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--color-muted)" }}>
                المبلغ بالدولار
              </label>
              <input type="number" inputMode="decimal" className="input"
                placeholder="0.00" value={amount}
                onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--color-muted)" }}>
                رقم العملية (TXID / Hash) — اختياري
              </label>
              <input className="input" dir="ltr"
                placeholder="0x... أو T... أو رقم العملية"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)} />
            </div>

            {/* صورة إثبات الإيداع */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--color-muted)" }}>
                صورة إثبات الإيداع
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {proofImage ? (
                <div className="relative rounded-xl overflow-hidden border"
                  style={{ border: `1px solid ${meta.color}40` }}>
                  <img src={proofImage} alt="إثبات الإيداع" className="w-full max-h-48 object-contain" />
                  <button
                    type="button"
                    onClick={() => { setProofImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.85)" }}
                  >
                    <X size={13} color="#fff" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 rounded-xl flex flex-col items-center justify-center gap-2 transition"
                  style={{
                    background: "var(--color-surface-2)",
                    border: `1.5px dashed ${meta.color}60`,
                    color: meta.color,
                  }}
                >
                  <ImagePlus size={22} />
                  <span className="text-xs font-bold">ارفع صورة إثبات الإيداع</span>
                  <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>PNG · JPG · حتى 5 ميجابايت</span>
                </button>
              )}
            </div>

            {err && (
              <div className="text-xs font-semibold px-3 py-2 rounded-xl"
                style={{ background: "rgba(239,68,68,0.08)", color: "var(--color-danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {err}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); setErr(""); }}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: "var(--color-surface-2)", color: "var(--color-muted)" }}>
                إلغاء
              </button>
              <button onClick={submit} disabled={loading}
                className="py-2.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: meta.color, color: "#fff", flex: 2 }}>
                <ArrowDownToLine size={15} />
                {loading ? "جارٍ الإرسال…" : "إرسال الطلب"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold" style={{ color: "var(--color-muted)" }}>سجل الإيداعات</h2>
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
          <p className="text-sm">لا توجد إيداعات بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((d) => {
            const nm = NETWORK_META[d.network as Network] ?? NETWORK_META.TRC20;
            return (
              <div key={d.id} className="rounded-2xl p-4 space-y-3"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0"
                    style={{ background: nm.bg, color: nm.color, fontSize: "18px" }}>
                    {nm.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-extrabold text-lg leading-none">${Number(d.amount).toFixed(2)}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                      {d.network} · {new Date(d.createdAt).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{
                    background: d.status === "approved" ? "rgba(34,197,94,0.1)" : d.status === "rejected" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                    color: d.status === "approved" ? "var(--color-success)" : d.status === "rejected" ? "var(--color-danger)" : "var(--color-warning)",
                    border: `1px solid ${d.status === "approved" ? "rgba(34,197,94,0.2)" : d.status === "rejected" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                  }}>
                    {d.status === "approved" ? "✅ مقبول" : d.status === "rejected" ? "❌ مرفوض" : "⏳ معلق"}
                  </span>
                </div>

                {d.notes && (
                  <div className="text-[11px] font-semibold px-3 py-2 rounded-xl" style={{
                    background: d.status === "approved" ? "rgba(34,197,94,0.06)" : d.status === "rejected" ? "rgba(239,68,68,0.06)" : "rgba(212,175,55,0.06)",
                    color: d.status === "approved" ? "var(--color-success)" : d.status === "rejected" ? "var(--color-danger)" : "var(--color-warning)",
                    border: `1px solid ${d.status === "approved" ? "rgba(34,197,94,0.15)" : d.status === "rejected" ? "rgba(239,68,68,0.15)" : "rgba(212,175,55,0.15)"}`,
                  }}>
                    {d.notes}
                  </div>
                )}

                {d.txHash && (
                  <div className="rounded-xl p-3"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                    <p className="text-[10px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
                      رقم العملية
                    </p>
                    <code dir="ltr" className="text-[11px] break-all leading-relaxed block mb-2 font-mono"
                      style={{ color: "var(--color-muted)" }}>
                      {d.txHash}
                    </code>
                    <a href={`${nm.explorerBase}${d.txHash}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: nm.bg, color: nm.color, border: `1px solid ${nm.border}` }}>
                      <ExternalLink size={11} />
                      عرض على {nm.explorerName}
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
