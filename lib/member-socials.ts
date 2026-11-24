export function normalizeInstagram(value: string) {
  const raw = value.trim();
  if (!raw) return { username: "", url: "" };
  let username = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0].trim();
  username = username.replace(/[^a-zA-Z0-9._]/g, "");
  return username ? { username: `@${username}`, url: `https://www.instagram.com/${username}/` } : { username: "", url: "" };
}

export function normalizeTiktok(value: string) {
  const raw = value.trim();
  if (!raw) return { username: "", url: "" };
  const username = raw.replace(/^https?:\/\/(www\.)?tiktok\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0].replace(/^@/, "").trim().replace(/[^a-zA-Z0-9._]/g, "");
  return username ? { username: `@${username}`, url: `https://www.tiktok.com/@${username}` } : { username: "", url: "" };
}
