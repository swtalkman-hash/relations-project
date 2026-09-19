import React, { useEffect, useState } from "react";
import { KeyRound, Save, Eye, EyeOff, CheckCircle, AlertTriangle, Wallet } from "lucide-react";
import { api } from "../lib/api";

export function SettingsPage(): React.ReactElement {
  const [mnemonic, setMnemonic] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saved, setSaved] = useState(false);

  const wordCount = mnemonic.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    let alive = true;
    void api.get<{ mnemonic: string | null }>("/admin/mnemonic").then((data) => {
      if (!alive) return;
      if (data.mnemonic) setMnemonic(data.mnemonic);
    }).catch(() => null).finally(() => {
      if (alive) setLoadingCurrent(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const save = async (): Promise<void> => {
    if (wordCount !== 12) {
      setMsg({ ok: false, text: "يجب إدخال 12 كلمة بالضبط" });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await api.post("/admin/set-mnemonic", { mnemonic: mnemonic.trim() });
      setSaved(true);
      setMsg({ ok: true, text: "تم حفظ كلمات المحفظة بنجاح ✓ سيتم توليد عناوين الإيداع تلقائياً" });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Page header */}
      <div className="page-header">
        <div className="page-header-icon" style={{ background: "rgba(168,85,247,0.12)" }}>
          <KeyRound size={18} style={{ color: "#a855f7" }} />
        </div>
        <div>
          <p className="page-header-title">إعدادات الإيداع</p>
          <p className="page-header-sub">إعداد محفظة HD لتوليد عناوين إيداع خاصة بكل مستخدم</p>
        </div>
      </div>

      {/* Info banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-2xl text-[13px]"
        style={{
          background: "rgba(59,130,246,0.07)",
          border: "1px solid rgba(59,130,246,0.25)",
          color: "var(--color-info)",
        }}
      >
        <Wallet size={16} className="shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">كيفية العمل</p>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
            يستخدم النظام محفظة HD (Hierarchical Deterministic) لتوليد عنوان إيداع فريد لكل مستخدم
            تلقائياً. أدخل الـ 12 كلمة السرية للمحفظة مرة واحدة وسيتولى النظام الباقي.
            بعد الحفظ يُرجى الاحتفاظ بهذه الكلمات في مكان آمن.
          </p>
        </div>
      </div>

      {/* Mnemonic form */}
      <div className="card space-y-5">
        <div>
          <p className="text-[13px] font-bold mb-1">كلمات المحفظة السرية (Seed Phrase)</p>
          <p className="text-[11px] mb-3" style={{ color: "var(--color-muted)" }}>
            {loadingCurrent ? "جاري تحميل الكلمات المحفوظة..." : saved ? "تم تفعيل الإيداع التلقائي" : "يمكنك تعديل الكلمات ثم حفظها مرة واحدة فقط"}
          </p>
          <div className="relative">
            <textarea
              rows={3}
              value={mnemonic}
              onChange={(e) => { setMnemonic(e.target.value); setMsg(null); }}
              placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
              dir="ltr"
              className="w-full px-4 py-3 rounded-xl text-[13px] font-mono resize-none"
              style={{
                background: "var(--color-surface-2)",
                border: `1.5px solid ${msg?.ok === false ? "rgba(239,68,68,0.5)" : msg?.ok ? "rgba(34,197,94,0.5)" : "var(--color-border)"}`,
                color: show ? "var(--color-text)" : "transparent",
                textShadow: show ? "none" : "0 0 8px rgba(255,255,255,0.5)",
                outline: "none",
                letterSpacing: show ? "normal" : "0.15em",
              }}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-3 left-3"
              style={{ color: "var(--color-muted)" }}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Word count indicator */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 w-5 rounded-full transition-all"
                  style={{
                    background: i < wordCount
                      ? wordCount === 12 ? "var(--color-success)" : "var(--color-warning)"
                      : "var(--color-border)",
                  }}
                />
              ))}
            </div>
            <span
              className="text-[11px] font-bold"
              style={{
                color: wordCount === 12 ? "var(--color-success)"
                  : wordCount > 0 ? "var(--color-warning)"
                  : "var(--color-muted)",
              }}
            >
              {wordCount} / 12 كلمة
            </span>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div
            className="flex items-center gap-2 p-3 rounded-xl text-[13px] font-semibold"
            style={{
              background: msg.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${msg.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              color: msg.ok ? "var(--color-success)" : "var(--color-danger)",
            }}
          >
            {msg.ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {msg.text}
          </div>
        )}

        <button
          onClick={() => void save()}
          disabled={loading || wordCount !== 12 || loadingCurrent}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-[14px] transition"
          style={{
            background: wordCount === 12 ? "linear-gradient(135deg, #f5e070, #d4af37 50%, #9a7010)" : "var(--color-surface-2)",
            color: wordCount === 12 ? "#06060e" : "var(--color-muted)",
            border: wordCount === 12 ? "none" : "1px solid var(--color-border)",
            opacity: loading ? 0.7 : 1,
            cursor: wordCount !== 12 ? "not-allowed" : "pointer",
          }}
        >
          <Save size={15} />
          {loading ? "جارٍ الحفظ..." : "حفظ وتفعيل"}
        </button>
      </div>

      {/* Warning */}
      <div
        className="flex items-start gap-3 p-4 rounded-2xl text-[12px]"
        style={{
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
        <div style={{ color: "var(--color-muted)" }} className="leading-relaxed">
          <span className="font-bold" style={{ color: "var(--color-warning)" }}>تحذير أمني:</span>{" "}
          لا تشارك هذه الكلمات مع أي شخص. من يملك هذه الكلمات يملك السيطرة الكاملة على جميع عناوين الإيداع.
          تأكد من حفظها في مكان آمن وغير متصل بالإنترنت.
        </div>
      </div>
    </div>
  );
}
