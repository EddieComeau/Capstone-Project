function getCurrentSeasonAndWeek() {
  const today = new Date();

  const currentYear = today.getUTCFullYear();
  const seasonStart = new Date(Date.UTC(currentYear, 8, 1)); // Sept 1 UTC
  const isBeforeSeason = today < seasonStart;

  const season = isBeforeSeason ? currentYear - 1 : currentYear;

  const firstThursday = new Date(Date.UTC(season, 8, 1));
  while (firstThursday.getUTCDay() !== 4) {
    firstThursday.setUTCDate(firstThursday.getUTCDate() + 1);
  }

  const daysDiff = Math.floor((today - firstThursday) / (1000 * 60 * 60 * 24));
  const week = Math.max(1, Math.floor(daysDiff / 7) + 1);

  return { season, week };
}

module.exports = {
  getCurrentSeasonAndWeek,
};
