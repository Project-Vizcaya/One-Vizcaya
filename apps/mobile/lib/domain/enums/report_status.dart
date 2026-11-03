enum ReportStatus {
  reported,
  acknowledged,
  underReview,
  ongoing,
  solved,
  archived,

  /// Closed WITHOUT action (false / duplicate / incomplete / unverifiable),
  /// always with a disposition — PDRRMO §8. Distinct from [solved] so a false
  /// report is never counted or shown as resolved.
  closed,
}

extension ReportStatusExtension on ReportStatus {
  static ReportStatus fromString(String? status) {
    switch (status) {
      case 'acknowledged':
        return ReportStatus.acknowledged;
      case 'under_review':
        return ReportStatus.underReview;
      case 'ongoing':
        return ReportStatus.ongoing;
      case 'solved':
        return ReportStatus.solved;
      case 'archived':
        return ReportStatus.archived;
      case 'closed':
        return ReportStatus.closed;
      default:
        return ReportStatus.reported;
    }
  }

  String toShortString() {
    switch (this) {
      case ReportStatus.underReview:
        return 'under_review';
      case ReportStatus.archived:
        return 'archived';
      default:
        return toString().split('.').last;
    }
  }
}
