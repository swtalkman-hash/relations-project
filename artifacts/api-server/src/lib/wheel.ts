export type WheelPrizeDef = {
  label: string;
  amount: number;
  isPhysical: boolean;
  weight: number;
};

// 8 جوائز للشبكة 3×3 (8 خلايا حدودية + المنتصف للزر)
export const WHEEL_PRIZES: WheelPrizeDef[] = [
  { label: "$5",          amount: 5,   isPhysical: false, weight: 220   },
  { label: "$10",         amount: 10,  isPhysical: false, weight: 22    },
  { label: "$20",         amount: 20,  isPhysical: false, weight: 15    },
  { label: "$50",         amount: 50,  isPhysical: false, weight: 8     },
  { label: "$100",        amount: 100, isPhysical: false, weight: 4     },
  { label: "iPhone 17 Pro", amount: 0, isPhysical: true,  weight: 0.008 },
  { label: "رولكس دايتونا", amount: 0, isPhysical: true,  weight: 0.008 },
  { label: "تويوتا كامري", amount: 0, isPhysical: true,  weight: 0.008 },
];

export function pickPrize(): WheelPrizeDef {
  const total = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of WHEEL_PRIZES) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return WHEEL_PRIZES[0];
}
