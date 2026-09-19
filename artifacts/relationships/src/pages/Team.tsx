import React from "react";
import { useEffect, useState } from "react";
import { Copy, Check, Share2, Users, TrendingUp, Zap } from "lucide-react";
import { api } from "../lib/api";
import { t } from "../lib/i18n";

const DAILY_RATES = [
  { level: 1, rate: "10%", color: "#d4af37" },
  { level: 2, rate: "5%",  color: "#a8a9ad" },
  { level: 3, rate: "2%",  color: "#cd7f32" },
];

type Member = { id: string; name: string; joinedAt: string; totalDeposited: string; qualified: boolean };
type Tier = { count: number; commissionRate: number; totalEarned: string; members: Member[] };
type Summary = {
  code: string;
  link: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  totalCommission: string;
  activeDirectCount: number;
  level1: Tier;
  level2: Tier;
  level3: Tier;
};

export function TeamPage(): React.ReactElement {
  const [data, setData] = useState<Summary | null>(null);
  const [tab, setTab] = useState<1 | 2 | 3>(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void api.get<Summary>("/referrals").then(setData).catch(() => {});
  }, []);

  const fullLink = (): string => {
    if (!data) return "";
    if (data.link.startsWith("http")) return data.link;
    return `${window.location.origin}/?ref=${data.code}`;
  };

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(fullLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async (): Promise<void> => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Safe investment", text: "انضم إلى Safe investment واحصل على 3$ مجاناً", url: fullLink() });
      } catch {
        // ignore
      }
    } else {
      await copy();
    }
  };

  if (!data) return <div className="p-5"><div className="shimmer h-40 rounded-2xl" /></div>;

  const active = data[`level${tab}` as "level1" | "level2" | "level3"];

  return (
    <div className="px-4 pt-5 pb-8">
      <h1 className="text-2xl font-extrabold mb-4">{t("team")}</h1>

      {/* ── رابط الدعوة ── */}
      <div className="card space-y-3">
        <p className="text-xs text-[var(--color-muted)]">{t("referral_link")}</p>
        <div className="bg-[var(--color-surface-2)] rounded-xl p-3 flex items-center gap-2">
          <code dir="ltr" className="text-xs flex-1 break-all">{fullLink()}</code>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={copy} className="btn-ghost flex items-center justify-center gap-1.5 text-sm">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t("copied") : t("copy")}
          </button>
          <button onClick={share} className="btn-gold !py-3 flex items-center justify-center gap-1.5 text-sm">
            <Share2 size={14} />
            {t("share_link")}
          </button>
        </div>
      </div>

      {/* ── إحصائيات ── */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="card !p-3 text-center">
          <Users className="mx-auto text-[var(--color-gold)]" size={18} />
          <p className="text-xs text-[var(--color-muted)] mt-1">{t("total_referrals")}</p>
          <p className="font-extrabold">{data.totalReferrals}</p>
        </div>
        <div className="card !p-3 text-center">
          <Check className="mx-auto text-[var(--color-success)]" size={18} />
          <p className="text-xs text-[var(--color-muted)] mt-1">أعضاء فاعلون</p>
          <p className="font-extrabold text-[var(--color-success)]">{data.activeDirectCount ?? 0}</p>
        </div>
        <div className="card !p-3 text-center">
          <TrendingUp className="mx-auto text-[var(--color-gold)]" size={18} />
          <p className="text-xs text-[var(--color-muted)] mt-1">{t("total_commission")}</p>
          <p className="font-extrabold gold-text">${Number(data.totalCommission).toFixed(2)}</p>
        </div>
      </div>

      {/* ── نسب العمولات اليومية (3 مستويات مفتوحة) ── */}
      <div
        className="rounded-2xl p-4 mt-5"
        style={{
          background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.03) 100%)",
          border: "1px solid rgba(212,175,55,0.25)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap size={15} style={{ color: "var(--color-gold)" }} />
          <p className="font-extrabold text-sm">عمولات الفريق اليومية</p>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>
          عندما يُحصّل أي عضو في فريقك ربحه اليومي، تحصل أنت تلقائياً على نسبة منه
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DAILY_RATES.map(({ level, rate, color }) => (
            <div
              key={level}
              className="rounded-xl p-3 text-center"
              style={{ background: `${color}12`, border: `1px solid ${color}30` }}
            >
              <p className="text-[11px] mb-1" style={{ color: "var(--color-muted)" }}>
                {t(`level_${level as 1 | 2 | 3}`)}
              </p>
              <p className="font-extrabold text-base" style={{ color }}>{rate}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>يومياً</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── تبويبات أعضاء الفريق ── */}
      <div className="flex bg-[var(--color-surface-2)] rounded-xl p-1 mt-5">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            onClick={() => setTab(n)}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
              tab === n ? "gold-bg text-[var(--color-bg)]" : "text-[var(--color-muted)]"
            }`}
          >
            {t(`level_${n}`)}
          </button>
        ))}
      </div>

      <div className="card mt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[var(--color-muted)]">{t("commission_rate")}</span>
          <span className="font-extrabold text-[var(--color-gold)]">{(active.commissionRate * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-muted)]">{t("total_commission")}</span>
          <span className="font-extrabold">${Number(active.totalEarned).toFixed(2)}</span>
        </div>

        {active.members.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-muted)] py-6">{t("no_members")}</p>
        ) : (
          <div className="space-y-2">
            {active.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-[var(--color-surface-2)] rounded-xl p-3">
                <div>
                  <p className="font-bold text-sm">{m.name}</p>
                  <p className="text-xs text-[var(--color-muted)]">{new Date(m.joinedAt).toLocaleDateString("ar-EG")}</p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold">${Number(m.totalDeposited).toFixed(0)}</p>
                  <p className={`text-xs ${m.qualified ? "text-[var(--color-success)]" : "text-[var(--color-muted)]"}`}>
                    {m.qualified ? "✓ فاعل" : "لم يودع بعد"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
