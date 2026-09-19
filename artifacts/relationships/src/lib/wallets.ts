export const WALLETS = {
  TRC20: {
    address: "THyVPskhUwmnAXdSXJwR647iUgtrwBRHdB",
    label: "USDT TRC20",
  },
  TRX: {
    address: "TYuWUgcNWVZiQDuzqGhbTeAYcikLgTqEq2",
    label: "TRX",
  },
  ERC20: {
    address: "0x57ceb0d7663550b611a10e3e5d2fbe916e217e21",
    label: "USDT ERC20",
  },
  BEP20: {
    address: "0x57ceb0d7663550b611a10e3e5d2fbe916e217e21",
    label: "USDT BEP20",
  },
  ETH: {
    address: "0x57ceb0d7663550b611a10e3e5d2fbe916e217e21",
    label: "Ethereum",
  },
  BNB: {
    address: "0x57ceb0d7663550b611a10e3e5d2fbe916e217e21",
    label: "BNB",
  },
  BTC: {
    address: "bc1qp3nu282zpfrkqu6d8d9sql2tv8f3haxev0qxsc",
    label: "Bitcoin BTC",
  },
} as const;

export type Network = keyof typeof WALLETS;
