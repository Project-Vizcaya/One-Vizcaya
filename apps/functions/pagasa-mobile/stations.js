"use strict";

// PAGASA publishes no station inside Nueva Vizcaya, and observation records
// carry no coordinates, so the nearby stations are listed here by site id.
// Stations are always looked up by site_id, never by list position.

const STATIONS = Object.freeze([
  // TODO verify: coordinates are approximate town-centre positions and must be
  // checked against PAGASA's station list before they are relied on.
  { siteId: 5076, kind: "automatic", name: "Maddela, Quirino", lat: 16.34, lon: 121.68 }, // TODO verify
  { siteId: 5026, kind: "automatic", name: "Echague, Isabela", lat: 16.71, lon: 121.68 }, // TODO verify
  { siteId: 5025, kind: "automatic", name: "Tuguegarao, Cagayan", lat: 17.61, lon: 121.73 }, // TODO verify
  { siteId: 98328, kind: "manual", name: "Baguio City", lat: 16.41, lon: 120.60 }, // TODO verify
  { siteId: 98329, kind: "manual", name: "Muñoz City, Nueva Ecija", lat: 15.72, lon: 120.90 }, // TODO verify
]);

function km(aLat, aLon, bLat, bLon) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The `count` nearest configured stations that have a reading, nearest first. */
function nearestStations(lat, lon, readingsBySiteId, count = 2) {
  return STATIONS
    .map((s) => ({ ...s, distanceKm: Math.round(km(lat, lon, s.lat, s.lon)), reading: readingsBySiteId[String(s.siteId)] || null }))
    .filter((s) => s.reading)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
}

module.exports = { STATIONS, nearestStations, km };
