// GENERATED from apps/mobile/lib/domain/enums/report_category.dart
// by scripts/gen-report-categories.mjs. Do not edit: change the Dart enum,
// then run `node scripts/gen-report-categories.mjs`. CI fails if this is stale.

export const REPORT_CATEGORIES = [
  { name: "Disaster & Risk Management", basePriority: "critical" },
  { name: "Health & Public Safety", basePriority: "critical" },
  { name: "Vehicular Accident / Road Crash", basePriority: "critical" },
  { name: "Hazardous / Chemical Spill", basePriority: "critical" },
  { name: "Landslide / Soil Erosion", basePriority: "critical" },
  { name: "Flooding / Severe Drainage Issue", basePriority: "critical" },
  { name: "Bridge Damage / Blockage", basePriority: "high" },
  { name: "Provincial Road Damage", basePriority: "high" },
  { name: "Peace & Order Disturbance", basePriority: "high" },
  { name: "Water & Sewage Systems", basePriority: "high" },
  { name: "Online Scam / Cyber Fraud", basePriority: "high" },
  { name: "Stray / Loose Animals on Road", basePriority: "high" },
  { name: "Infrastructure & Roads", basePriority: "medium" },
  { name: "Public Lighting & Utilities", basePriority: "medium" },
  { name: "Environmental & Sanitation", basePriority: "medium" },
  { name: "Traffic Obstruction / Illegal Parking", basePriority: "medium" },
  { name: "Internet / Telecom Connectivity", basePriority: "medium" },
  { name: "Social & Community Services", basePriority: "low" },
  { name: "Lost & Found / Document Request", basePriority: "low" },
  { name: "Digital Services / App Feedback", basePriority: "low" },
  { name: "General Inquiries & Others", basePriority: "low" },
  { name: "Others (Not Listed)", basePriority: "low" },
] as const;

export type ReportCategoryName = (typeof REPORT_CATEGORIES)[number]["name"];
