export function fmt(n: string | number | null | undefined): string {
  if (n === null || n === undefined) return "0.00";
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "0.00";
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtInt(n: string | number | null | undefined): string {
  if (n === null || n === undefined) return "0";
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "0";
  return v.toLocaleString("en-US");
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusBadge(status: string): string {
  if (status === "approved") return "badge badge-approved";
  if (status === "rejected") return "badge badge-rejected";
  return "badge badge-pending";
}

export function statusLabel(status: string): string {
  if (status === "approved") return "مقبول";
  if (status === "rejected") return "مرفوض";
  return "قيد المراجعة";
}
