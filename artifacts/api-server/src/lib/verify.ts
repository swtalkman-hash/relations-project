const USDT_TRC20_CONTRACT  = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
export const ADMIN_TRC20   = "THyVPskhUwmnAXdSXJwR647iUgtrwBRHdB";
export const ADMIN_ERC20   = "0x57cEB0D7663550B611A10e3e5D2fBE916E217E21";
export const ADMIN_BTC     = "bc1qp3nu282zpfrkqu6d8d9sql2tv8f3haxev0qxsc";
const USDT_ERC20_CONTRACT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export type VerifyResult =
  | { ok: true;  actualAmount: number; note: string }
  | { ok: false; note: string }
  | { ok: null;  note: string };

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Ounsa-App/1.0" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function verifyTRC20(
  txHash: string,
  toAddress: string,
  claimedAmount: number,
): Promise<VerifyResult> {
  try {
    const data = await fetchJson(
      `https://apilist.tronscanapi.com/api/transaction-info?hash=${encodeURIComponent(txHash)}`,
    ) as Record<string, unknown>;

    const transfers = data["trc20TransferInfo"] as Array<Record<string, unknown>> | undefined;
    if (!transfers?.length) {
      return { ok: false, note: "لم يُعثر على تحويل TRC20 في هذه العملية" };
    }

    const usdtTransfer = transfers.find(
      (t) =>
        String(t["tokenInfo"] && (t["tokenInfo"] as Record<string,unknown>)["tokenId"]).toLowerCase() ===
          USDT_TRC20_CONTRACT.toLowerCase() ||
        String(t["symbol"]).toUpperCase() === "USDT",
    );
    if (!usdtTransfer) {
      return { ok: false, note: "العملة المحولة ليست USDT" };
    }

    const recipient = String(usdtTransfer["to_address"] ?? "").trim();
    if (recipient.toLowerCase() !== toAddress.toLowerCase()) {
      return {
        ok: false,
        note: `عنوان المستقبِل (${recipient.slice(0, 10)}…) لا يطابق عنوانك الشخصي`,
      };
    }

    const rawAmount = Number(usdtTransfer["amount_str"] ?? usdtTransfer["amount"] ?? 0);
    const actualAmount = rawAmount / 1_000_000;

    if (actualAmount < claimedAmount - 0.5) {
      return {
        ok: false,
        note: `المبلغ الفعلي (${actualAmount.toFixed(2)} USDT) أقل من المبلغ المُدخَل (${claimedAmount} USDT)`,
      };
    }

    return {
      ok: true,
      actualAmount,
      note: `تم التحقق تلقائياً — ${actualAmount.toFixed(2)} USDT عبر TRC20`,
    };
  } catch (err) {
    return { ok: null, note: `تعذّر الاتصال بـ TronScan: ${(err as Error).message}` };
  }
}

export async function verifyERC20(
  txHash: string,
  toAddress: string,
  claimedAmount: number,
): Promise<VerifyResult> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return { ok: null, note: "لم يُضبط مفتاح Etherscan — تحتاج مراجعة يدوية" };
  }

  try {
    const data = await fetchJson(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${encodeURIComponent(txHash)}&apikey=${apiKey}`,
    ) as { result?: { logs?: Array<{ address: string; topics: string[]; data: string }> } };

    const logs = data?.result?.logs ?? [];
    const transferLog = logs.find(
      (log) =>
        log.address.toLowerCase() === USDT_ERC20_CONTRACT &&
        log.topics[0]?.toLowerCase() === TRANSFER_TOPIC &&
        log.topics[2] &&
        "0x" + log.topics[2].slice(26).toLowerCase() === toAddress.toLowerCase(),
    );

    if (!transferLog) {
      return {
        ok: false,
        note: `لم يُعثر على تحويل USDT ERC20 إلى عنوانك في هذه العملية`,
      };
    }

    const rawAmount = parseInt(transferLog.data, 16);
    const actualAmount = rawAmount / 1_000_000;

    if (actualAmount < claimedAmount - 0.5) {
      return {
        ok: false,
        note: `المبلغ الفعلي (${actualAmount.toFixed(2)} USDT) أقل من المبلغ المُدخَل (${claimedAmount} USDT)`,
      };
    }

    return {
      ok: true,
      actualAmount,
      note: `تم التحقق تلقائياً — ${actualAmount.toFixed(2)} USDT عبر ERC20`,
    };
  } catch (err) {
    return { ok: null, note: `تعذّر الاتصال بـ Etherscan: ${(err as Error).message}` };
  }
}

export async function verifyBTC(
  txHash: string,
  toAddress: string,
  claimedAmountUsd: number,
): Promise<VerifyResult> {
  try {
    const data = await fetchJson(
      `https://blockchain.info/rawtx/${encodeURIComponent(txHash)}?cors=true`,
    ) as { out?: Array<{ addr?: string; value?: number }> };

    const outputs = data?.out ?? [];
    const matching = outputs.find(
      (o) => o.addr?.toLowerCase() === toAddress.toLowerCase(),
    );

    if (!matching) {
      return { ok: false, note: `لم يُعثر على تحويل BTC إلى عنوانك في هذه العملية` };
    }

    const btcAmount = (matching.value ?? 0) / 1e8;
    return {
      ok: true,
      actualAmount: claimedAmountUsd,
      note: `تم التحقق تلقائياً — ${btcAmount.toFixed(8)} BTC عبر Bitcoin Network`,
    };
  } catch (err) {
    return { ok: null, note: `تعذّر الاتصال بـ Blockchain.info: ${(err as Error).message}` };
  }
}

export async function verifyBEP20(
  txHash: string,
  toAddress: string,
  claimedAmount: number,
): Promise<VerifyResult> {
  const apiKey = process.env.BSCSCAN_API_KEY;
  if (!apiKey) {
    return { ok: null, note: "تحتاج مراجعة يدوية — BEP20 BSC" };
  }
  const USDT_BEP20_CONTRACT = "0x55d398326f99059ff775485246999027b3197955";
  try {
    const data = await fetchJson(
      `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=${encodeURIComponent(txHash)}&apikey=${apiKey}`,
    ) as { result?: { logs?: Array<{ address: string; topics: string[]; data: string }> } };
    const logs = data?.result?.logs ?? [];
    const transferLog = logs.find(
      (log) =>
        log.address.toLowerCase() === USDT_BEP20_CONTRACT &&
        log.topics[0]?.toLowerCase() === TRANSFER_TOPIC &&
        log.topics[2] &&
        "0x" + log.topics[2].slice(26).toLowerCase() === toAddress.toLowerCase(),
    );
    if (!transferLog) return { ok: false, note: "لم يُعثر على تحويل USDT BEP20 إلى عنوانك" };
    const rawAmount = parseInt(transferLog.data, 16);
    const actualAmount = rawAmount / 1e18;
    if (actualAmount < claimedAmount - 0.5) {
      return { ok: false, note: `المبلغ الفعلي (${actualAmount.toFixed(2)}) أقل من المُدخَل (${claimedAmount})` };
    }
    return { ok: true, actualAmount, note: `تم التحقق تلقائياً — ${actualAmount.toFixed(2)} USDT عبر BEP20` };
  } catch (err) {
    return { ok: null, note: `تعذّر الاتصال بـ BscScan: ${(err as Error).message}` };
  }
}

export async function verifyETH(
  txHash: string,
  toAddress: string,
  claimedAmountUsd: number,
): Promise<VerifyResult> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return { ok: null, note: "تحتاج مراجعة يدوية — ETH" };
  }
  try {
    const data = await fetchJson(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${encodeURIComponent(txHash)}&apikey=${apiKey}`,
    ) as { result?: { to?: string; value?: string } };
    const tx = data?.result;
    if (!tx || tx.to?.toLowerCase() !== toAddress.toLowerCase()) {
      return { ok: false, note: "العنوان المستقبِل لا يطابق عنوانك" };
    }
    const ethAmount = parseInt(tx.value ?? "0", 16) / 1e18;
    return { ok: true, actualAmount: claimedAmountUsd, note: `تم التحقق — ${ethAmount.toFixed(6)} ETH` };
  } catch (err) {
    return { ok: null, note: `تعذّر الاتصال بـ Etherscan: ${(err as Error).message}` };
  }
}

export async function verifyBNB(
  txHash: string,
  toAddress: string,
  claimedAmountUsd: number,
): Promise<VerifyResult> {
  const apiKey = process.env.BSCSCAN_API_KEY;
  if (!apiKey) {
    return { ok: null, note: "تحتاج مراجعة يدوية — BNB" };
  }
  try {
    const data = await fetchJson(
      `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${encodeURIComponent(txHash)}&apikey=${apiKey}`,
    ) as { result?: { to?: string; value?: string } };
    const tx = data?.result;
    if (!tx || tx.to?.toLowerCase() !== toAddress.toLowerCase()) {
      return { ok: false, note: "العنوان المستقبِل لا يطابق عنوانك" };
    }
    const bnbAmount = parseInt(tx.value ?? "0", 16) / 1e18;
    return { ok: true, actualAmount: claimedAmountUsd, note: `تم التحقق — ${bnbAmount.toFixed(6)} BNB` };
  } catch (err) {
    return { ok: null, note: `تعذّر الاتصال بـ BscScan: ${(err as Error).message}` };
  }
}

export async function verifyDeposit(
  network: string,
  txHash: string,
  toAddress: string,
  claimedAmount: number,
): Promise<VerifyResult> {
  if (network === "TRC20")  return verifyTRC20(txHash, toAddress, claimedAmount);
  if (network === "TRX")    return verifyTRC20(txHash, toAddress, claimedAmount);
  if (network === "ERC20")  return verifyERC20(txHash, toAddress, claimedAmount);
  if (network === "BTC")    return verifyBTC(txHash, toAddress, claimedAmount);
  if (network === "BEP20")  return verifyBEP20(txHash, toAddress, claimedAmount);
  if (network === "ETH")    return verifyETH(txHash, toAddress, claimedAmount);
  if (network === "BNB")    return verifyBNB(txHash, toAddress, claimedAmount);
  return { ok: null, note: `شبكة غير معروفة: ${network}` };
}
