import React from "react";
import { MessageCircle } from "lucide-react";
import { t } from "../lib/i18n";

export const TELEGRAM_USERNAME = "Dhfddgg";

export function SupportButton(): React.ReactElement {
  return (
    <a
      href={`https://t.me/${TELEGRAM_USERNAME}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("contact_support")}
      className="fixed bottom-24 left-4 z-30 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition"
      style={{
        background: "linear-gradient(135deg, #29b6f6 0%, #0288d1 100%)",
        boxShadow: "0 8px 24px -6px rgba(2, 136, 209, 0.6)",
      }}
    >
      <MessageCircle size={26} className="text-white" />
    </a>
  );
}
