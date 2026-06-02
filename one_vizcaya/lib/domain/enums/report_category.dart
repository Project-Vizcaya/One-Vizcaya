import 'report_priority.dart';

/// Each category carries a [basePriority] that represents the inherent urgency
/// of problems of that type. The priority service may boost this further when
/// multiple citizens report the same kind of issue.
enum ReportCategory {
  // ── CRITICAL ──────────────────────────────────────────────────────────────
  disasterAndRiskManagement(
    'Disaster & Risk Management',
    'e.g. Typhoon aftermath, fallen trees blocking roads, river overflow threatening homes, disaster damage to public structures.',
    ReportPriority.critical,
  ),
  healthAndPublicSafety(
    'Health & Public Safety',
    'e.g. Dengue breeding sites, rabid stray animals, illegal food vendors, fire outbreak, unsanitary public spaces.',
    ReportPriority.critical,
  ),
  // Frequent: road crashes are among the most commonly reported emergencies.
  vehicularAccidentOrRoadCrash(
    'Vehicular Accident / Road Crash',
    'e.g. Collision with injuries, overturned vehicle on the highway, motorcycle crash needing rescue, hit-and-run incident.',
    ReportPriority.critical,
  ),
  // Contemporary: spills tied to transport, LPG use, and mining activity.
  hazardousOrChemicalSpill(
    'Hazardous / Chemical Spill',
    'e.g. Fuel or oil spill on the road, leaking LPG or chemical container, mine tailings or toxic spill threatening water sources.',
    ReportPriority.critical,
  ),

  // ── PROVINCIAL INFRASTRUCTURE (Critical / High) ───────────────────────────
  landslideOrSoilErosion(
    'Landslide / Soil Erosion',
    'e.g. Active slope collapse near communities, eroded road shoulders on mountain routes, debris flows threatening barangays.',
    ReportPriority.critical,
  ),
  floodingOrSevereDrainageIssue(
    'Flooding / Severe Drainage Issue',
    'e.g. Flash flood blocking highway, drainage overflow into residential areas, clogged canals causing street flooding.',
    ReportPriority.critical,
  ),
  bridgeDamageOrBlockage(
    'Bridge Damage / Blockage',
    'e.g. Cracked bridge deck, missing guardrails, debris blocking bridge span, structurally unsafe crossing.',
    ReportPriority.high,
  ),
  provincialRoadDamage(
    'Provincial Road Damage',
    'e.g. Cave-in on national highway, large potholes on provincial road, damaged concrete pavement on major routes.',
    ReportPriority.high,
  ),

  // ── HIGH ──────────────────────────────────────────────────────────────────
  peaceAndOrderDisturbance(
    'Peace & Order Disturbance',
    'e.g. Illegal gambling operations, road rage incidents, suspicious activity, noise disturbance, public intoxication.',
    ReportPriority.high,
  ),
  waterAndSewageSystems(
    'Water & Sewage Systems',
    'e.g. Burst water main, no water supply for 24+ hours, sewage overflowing into street, contaminated water source.',
    ReportPriority.high,
  ),
  // Contemporary: rising online fraud and cybercrime affecting residents.
  onlineScamOrCyberFraud(
    'Online Scam / Cyber Fraud',
    'e.g. Text or online scam targeting residents, phishing links, fraudulent online sellers, hacked or hijacked accounts, identity theft.',
    ReportPriority.high,
  ),
  // Frequent: loose animals on roads are a recurring traffic and safety hazard.
  strayOrLooseAnimalsOnRoad(
    'Stray / Loose Animals on Road',
    'e.g. Loose livestock or stray dogs causing a traffic hazard, an aggressive stray pack in the neighborhood, animals on the highway.',
    ReportPriority.high,
  ),

  // ── MEDIUM ────────────────────────────────────────────────────────────────
  infrastructureAndRoads(
    'Infrastructure & Roads',
    'e.g. Pothole on barangay road, broken sidewalk, damaged drainage cover, road maintenance needed.',
    ReportPriority.medium,
  ),
  publicLightingAndUtilities(
    'Public Lighting & Utilities',
    'e.g. Streetlight out for multiple nights, leaning electrical pole, power outage in residential area, fallen wires.',
    ReportPriority.medium,
  ),
  environmentalAndSanitation(
    'Environmental & Sanitation',
    'e.g. Illegal dumping site, clogged estero or canal, open burning of waste, unsanitary public market area.',
    ReportPriority.medium,
  ),
  // Frequent: traffic obstruction and illegal parking are everyday concerns.
  trafficObstructionOrIllegalParking(
    'Traffic Obstruction / Illegal Parking',
    'e.g. Vehicles blocking the road or intersection, illegal terminal or sidewalk vending, obstruction of a public way.',
    ReportPriority.medium,
  ),
  // Contemporary: connectivity is now a basic service expectation.
  internetOrTelecomConnectivity(
    'Internet / Telecom Connectivity',
    'e.g. Prolonged network or signal outage, damaged telecom line or tower, no cellular service after a storm.',
    ReportPriority.medium,
  ),

  // ── LOW ───────────────────────────────────────────────────────────────────
  socialAndCommunityServices(
    'Social & Community Services',
    'e.g. PWD ramp needed, senior citizen assistance request, child welfare concern, community livelihood issue.',
    ReportPriority.low,
  ),
  // Frequent: lost-and-found and document requests are common LGU walk-ins.
  lostAndFoundOrDocuments(
    'Lost & Found / Document Request',
    'e.g. Lost or found ID and belongings, request for barangay or civil documents, certificate or clearance inquiry.',
    ReportPriority.low,
  ),
  // Contemporary: feedback on digital and online government services.
  digitalServicesOrAppFeedback(
    'Digital Services / App Feedback',
    'e.g. One Vizcaya app issue or suggestion, online LGU service problem, feedback on digital government services.',
    ReportPriority.low,
  ),
  generalInquiriesAndOthers(
    'General Inquiries & Others',
    'e.g. Community feedback, general LGU inquiry, request for information, miscellaneous concern not listed above.',
    ReportPriority.low,
  );

  final String displayName;
  final String description;
  final ReportPriority basePriority;

  const ReportCategory(this.displayName, this.description, this.basePriority);

  static ReportCategory fromString(String categoryString) {
    return ReportCategory.values.firstWhere(
      (category) => category.displayName == categoryString,
      orElse: () => ReportCategory.generalInquiriesAndOthers,
    );
  }
}
