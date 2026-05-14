import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../../domain/enums/report_category.dart';
import '../../domain/enums/report_priority.dart';

/// Service that calculates the effective priority of a report.
///
/// **Algorithm:**
/// 1. Start with the category's base priority weight (1–4).
/// 2. Query Firestore for recent reports in the same municipality + category
///    submitted within the last 48 hours.
/// 3. Apply a "crowd boost" — each additional matching report adds +1 to the
///    score, up to a maximum boost of +3.
/// 4. Map the final score to a [ReportPriority] level.
///
/// This means a normally "Medium" issue like a pothole gets automatically
/// escalated to "Critical" if 3+ citizens report it within 2 days.
class PriorityService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Returns (priority, score, duplicateCount) for a new report.
  Future<({ReportPriority priority, int score, int duplicateCount})> calculatePriority({
    required ReportCategory category,
    required String municipality,
  }) async {
    int baseScore = category.basePriority.weight; // 1–4

    // Count similar recent reports across ALL users via collectionGroup
    int duplicateCount = 0;
    try {
      final cutoff = DateTime.now().subtract(const Duration(hours: 48));
      final querySnapshot = await _firestore
          .collectionGroup('reports')
          .where('municipality', isEqualTo: municipality)
          .where('category', isEqualTo: category.displayName)
          .where('reportedAt', isGreaterThan: Timestamp.fromDate(cutoff))
          .get();

      duplicateCount = querySnapshot.docs.length;
    } catch (e) {
      // If the query fails (offline, index missing, etc.) we still proceed
      // with the base score — the report doesn't get blocked.
      debugPrint('Priority duplicate query failed (non-blocking): $e');
    }

    // Crowd boost: each duplicate adds +1, capped at +3
    final int crowdBoost = duplicateCount.clamp(0, 3);
    final int finalScore = baseScore + crowdBoost;

    // Map score → priority level
    final ReportPriority effectivePriority;
    if (finalScore >= 6) {
      effectivePriority = ReportPriority.critical;
    } else if (finalScore >= 4) {
      effectivePriority = ReportPriority.high;
    } else if (finalScore >= 2) {
      effectivePriority = ReportPriority.medium;
    } else {
      effectivePriority = ReportPriority.low;
    }

    return (
      priority: effectivePriority,
      score: finalScore,
      duplicateCount: duplicateCount,
    );
  }
}
