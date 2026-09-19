import React from "react";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  User as UserIcon,
  Globe,
  Lock,
  LogOut,
  Receipt,
  ArrowDownToLine,
  Shield,
  Download,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { t, getLang, setLang, Lang } from "../lib/i18n";
import { api } from "../lib/api";
import { useInstallPrompt } from "../lib/useInstallPrompt";

export function ProfilePage(): React.ReactElement {
  const { user, logout, refresh } = useAuth();
  const [, navigate] = useLocation();
  const { canInstall, installed, install } = useInstallPrompt();
  const [installMsg, setInstallMsg] = useState<"done" | null>(null);
  const [editing, setEditing] = useState<"name" | "password" | null>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const changeLang = (l: Lang): void => {
    setLang(l);
    window.location.reload();
  };

  const saveName = async (): Promise<void> => {
    setBusy(true);
    setMsg("");
    try {
      await api.patch("/me/settings", { name });
      await refresh();
      setEditing(null);
      setMsg(t("success"));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (): Promise<void> => {
    setBusy(true);
    setMsg("");
    try {
      await api.patch("/me/password", { currentPassword: oldPwd, newPassword: newPwd });
      setOldPwd("");
      setNewPwd("");
      setEditing(null);
      setMsg(t("success"));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return <div className="p-5"><div className="shimmer h-40 rounded-2xl" /></div>;

  return (
    <div className="px-4 pt-5 pb-8">
      <div className="card text-center">
        <div className="w-20 h-20 mx-auto rounded-full gold-bg flex items-center justify-center text-3xl font-extrabold text-[var(--color-bg)] mb-3">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <p className="text-xl font-extrabold">{user.name}</p>
        <p className="text-sm text-[var(--color-muted)]" dir="ltr">
          {user.phone ?? user.email}
        </p>
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
          <div>
            <p className="text-[10px] text-[var(--color-muted)]">{t("balance")}</p>
            <p className="text-sm font-bold gold-text">${Number(user.balance).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-muted)]">{t("total_invested")}</p>
            <p className="text-sm font-bold">${Number(user.totalInvested).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-muted)]">{t("total_earned")}</p>
            <p className="text-sm font-bold">${Number(user.totalEarned).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <Row icon={ArrowDownToLine} label={t("deposit")} onClick={() => navigate("/deposit")} />
        <Row icon={Receipt} label={t("transactions")} onClick={() => navigate("/transactions")} />
      </div>

      <div className="card mt-4 divide-y divide-[var(--color-border)]">
        <div className="flex items-center gap-3 py-3">
          <UserIcon size={18} className="text-[var(--color-gold)]" />
          <div className="flex-1">
            <p className="text-xs text-[var(--color-muted)]">{t("name")}</p>
            {editing === "name" ? (
              <input className="input mt-1 !py-2" value={name} onChange={(e) => setName(e.target.value)} />
            ) : (
              <p className="font-semibold">{user.name}</p>
            )}
          </div>
          {editing === "name" ? (
            <button onClick={saveName} disabled={busy} className="btn-gold !py-2 !px-3 text-xs">{t("save")}</button>
          ) : (
            <button onClick={() => setEditing("name")} className="text-[var(--color-gold)] text-sm">{t("update")}</button>
          )}
        </div>

        <div className="flex items-center gap-3 py-3">
          <Globe size={18} className="text-[var(--color-gold)]" />
          <div className="flex-1">
            <p className="text-xs text-[var(--color-muted)]">{t("language")}</p>
            <p className="font-semibold">{getLang() === "ar" ? t("arabic") : t("english")}</p>
          </div>
          <select
            value={getLang()}
            onChange={(e) => changeLang(e.target.value as Lang)}
            className="input !py-2 !w-auto"
          >
            <option value="ar">{t("arabic")}</option>
            <option value="en">{t("english")}</option>
          </select>
        </div>

        <div className="flex items-center gap-3 py-3">
          <Lock size={18} className="text-[var(--color-gold)]" />
          <div className="flex-1">
            <p className="text-xs text-[var(--color-muted)]">{t("change_password")}</p>
            {editing === "password" && (
              <div className="space-y-2 mt-2">
                <input className="input !py-2" type="password" placeholder={t("current_password")} value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
                <input className="input !py-2" type="password" placeholder={t("new_password")} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                <button onClick={savePassword} disabled={busy} className="btn-gold w-full !py-2 text-xs">{t("save")}</button>
              </div>
            )}
          </div>
          {editing !== "password" && (
            <button onClick={() => setEditing("password")} className="text-[var(--color-gold)] text-sm">{t("update")}</button>
          )}
        </div>

        <div className="flex items-center gap-3 py-3">
          <Shield size={18} className="text-[var(--color-gold)]" />
          <div className="flex-1">
            <p className="text-xs text-[var(--color-muted)]">{t("referral_code")}</p>
            <p className="font-semibold gold-text" dir="ltr">{user.referralCode}</p>
          </div>
        </div>
      </div>

      {msg && <p className="text-center text-sm text-[var(--color-success)] mt-3">{msg}</p>}

      {/* ── زر تثبيت التطبيق ── */}
      {(canInstall || installed || installMsg === "done") && (
        <div
          className="mt-4 rounded-2xl p-4 flex items-center gap-4"
          style={{
            background: installed || installMsg === "done"
              ? "rgba(34,197,94,0.07)"
              : "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.04))",
            border: installed || installMsg === "done"
              ? "1px solid rgba(34,197,94,0.25)"
              : "1px solid rgba(212,175,55,0.3)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: installed || installMsg === "done"
                ? "rgba(34,197,94,0.15)"
                : "rgba(212,175,55,0.15)",
            }}
          >
            {installed || installMsg === "done"
              ? <CheckCircle2 size={22} style={{ color: "var(--color-success)" }} />
              : <Download size={22} style={{ color: "var(--color-gold)" }} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">
              {installed || installMsg === "done" ? "تم تثبيت التطبيق ✓" : "تثبيت التطبيق"}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
              {installed || installMsg === "done"
                ? "التطبيق مثبت على شاشتك الرئيسية"
                : "أضف التطبيق للشاشة الرئيسية للوصول السريع"}
            </p>
          </div>
          {canInstall && installMsg !== "done" && (
            <button
              onClick={async () => {
                const result = await install();
                if (result === "accepted") setInstallMsg("done");
              }}
              className="shrink-0 btn-gold !py-2 !px-4 text-sm flex items-center gap-1.5"
            >
              <Download size={14} />
              تثبيت
            </button>
          )}
        </div>
      )}

      <button
        onClick={async () => {
          await logout();
          window.location.href = window.location.pathname;
        }}
        className="w-full mt-6 py-3 rounded-xl border border-[var(--color-danger)] text-[var(--color-danger)] font-bold flex items-center justify-center gap-2"
      >
        <LogOut size={16} />
        {t("logout")}
      </button>
    </div>
  );
}

function Row({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; onClick: () => void }): React.ReactElement {
  return (
    <button onClick={onClick} className="card !p-3 w-full flex items-center gap-3 hover:bg-[var(--color-surface-2)]">
      <Icon size={20} className="text-[var(--color-gold)]" />
      <span className="font-semibold flex-1 text-start">{label}</span>
      <span className="text-[var(--color-muted)]">→</span>
    </button>
  );
}
