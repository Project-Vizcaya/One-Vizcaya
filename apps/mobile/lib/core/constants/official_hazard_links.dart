/// Official disaster and hazard services (docs/4-app-and-website/flood-control.md). Links go to
/// the agencies themselves. The console has the same list in
/// apps/web/src/data/officialHazardLinks.ts.
class OfficialHazardLink {
  final String name;
  final String agency;
  final String url;
  const OfficialHazardLink(this.name, this.agency, this.url);
}

const officialHazardLinks = [
  OfficialHazardLink('PHIVOLCS earthquake information', 'DOST-PHIVOLCS',
      'https://earthquake.phivolcs.dost.gov.ph/'),
  OfficialHazardLink('PAGASA flood information and river basins',
      'DOST-PAGASA', 'https://pagasa.dost.gov.ph/flood'),
  OfficialHazardLink('PhilSensors rain and river levels', 'DOST-ASTI',
      'https://philsensors.asti.dost.gov.ph/'),
  OfficialHazardLink('HazardHunterPH: hazards at any location', 'GeoRiskPH',
      'https://hazardhunter.georisk.gov.ph/'),
  OfficialHazardLink('UP NOAH flood and landslide maps', 'UP NOAH Center',
      'https://noah.up.edu.ph/'),
  OfficialHazardLink('DROMIC disaster situation reports', 'DSWD',
      'https://dromic.dswd.gov.ph/'),
];
