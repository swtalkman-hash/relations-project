import { ethers } from "ethers";
import crypto from "node:crypto";

// ── Base58 + Tron ──────────────────────────────────────────────────────────────
function sha256(buf: Buffer): Buffer {
  return crypto.createHash("sha256").update(buf).digest();
}

const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Encode(buf: Buffer): string {
  let n = BigInt("0x" + buf.toString("hex"));
  let result = "";
  while (n > 0n) {
    result = BASE58_CHARS[Number(n % 58n)] + result;
    n = n / 58n;
  }
  for (const byte of buf) {
    if (byte === 0) result = "1" + result;
    else break;
  }
  return result;
}

function ethToTron(ethAddress: string): string {
  const hex = ethAddress.slice(2).toLowerCase();
  const raw = Buffer.from("41" + hex, "hex");
  const checksum = sha256(sha256(raw)).slice(0, 4);
  return base58Encode(Buffer.concat([raw, checksum]));
}

// ── Bech32 (Bitcoin P2WPKH bc1q...) ───────────────────────────────────────────
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(v: number[]): number {
  let chk = 1;
  for (const val of v) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ val;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= BECH32_GEN[i];
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const r: number[] = [];
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) >> 5);
  r.push(0);
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) & 31);
  return r;
}

function bech32Checksum(hrp: string, data: number[]): number[] {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const poly = bech32Polymod(values) ^ 1;
  return Array.from({ length: 6 }, (_, i) => (poly >> (5 * (5 - i))) & 31);
}

function convertBits(data: Buffer, from: number, to: number): number[] {
  let acc = 0, bits = 0;
  const ret: number[] = [];
  const maxv = (1 << to) - 1;
  for (const val of data) {
    acc = (acc << from) | val;
    bits += from;
    while (bits >= to) { bits -= to; ret.push((acc >> bits) & maxv); }
  }
  if (bits > 0) ret.push((acc << (to - bits)) & maxv);
  return ret;
}

function pubKeyToP2WPKH(pubKeyHex: string): string {
  const pub = Buffer.from(pubKeyHex.replace("0x", ""), "hex");
  const sha = crypto.createHash("sha256").update(pub).digest();
  const hash160 = crypto.createHash("ripemd160").update(sha).digest();
  const data = [0].concat(convertBits(hash160, 8, 5));
  const checksum = bech32Checksum("bc", data);
  return "bc1" + data.concat(checksum).map(d => BECH32_CHARSET[d]).join("");
}

// ── Exports ────────────────────────────────────────────────────────────────────
export function getMnemonic(): string | null {
  return process.env.HD_MNEMONIC ?? null;
}

export function deriveAddresses(index: number): {
  trc20: string; erc20: string; btc: string;
} {
  const mnemonic = getMnemonic();
  if (!mnemonic) throw new Error("HD_MNEMONIC not set");

  // EVM path (Ethereum/TRC20/BEP20/BNB)
  const evmNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${index}`);
  const erc20 = evmNode.address;
  const trc20 = ethToTron(erc20);

  // BTC native SegWit path (BIP84 - Trust Wallet standard)
  const btcNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/84'/0'/0'/0/${index}`);
  const btc = pubKeyToP2WPKH(btcNode.publicKey);

  return { trc20, erc20, btc };
}
