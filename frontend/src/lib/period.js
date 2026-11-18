import { seasonLabel } from "./leagues";

// Une « période » = { from, to } (codes de saison "2122"...).

// Liste des saisons comprises dans la période (bornes incluses).
export function periodSeasons(seasons, period) {
  if (!period?.from || !period?.to) return seasons;
  return seasons.filter((s) => s >= period.from && s <= period.to);
}

// "2023-24" ou "2022-23 → 2023-24"
export function periodLabel(period) {
  if (!period?.from) return "";
  return period.from === period.to ? seasonLabel(period.from) : `${seasonLabel(period.from)} → ${seasonLabel(period.to)}`;
}

export const lastSeasonPeriod = (seasons) => {
  const last = seasons[seasons.length - 1];
  return { from: last, to: last };
};
