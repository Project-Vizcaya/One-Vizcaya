enum ReportStatus {
  reported,
  acknowledged,
  underReview,
  ongoing,
  solved,
  archived,
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
