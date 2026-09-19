import { eq, isNotNull, and } from "drizzle-orm";
import { db, depositsTable, usersTable } from "@workspace/db";
import { logger } from "./logger";
import { approveDeposit } from "./deposit-approve";
import { generateId } from "./auth";
import { getMnemonic } from "./wallet";

const POLL_INTERVAL_MS    = 2 * 60 * 1000;
const MAX_AGE_HOURS       = 48;
const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const USDT_ERC20_CONTRACT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const USDT_BEP20_CONTRACT = "0x55d398326f99059ff775485246999027b3197955";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": "GoldInvestment/1.0" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function isAlreadyProcessed(txHash: string): Promise<boolean> {
  const [row] = await db
    .select({ id: depositsTable.id })
    .from(depositsTable)
    .where(eq(depositsTable.txHash, txHash));
  return !!row;
}

async function recordDeposit(userId: string, txHash: string, amount: number, network: string): Promise<void> {
  const [deposit] = await db
    .insert(depositsTable)
    .values({
      id: generateId("d_"),
      userId,
      amount: String(amount),
      txHash,
      network,
      status: "pending",
      notes: `تم الكشف تلقائياً من البلوكشين`,
    })
    .returning();
  await approveDeposit(deposit.id);
  logger.info({ userId, txHash, amount, network }, "deposit-poller: auto-detected and approved");
}

// ── TRC20 ──────────────────────────────────────────────────────────────────────
type TronTransfer = { transaction_id: string; to_address: string; quant: string };

async function checkUserTRC20(userId: string, address: string): Promise<void> {
  try {
    const data = await fetchJson(
      `https://apilist.tronscanapi.com/api/token_trc20/transfers?relatedAddress=${encodeURIComponent(address)}&token=${USDT_TRC20_CONTRACT}&direction=in&start=0&limit=20`,
    ) as { token_transfers?: TronTransfer[] };
    for (const tx of data.token_transfers ?? []) {
      if (tx.to_address?.toLowerCase() !== address.toLowerCase()) continue;
      if (!tx.transaction_id || await isAlreadyProcessed(tx.transaction_id)) continue;
      const amount = Number(tx.quant) / 1_000_000;
      if (amount < 0.01) continue;
      await recordDeposit(userId, tx.transaction_id, amount, "TRC20");
    }
  } catch (err) {
    logger.warn({ userId, err }, "deposit-poller: TRC20 check failed");
  }
}

// ── ERC20 (USDT on Ethereum) ───────────────────────────────────────────────────
type EthTokenTx = { hash: string; to: string; value: string; tokenDecimal: string };

async function checkUserERC20(userId: string, address: string): Promise<void> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) return;
  try {
    const data = await fetchJson(
      `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${USDT_ERC20_CONTRACT}&address=${encodeURIComponent(address)}&sort=desc&page=1&offset=20&apikey=${apiKey}`,
    ) as { result?: EthTokenTx[] };
    for (const tx of Array.isArray(data.result) ? data.result : []) {
      if (tx.to?.toLowerCase() !== address.toLowerCase()) continue;
      if (await isAlreadyProcessed(tx.hash)) continue;
      const decimals = Number(tx.tokenDecimal ?? 6);
      const amount = Number(tx.value) / Math.pow(10, decimals);
      if (amount < 0.01) continue;
      await recordDeposit(userId, tx.hash, amount, "ERC20");
    }
  } catch (err) {
    logger.warn({ userId, err }, "deposit-poller: ERC20 check failed");
  }
}

// ── BEP20 (USDT on BSC) ────────────────────────────────────────────────────────
async function checkUserBEP20(userId: string, address: string): Promise<void> {
  const apiKey = process.env.BSCSCAN_API_KEY ?? "";
  try {
    const url = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${USDT_BEP20_CONTRACT}&address=${encodeURIComponent(address)}&sort=desc&page=1&offset=20${apiKey ? `&apikey=${apiKey}` : ""}`;
    const data = await fetchJson(url) as { result?: EthTokenTx[]; status?: string };
    if (!Array.isArray(data.result)) return;
    for (const tx of data.result) {
      if (tx.to?.toLowerCase() !== address.toLowerCase()) continue;
      if (await isAlreadyProcessed(tx.hash)) continue;
      const decimals = Number(tx.tokenDecimal ?? 18);
      const amount = Number(tx.value) / Math.pow(10, decimals);
      if (amount < 0.01) continue;
      await recordDeposit(userId, tx.hash, amount, "BEP20");
    }
  } catch (err) {
    logger.warn({ userId, err }, "deposit-poller: BEP20 check failed");
  }
}

// ── ETH (native Ether) ─────────────────────────────────────────────────────────
type EthTx = { hash: string; to: string; value: string; isError: string };

async function checkUserETH(userId: string, address: string): Promise<void> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) return;
  try {
    const data = await fetchJson(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${encodeURIComponent(address)}&sort=desc&page=1&offset=20&apikey=${apiKey}`,
    ) as { result?: EthTx[] };
    for (const tx of Array.isArray(data.result) ? data.result : []) {
      if (tx.to?.toLowerCase() !== address.toLowerCase()) continue;
      if (tx.isError === "1") continue;
      if (await isAlreadyProcessed(tx.hash)) continue;
      const amount = Number(BigInt(tx.value)) / 1e18;
      if (amount < 0.0001) continue;
      await recordDeposit(userId, tx.hash, amount, "ETH");
    }
  } catch (err) {
    logger.warn({ userId, err }, "deposit-poller: ETH check failed");
  }
}

// ── BNB (native BNB on BSC) ────────────────────────────────────────────────────
async function checkUserBNB(userId: string, address: string): Promise<void> {
  const apiKey = process.env.BSCSCAN_API_KEY ?? "";
  try {
    const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${encodeURIComponent(address)}&sort=desc&page=1&offset=20${apiKey ? `&apikey=${apiKey}` : ""}`;
    const data = await fetchJson(url) as { result?: EthTx[]; status?: string };
    if (!Array.isArray(data.result)) return;
    for (const tx of data.result) {
      if (tx.to?.toLowerCase() !== address.toLowerCase()) continue;
      if (tx.isError === "1") continue;
      if (await isAlreadyProcessed(tx.hash)) continue;
      const amount = Number(BigInt(tx.value)) / 1e18;
      if (amount < 0.0001) continue;
      await recordDeposit(userId, tx.hash, amount, "BNB");
    }
  } catch (err) {
    logger.warn({ userId, err }, "deposit-poller: BNB check failed");
  }
}

// ── BTC (native Bitcoin via mempool.space — no API key needed) ─────────────────
type MempoolTx = {
  txid: string;
  status: { confirmed: boolean };
  vout: Array<{ scriptpubkey_address?: string; value: number }>;
};

async function checkUserBTC(userId: string, address: string): Promise<void> {
  try {
    const data = await fetchJson(
      `https://mempool.space/api/address/${encodeURIComponent(address)}/txs`,
    ) as MempoolTx[];
    for (const tx of data) {
      if (!tx.status?.confirmed) continue;
      const matching = tx.vout.find(o => o.scriptpubkey_address === address);
      if (!matching) continue;
      if (await isAlreadyProcessed(tx.txid)) continue;
      const btcAmount = matching.value / 1e8;
      if (btcAmount < 0.000001) continue;
      // Record in BTC terms but store as-is; admin sees BTC amount
      await recordDeposit(userId, tx.txid, btcAmount, "BTC");
    }
  } catch (err) {
    logger.warn({ userId, err }, "deposit-poller: BTC check failed");
  }
}

// ── Main polling loop ──────────────────────────────────────────────────────────
async function pollAllAddresses(): Promise<void> {
  const users = await db
    .select({
      id: usersTable.id,
      trc20: usersTable.depositAddressTrc20,
      erc20: usersTable.depositAddressErc20,
      btc:   usersTable.depositAddressBtc,
    })
    .from(usersTable)
    .where(isNotNull(usersTable.depositAddressTrc20));

  if (users.length === 0) return;
  logger.info({ count: users.length }, "deposit-poller: scanning all user addresses");

  for (const user of users) {
    if (user.trc20) await checkUserTRC20(user.id, user.trc20);
    await sleep(200);
    if (user.erc20) {
      await checkUserERC20(user.id, user.erc20);
      await sleep(200);
      await checkUserBEP20(user.id, user.erc20);
      await sleep(200);
      await checkUserETH(user.id, user.erc20);
      await sleep(200);
      await checkUserBNB(user.id, user.erc20);
      await sleep(200);
    }
    if (user.btc) {
      await checkUserBTC(user.id, user.btc);
      await sleep(200);
    }
  }
}

async function pollCycle(): Promise<void> {
  if (getMnemonic()) {
    await pollAllAddresses();
  } else {
    await checkPendingDeposits();
  }
}

export function startDepositPoller(): void {
  void pollCycle();
  setInterval(() => { void pollCycle(); }, POLL_INTERVAL_MS);
  const mode = getMnemonic() ? "HD wallet — all 6 networks auto" : "txHash mode";
  logger.info({ intervalMs: POLL_INTERVAL_MS }, `deposit-poller: started (${mode})`);
}

// ── Fallback txHash poller (used when HD_MNEMONIC not set) ────────────────────
import { verifyDeposit, ADMIN_TRC20, ADMIN_ERC20, ADMIN_BTC } from "./verify";

async function checkPendingDeposits(): Promise<void> {
  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000);
  const pending = await db
    .select()
    .from(depositsTable)
    .where(and(eq(depositsTable.status, "pending"), isNotNull(depositsTable.txHash)));

  const fresh = pending.filter((d) => new Date(d.createdAt) >= cutoff);
  if (fresh.length === 0) return;

  for (const dep of fresh) {
    if (!dep.txHash) continue;
    try {
      const toAddress =
        dep.network === "TRC20" ? ADMIN_TRC20 :
        dep.network === "BTC"   ? ADMIN_BTC   : ADMIN_ERC20;
      const result = await verifyDeposit(dep.network, dep.txHash, toAddress, Number(dep.amount));
      if (result.ok === true) {
        await approveDeposit(dep.id);
        await db.update(depositsTable).set({ notes: result.note }).where(eq(depositsTable.id, dep.id));
      } else if (result.ok === false) {
        await db.update(depositsTable).set({ notes: result.note }).where(eq(depositsTable.id, dep.id));
      }
    } catch (err) {
      logger.warn({ depositId: dep.id, err }, "deposit-poller: error");
    }
  }
}
