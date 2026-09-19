import React from "react";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "../lib/api";
import { t } from "../lib/i18n";

type Crypto = { symbol: string; name: string; price: number; change24h: number; image: string | null };
type Gold = { pricePerOunce: number; pricePerGram: number; currency: string; updatedAt: string };

export function PricesPage(): React.ReactElement {
  const [, navigate] = useLocation();
  const [cryptos, setCryptos] = useState<Crypto[] | null>(null);
  const [gold, setGold] = useState<Gold | null>(null);
  const [err, setErr] = useState(false);

  const load = async (): Promise<void> => {
    try {
      const [c, g] = await Promise.all([
        api.get<Crypto[]>("/prices/crypto"),
        api.get<Gold>("/prices/gold"),
      ]);
      setCryptos(c);
      setGold(g);
    } catch {
      setErr(true);
    }
  };
  useEffect(() => {
    void load();
    const i = setInterval(load, 60_000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="px-4 pt-5 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate("/")} className="text-[var(--color-muted)]">←</button>
        <h1 className="text-2xl font-extrabold">{t("prices")}</h1>
      </div>

      <div className="card overflow-hidden p-0 mb-4 relative">
        <img src="/brand/gold-chart.jpg" alt="" className="w-full h-32 object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent" />
        <div className="p-4 -mt-12 relative">
          <p className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider mb-1">{t("gold_price")}</p>
          {gold ? (
            <>
              <p className="text-3xl font-extrabold gold-text">${gold.pricePerOunce.toFixed(2)}</p>
              <p className="text-xs text-[var(--color-muted)]">{t("per_ounce")} · ${gold.pricePerGram.toFixed(2)} {t("per_gram")}</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">{t("last_updated")}: {new Date(gold.updatedAt).toLocaleTimeString("ar-EG")}</p>
            </>
          ) : err ? (
            <p className="text-sm text-[var(--color-muted)]">تعذر تحميل السعر</p>
          ) : (
            <div className="shimmer h-10 rounded" />
          )}
        </div>
      </div>

      <h2 className="text-sm font-bold text-[var(--color-muted)] mb-2">{t("crypto_prices")}</h2>
      <div className="space-y-2">
        {cryptos === null && !err ? (
          [...Array(6)].map((_, i) => <div key={i} className="shimmer h-16 rounded-2xl" />)
        ) : err ? (
          <p className="text-sm text-[var(--color-muted)]">تعذر تحميل الأسعار</p>
        ) : (
          cryptos!.map((c) => (
            <div key={c.symbol} className="card !p-3 flex items-center gap-3">
              {c.image && <img src={c.image} alt={c.symbol} className="w-9 h-9 rounded-full" />}
              <div className="flex-1">
                <p className="font-bold text-sm">{c.name}</p>
                <p className="text-xs text-[var(--color-muted)]">{c.symbol}</p>
              </div>
              <div className="text-end">
                <p className="font-bold">${c.price.toLocaleString(undefined, { maximumFractionDigits: c.price < 1 ? 4 : 2 })}</p>
                <p className={`text-xs flex items-center gap-0.5 justify-end ${c.change24h >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                  {c.change24h >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {c.change24h.toFixed(2)}%
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
