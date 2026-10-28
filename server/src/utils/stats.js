// Small number helpers shared by the officer dashboard and the placement report.
const round = (n, places = 1) => Math.round(n * 10 ** places) / 10 ** places;

function packageStats(packages) {
  if (!packages.length) return { highest: 0, average: 0, median: 0, lowest: 0 };
  const sorted = [...packages].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    highest: sorted[sorted.length - 1],
    average: round(sorted.reduce((sum, p) => sum + p, 0) / sorted.length, 2),
    median: sorted.length % 2 ? sorted[mid] : round((sorted[mid - 1] + sorted[mid]) / 2, 2),
    lowest: sorted[0],
  };
}

module.exports = { round, packageStats };
