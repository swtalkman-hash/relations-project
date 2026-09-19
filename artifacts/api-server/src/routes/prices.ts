import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

type CacheEntry<T> = { value: T; at: number };
const cache = new Map<string, CacheEntry<unknown>>();
const TTL = 30_000;

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const value = await fn();
  cache.set(key, { value, at: Date.now() });
  return value;
}

router.get("/prices/crypto", async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await cached("crypto", async () => {
      const url =
        "https://api.coingecko.com/api/v3/coins/markets" +
        "?vs_currency=usd" +
        "&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot" +
        "&order=market_cap_desc&per_page=9&page=1&sparkline=false&price_change_percentage=24h";
      const r = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw new Error(`coingecko_${r.status}`);
      const coins = (await r.json()) as Array<{
        symbol: string;
        name: string;
        current_price: number;
        price_change_percentage_24h: number;
        image: string;
      }>;
      return coins.map(c => ({
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        price: c.current_price,
        change24h: c.price_change_percentage_24h ?? 0,
        image: c.image ?? null,
      }));
    });

    res.json(data);
  } catch (err) {
    req.log.warn({ err }, "crypto prices failed");
    res.status(502).json({ error: "prices_unavailable" });
  }
});

router.get("/prices/gold", async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await cached("gold", async () => {
      const r = await fetch(
        "https://api.coinbase.com/v2/prices/XAU-USD/spot",
        { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) },
      );
      if (!r.ok) throw new Error(`coinbase_${r.status}`);
      const json = (await r.json()) as { data: { amount: string; currency: string } };
      const ounce = parseFloat(json.data.amount);
      return { ounce };
    });

    res.json({
      pricePerOunce: data.ounce,
      pricePerGram: +(data.ounce / 31.1035).toFixed(2),
      currency: "USD",
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.warn({ err }, "gold price failed");
    res.status(502).json({ error: "prices_unavailable" });
  }
});

export default router;
