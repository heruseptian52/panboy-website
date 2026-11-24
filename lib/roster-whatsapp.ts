/** Only the team name goes to WhatsApp; never add an edit or invitation token. */
export function teamWhatsAppUrl(teamName: string) {
  const name = teamName.trim();
  if (!name) throw new Error("Nama team belum tersedia.");
  return `https://wa.me/?text=${encodeURIComponent(`Nama Team: ${name}`)}`;
}
