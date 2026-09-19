import React from "react";
import { t } from "../lib/i18n";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }): React.ReactElement {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };
  return (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 rounded-full gold-bg flex items-center justify-center text-[var(--color-bg)] font-extrabold">
        G
      </div>
      <span className={`gold-text font-extrabold ${sizes[size]}`}>{t("app_name")}</span>
    </div>
  );
}
