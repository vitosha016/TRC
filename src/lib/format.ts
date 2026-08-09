export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatSeconds(total: number): string {
  total = Math.max(0, Math.round(total));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p: string[] = [];
  if (d) p.push(d + "д");
  if (h) p.push(h + "ч");
  if (m) p.push(m + "м");
  if (!d && !h) p.push(s + "с");
  return p.join(" ") || "0с";
}

export function formatTimeShort(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const parts: string[] = [];
  if (d > 0) parts.push(d + "д");
  if (h > 0 || d === 0) parts.push(h + "ч");
  return parts.join(" ");
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return (
    d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) +
    " · " +
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  );
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return (
    d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    ", " +
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  );
}
