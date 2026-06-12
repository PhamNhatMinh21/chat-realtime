export function formatTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "Vừa xong";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} ngày`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}
