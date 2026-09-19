import React from "react";
import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t } from "../lib/i18n";

const REASONS = [
  "welcome_opt_returns",
  "welcome_opt_safe",
  "welcome_opt_referrals",
  "welcome_opt_gold",
  "welcome_opt_friend",
  "welcome_opt_other",
];

export function WelcomeModal(): React.ReactElement | null {
  const { user, refresh } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  if (!user || user.welcomeShownAt) return null;

  const submit = async (reason: string): Promise<void> => {
    setSubmitting(true);
    setSelected(reason);
    try {
      await api.post("/me/welcome", { reason });
      await refresh();
    } catch {
      setSubmitting(false);
      setSelected(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card max-w-sm w-full pop">
        <div className="text-center mb-2">
          <div className="w-16 h-16 mx-auto rounded-full gold-bg flex items-center justify-center mb-3 text-3xl">
            👋
          </div>
          <h2 className="gold-text text-xl font-extrabold mb-1">{t("app_name")}</h2>
          <p className="text-[var(--color-muted)] text-sm">{t("welcome_q")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {REASONS.map((r) => (
            <button
              key={r}
              disabled={submitting}
              onClick={() => submit(r)}
              className={`p-3 rounded-xl border text-sm font-semibold transition ${
                selected === r
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)]"
              }`}
            >
              {t(r)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
