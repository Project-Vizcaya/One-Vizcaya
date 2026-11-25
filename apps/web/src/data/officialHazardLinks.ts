// Official disaster and hazard services (docs/4-app-and-website/flood-control.md). Links go to
// the agencies themselves. The app has the same list in
// apps/mobile/lib/core/constants/official_hazard_links.dart.

export const OFFICIAL_HAZARD_LINKS = [
  { name: "PHIVOLCS earthquake information", agency: "DOST-PHIVOLCS", url: "https://earthquake.phivolcs.dost.gov.ph/" },
  { name: "PAGASA flood information and river basins", agency: "DOST-PAGASA", url: "https://pagasa.dost.gov.ph/flood" },
  { name: "PhilSensors rain and river levels", agency: "DOST-ASTI", url: "https://philsensors.asti.dost.gov.ph/" },
  { name: "HazardHunterPH: hazards at any location", agency: "GeoRiskPH", url: "https://hazardhunter.georisk.gov.ph/" },
  { name: "UP NOAH flood and landslide maps", agency: "UP NOAH Center", url: "https://noah.up.edu.ph/" },
  { name: "DROMIC disaster situation reports", agency: "DSWD", url: "https://dromic.dswd.gov.ph/" },
] as const;
