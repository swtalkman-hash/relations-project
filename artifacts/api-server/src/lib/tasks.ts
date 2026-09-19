export type TaskDef = {
  key: string;
  title: string;
  description: string;
  reward: number;
};

export const DAILY_TASKS: TaskDef[] = [
  {
    key: "daily_login",
    title: "تسجيل الدخول اليومي",
    description: "افتح التطبيق كل يوم لكسب مكافأة",
    reward: 0.1,
  },
  {
    key: "share_link",
    title: "مشاركة رابط الدعوة",
    description: "شارك رابط دعوتك مع صديق",
    reward: 0.2,
  },
  {
    key: "check_prices",
    title: "تفقد أسعار الذهب والعملات",
    description: "اطلع على آخر الأسعار في السوق",
    reward: 0.05,
  },
  {
    key: "view_referrals",
    title: "زيارة صفحة الفريق",
    description: "تحقق من أعضاء فريقك وأرباحك",
    reward: 0.05,
  },
];

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
