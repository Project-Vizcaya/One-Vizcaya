import 'package:flutter/material.dart';

/// The administrative tier currently handling a report.
///
/// One Vizcaya is a structured intake layer in front of the LGU's existing
/// offices. A report can be transferred down to the Barangay for very local
/// matters, or escalated up to the Province or DPWH Region II when it exceeds
/// local capacity. This mirrors the six-tier triage workflow in the README.
enum HandlingLevel {
  barangay,
  municipal,
  provincial,
  regionII;

  /// Stored string in Firestore.
  String get key {
    switch (this) {
      case HandlingLevel.barangay:
        return 'barangay';
      case HandlingLevel.municipal:
        return 'municipal';
      case HandlingLevel.provincial:
        return 'provincial';
      case HandlingLevel.regionII:
        return 'region_ii';
    }
  }

  String get displayName {
    switch (this) {
      case HandlingLevel.barangay:
        return 'Barangay';
      case HandlingLevel.municipal:
        return 'Municipal';
      case HandlingLevel.provincial:
        return 'Provincial';
      case HandlingLevel.regionII:
        return 'Region II';
    }
  }

  /// Short guidance on when a report belongs at this level.
  String get criteria {
    switch (this) {
      case HandlingLevel.barangay:
        return 'Very local, low-risk matters a barangay can resolve: minor '
            'disputes, stray animals, uncollected garbage, clogged local '
            'canals, small streetlight or signage issues.';
      case HandlingLevel.municipal:
        return 'Town-wide services and infrastructure: municipal roads, public '
            'health, local flooding/drainage, public safety, and anything '
            'beyond a single barangay’s resources.';
      case HandlingLevel.provincial:
        return 'High-impact or cross-municipal incidents needing provincial '
            'resources: major disasters, provincial roads/bridges, large-scale '
            'health or environmental hazards.';
      case HandlingLevel.regionII:
        return 'National/regional mandate or assets: national highways and '
            'bridges (DPWH Region II), region-wide calamities, or matters '
            'beyond provincial capacity.';
    }
  }

  IconData get icon {
    switch (this) {
      case HandlingLevel.barangay:
        return Icons.holiday_village_outlined;
      case HandlingLevel.municipal:
        return Icons.location_city_outlined;
      case HandlingLevel.provincial:
        return Icons.account_balance_outlined;
      case HandlingLevel.regionII:
        return Icons.public;
    }
  }

  Color get color {
    switch (this) {
      case HandlingLevel.barangay:
        return const Color(0xFF2E7D32);
      case HandlingLevel.municipal:
        return const Color(0xFF1565C0);
      case HandlingLevel.provincial:
        return const Color(0xFF6A1B9A);
      case HandlingLevel.regionII:
        return const Color(0xFFC62828);
    }
  }

  static HandlingLevel fromString(String? value) {
    switch (value) {
      case 'barangay':
        return HandlingLevel.barangay;
      case 'provincial':
        return HandlingLevel.provincial;
      case 'region_ii':
        return HandlingLevel.regionII;
      case 'municipal':
      default:
        return HandlingLevel.municipal;
    }
  }
}
