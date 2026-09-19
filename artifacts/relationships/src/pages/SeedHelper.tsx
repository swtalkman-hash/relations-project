import React, { useState } from "react";

export function SeedHelperPage(): React.ReactElement {
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const phrase = words.map(w => w.trim().toLowerCase()).join(" ").trim();
  const filled = words.filter(w => w.trim() !== "").length;
  const allFilled = filled === 12;

  function handleChange(index: number, value: string) {
    const updated = [...words];
    // if user pastes all 12 words in first box, split automatically
    const parts = value.trim().split(/\s+/);
    if (parts.length >= 12) {
      const newWords = parts.slice(0, 12);
      while (newWords.length < 12) newWords.push("");
      setWords(newWords);
      return;
    }
    updated[index] = value;
    setWords(updated);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(phrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit() {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/admin/set-mnemonic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic: phrase }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // fallback: just show copy
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Cairo, sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,215,0,0.2)",
          borderRadius: "20px",
          padding: "32px",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🔑</div>
          <h1 style={{ color: "#FFD700", fontSize: "22px", fontWeight: "bold", margin: 0 }}>
            أدخل كلمات المحفظة
          </h1>
          <p style={{ color: "#aaa", fontSize: "13px", marginTop: "8px" }}>
            أدخل كل كلمة في خانتها بالترتيب
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "32px" }}>
            <div style={{ fontSize: "60px", marginBottom: "16px" }}>✅</div>
            <h2 style={{ color: "#4ade80", fontSize: "20px" }}>تم الحفظ بنجاح!</h2>
            <p style={{ color: "#aaa", fontSize: "14px" }}>
              سيبدأ كل عميل الآن بالحصول على عنوان خاص به تلقائياً.
            </p>
            <button
              onClick={() => window.location.href = "/"}
              style={{
                marginTop: "20px",
                background: "#FFD700",
                color: "#000",
                border: "none",
                borderRadius: "12px",
                padding: "12px 32px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              الرجوع للتطبيق
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              {words.map((word, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      color: "#FFD700",
                      fontSize: "12px",
                      fontWeight: "bold",
                      minWidth: "20px",
                      textAlign: "center",
                    }}
                  >
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={word}
                    onChange={e => handleChange(i, e.target.value)}
                    placeholder={`كلمة ${i + 1}`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    style={{
                      flex: 1,
                      background: word.trim() ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${word.trim() ? "#FFD700" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: "8px",
                      padding: "8px 10px",
                      color: "#fff",
                      fontSize: "14px",
                      outline: "none",
                      direction: "ltr",
                      textAlign: "left",
                    }}
                  />
                </div>
              ))}
            </div>

            <div
              style={{
                background: "rgba(0,0,0,0.3)",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "16px",
                direction: "ltr",
                textAlign: "left",
              }}
            >
              <p style={{ color: "#aaa", fontSize: "11px", margin: "0 0 4px 0", textAlign: "right", direction: "rtl" }}>
                العبارة ({filled}/12 كلمة):
              </p>
              <p
                style={{
                  color: allFilled ? "#4ade80" : "#666",
                  fontSize: "13px",
                  margin: 0,
                  wordBreak: "break-all",
                  lineHeight: "1.6",
                  minHeight: "40px",
                }}
              >
                {allFilled ? phrase : (filled > 0 ? phrase + " ..." : "لم تُدخل أي كلمة بعد")}
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleCopy}
                disabled={!allFilled}
                style={{
                  flex: 1,
                  background: allFilled ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${allFilled ? "#FFD700" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: "12px",
                  padding: "12px",
                  color: allFilled ? "#FFD700" : "#555",
                  fontSize: "14px",
                  cursor: allFilled ? "pointer" : "not-allowed",
                  fontFamily: "Cairo, sans-serif",
                }}
              >
                {copied ? "✅ تم النسخ" : "📋 نسخ"}
              </button>

              <button
                onClick={handleSubmit}
                disabled={!allFilled}
                style={{
                  flex: 2,
                  background: allFilled
                    ? "linear-gradient(135deg, #FFD700, #FFA500)"
                    : "rgba(255,255,255,0.05)",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px",
                  color: allFilled ? "#000" : "#555",
                  fontSize: "15px",
                  fontWeight: "bold",
                  cursor: allFilled ? "pointer" : "not-allowed",
                  fontFamily: "Cairo, sans-serif",
                }}
              >
                حفظ وتفعيل ✨
              </button>
            </div>

            <p style={{ color: "#555", fontSize: "11px", textAlign: "center", marginTop: "12px" }}>
              🔒 الكلمات لا تُرسل لأي طرف ثالث — تُحفظ مشفّرة في السيرفر فقط
            </p>
          </>
        )}
      </div>
    </div>
  );
}
