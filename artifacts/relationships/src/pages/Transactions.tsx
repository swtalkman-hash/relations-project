import React from "react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api } from "../lib/api";
import { t } from "../lib/i18n";

type Tx = {
  id: string;
  type: string;
  amount: string;
  description: string;
  createdAt: string;
};

const ICONS: Record<string, string> = {
  deposit: "⬇️",
  withdraw_request: "⬆️",
  withdraw_approved: "✅",
  withdraw_refund: "↩️",
  profit: "💰",
  invest: "📈",
  bonus: "🎁",
  ref_l1: "👥",
  ref_l2: "👥",
  ref_l3: "👥",
  wheel_prize: "🎡",
  task_reward: "✨",
};

export function TransactionsPage(): React.ReactElement {
  const [, navigate] = useLocation();
  const [items, setItems] = useState<Tx[] | null>(null);

  useEffect(() => {
    void api.get<Tx[]>("/me/transactions").then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <div className="px-4 pt-5 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate("/")} className="text-[var(--color-muted)]">←</button>
        <h1 className="text-2xl font-extrabold">{t("transactions")}</h1>
      </div>

      {items === null ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="shimmer h-16 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-[var(--color-muted)] mt-12">لا توجد معاملات بعد</p>
      ) : (
        <div className="space-y-2">
          {items.map((tx) => {
            const amt = Number(tx.amount);
            const positive = amt > 0;
            const typeKey = `type_${tx.type.startsWith("ref_") ? "ref" : tx.type}`;
            return (
              <div key={tx.id} className="card !p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-xl">
                  {ICONS[tx.type] ?? "•"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t(typeKey)}</p>
                  <p className="text-xs text-[var(--color-muted)] truncate">{tx.description}</p>
                  <p className="text-[10px] text-[var(--color-muted)]">{new Date(tx.createdAt).toLocaleString("ar-EG")}</p>
                </div>
                <p className={`font-bold ${amt === 0 ? "text-[var(--color-muted)]" : positive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                  {amt > 0 ? "+" : ""}{amt.toFixed(2)}$
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
