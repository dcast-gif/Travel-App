/**
 * tfl.js
 * Live TfL helpers for station search + journey planning
 */

const TFL_BASE_URL = "https://api.tfl.gov.uk";

export const TFL_MODES = [
  "tube",
  "overground",
  "elizabeth-line",
  "dlr",
  "national-rail"
];

function normaliseStation(match) {
  return {
    id: match.id,
    name: match.name,
    modes: match.modes || [],
    zone: match.zone || null,
    lat: match.lat || null,
    lon: match.lon || null,
    source: "tfl"
  };
}

/**
 * Search stations from TfL
 * Example:
 * const results = await searchStations("Teddington");
 */
export async function searchStations(query, options = {}) {
  const trimmed = String(query || "").trim();

  if (trimmed.length < 2) {
    return [];
  }

  const modes = options.modes || TFL_MODES;
  const limit = options.limit || 10;

  const url = new URL(
    `${TFL_BASE_URL}/StopPoint/Search/${encodeURIComponent(trimmed)}`
  );

  url.searchParams.set("modes", modes.join(","));

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`TfL station search failed: ${response.status}`);
  }

  const data = await response.json();

  return (data.matches || [])
    .map(normaliseStation)
    .filter(station => station.id && station.name)
    .slice(0, limit);
}

/**
 * Get line status
 * Example:
 * await getLineStatuses(["victoria", "northern"])
 */
export async function getLineStatuses(lineIds = []) {
  const ids = lineIds.filter(Boolean).join(",");

  if (!ids) return [];

  const response = await fetch(
    `${TFL_BASE_URL}/Line/${encodeURIComponent(ids)}/Status`
  );

  if (!response.ok) {
    throw new Error(`TfL line status failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Plan a journey
 * Example:
 * await planJourney(fromId, toId)
 */
export async function planJourney(from, to, options = {}) {
  const fromId = typeof from === "string" ? from : from?.id;
  const toId = typeof to === "string" ? to : to?.id;

  if (!fromId || !toId) {
    throw new Error("Both from and to station IDs are required.");
  }

  const url = new URL(
    `${TFL_BASE_URL}/Journey/JourneyResults/${encodeURIComponent(fromId)}/to/${encodeURIComponent(toId)}`
  );

  if (options.via) {
    const viaId =
      typeof options.via === "string"
        ? options.via
        : options.via?.id;

    if (viaId) {
      url.searchParams.set("via", viaId);
    }
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`TfL journey planning failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Create ordered route stops
 */
export function createRouteStops(from, viaStations = [], to) {
  return [from, ...viaStations, to]
    .filter(Boolean)
    .map(station => ({
      id: station.id,
      name: station.name,
      modes: station.modes || [],
      source: "tfl"
    }));
}

/**
 * Debounce helper
 */
export function debounce(fn, delay = 250) {
  let timer;

  return (...args) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Optional global access
 */
window.TFL = {
  searchStations,
  getLineStatuses,
  planJourney,
  createRouteStops,
  debounce,
  TFL_MODES
};