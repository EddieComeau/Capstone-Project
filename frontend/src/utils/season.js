export function getDefaultSeason() {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const seasonStart = new Date(Date.UTC(currentYear, 8, 1));
  return now < seasonStart ? currentYear - 1 : currentYear;
}
