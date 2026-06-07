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

  // ── LOW ───────────────────────────────────────────────────────────────────
  socialAndCommunityServices(
    'Social & Community Services',
    'e.g. PWD ramp needed, senior citizen assistance request, child welfare concern, community livelihood issue.',
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
