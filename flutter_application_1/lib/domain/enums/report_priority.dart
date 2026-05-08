import 'package:flutter/material.dart';

/// Priority levels for reports, ordered from lowest to highest urgency.
/// The [weight] is used in scoring algorithms to rank reports.
enum ReportPriority {
  low(1, 'Low', Icons.arrow_downward, Color(0xFF4CAF50)),
  medium(2, 'Medium', Icons.remove, Color(0xFFFFA726)),
  high(3, 'High', Icons.arrow_upward, Color(0xFFEF5350)),
  critical(4, 'Critical', Icons.priority_high, Color(0xFFB71C1C));

  final int weight;
  final String displayName;
  final IconData icon;
  final Color color;

  const ReportPriority(this.weight, this.displayName, this.icon, this.color);

  static ReportPriority fromString(String? priority) {
    switch (priority) {
      case 'critical':
        return ReportPriority.critical;
      case 'high':
        return ReportPriority.high;
      case 'medium':
        return ReportPriority.medium;
      default:
        return ReportPriority.low;
    }
  }

  String toShortString() {
    return toString().split('.').last;
  }
}
