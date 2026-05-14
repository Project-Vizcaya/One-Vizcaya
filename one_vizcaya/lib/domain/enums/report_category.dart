import 'report_priority.dart';

/// Each category carries a [basePriority] that represents the inherent urgency
/// of problems of that type. The priority service may boost this further when
/// multiple citizens report the same kind of issue.
enum ReportCategory {
  // ── CRITICAL ──────────────────────────────────────────────────────────────
  disasterAndRiskManagement(
    'Disaster & Risk Management',
    'Includes: Flooding, Landslides, Fallen Trees, Natural Disaster Damage.',
    ReportPriority.critical,
  ),
  healthAndPublicSafety(
    'Health & Public Safety',
    'Includes: Stray Animals, Unsanitary Food Establishments, Dengue Concerns, Stagnant Water, Fire Hazards.',
    ReportPriority.critical,
  ),

  // ── PROVINCIAL INFRASTRUCTURE (Critical / High) ───────────────────────────
  landslideOrSoilErosion(
    'Landslide / Soil Erosion',
    'Includes: Active landslide zones, soil erosion threatening roads or communities, debris flows.',
    ReportPriority.critical,
  ),
  floodingOrSevereDrainageIssue(
    'Flooding / Severe Drainage Issue',
    'Includes: Severe flash flooding, clogged drainage causing road or community flooding, river overflows.',
    ReportPriority.critical,
  ),
  bridgeDamageOrBlockage(
    'Bridge Damage / Blockage',
    'Includes: Cracked or structurally compromised bridges, debris blockage on bridge spans, unsafe railings.',
    ReportPriority.high,
  ),
  provincialRoadDamage(
    'Provincial Road Damage',
    'Includes: Large potholes on provincial highways, road cave-ins, damaged concrete pavement on major routes.',
    ReportPriority.high,
  ),

  // ── HIGH ──────────────────────────────────────────────────────────────────
  peaceAndOrderDisturbance(
    'Peace & Order Disturbance',
    'Includes: Noise Complaints, Suspicious Activities, Traffic Violations, Public Nuisance.',
    ReportPriority.high,
  ),
  waterAndSewageSystems(
    'Water & Sewage Systems',
    'Includes: Water Leakage, Water Supply Issues, Pipe Bursts, Sewage Overflow.',
    ReportPriority.high,
  ),

  // ── MEDIUM ────────────────────────────────────────────────────────────────
  infrastructureAndRoads(
    'Infrastructure & Roads',
    'Includes: Potholes, Damaged Roads/Bridges, Road Maintenance Needed, Broken Sidewalks.',
    ReportPriority.medium,
  ),
  publicLightingAndUtilities(
    'Public Lighting & Utilities',
    'Includes: Broken Streetlights, Electrical Repairs, Power Outages, Fallen Poles.',
    ReportPriority.medium,
  ),
  environmentalAndSanitation(
    'Environmental & Sanitation',
    'Includes: Improper Waste Management, Solid Waste Issues, Dirty/Clogged Canals, Illegal Dumping.',
    ReportPriority.medium,
  ),

  // ── LOW ───────────────────────────────────────────────────────────────────
  socialAndCommunityServices(
    'Social & Community Services',
    'Includes: PWD/Senior Citizen Concerns, Child Welfare, Social Welfare Assistance.',
    ReportPriority.low,
  ),
  generalInquiriesAndOthers(
    'General Inquiries & Others',
    'Includes: Miscellaneous Reports, General Concerns, Feedback.',
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
