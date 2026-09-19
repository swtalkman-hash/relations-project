export type LevelDef = {
  level: number;
  name: string;
  minAmount: number;
  maxAmount: number;
  dailyMinRate: number;
  dailyMaxRate: number;
  teamRequired: number;
};

export const LEVELS: LevelDef[] = [
  {
    level: 1,
    name: "Bronze",
    minAmount: 3,
    maxAmount: 500,
    dailyMinRate: 0.018,
    dailyMaxRate: 0.028,
    teamRequired: 0,
  },
  {
    level: 2,
    name: "Silver",
    minAmount: 500,
    maxAmount: 5000,
    dailyMinRate: 0.024,
    dailyMaxRate: 0.034,
    teamRequired: 5,
  },
  {
    level: 3,
    name: "Gold",
    minAmount: 5000,
    maxAmount: 10000,
    dailyMinRate: 0.028,
    dailyMaxRate: 0.038,
    teamRequired: 15,
  },
];

export function levelForAmount(amount: number): LevelDef | null {
  // أعلى مستوى يؤهّل له المبلغ (بدون سقف أعلى)
  let best: LevelDef | null = null;
  for (const lvl of LEVELS) {
    if (amount >= lvl.minAmount) best = lvl;
  }
  return best;
}

export const REFERRAL_RATES = [0.1, 0.03, 0.01];
export const TEAM_PROFIT_RATES = [0.10, 0.05, 0.02];
export const TEAM_ACTIVE_DEPOSIT_MIN = 50;
export const QUALIFY_DEPOSIT = 125;
export const SIGNUP_BONUS = 3;
export const MIN_WITHDRAWAL = 20;
export const FEE_BEFORE_DOUBLE = 0.25;
export const FEE_AFTER_DOUBLE = 0.05;
