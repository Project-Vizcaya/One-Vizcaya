enum ReportStatus {
  reported,
  underReview,
  ongoing,
  solved,
}

extension ReportStatusExtension on ReportStatus {
  static ReportStatus fromString(String? status) {
    switch (status) {
      case 'under_review':
        return ReportStatus.underReview;
      case 'ongoing':
        return ReportStatus.ongoing;
      case 'solved':
        return ReportStatus.solved;
      default:
        return ReportStatus.reported;
    }
  }

  String toShortString() {
    switch (this) {
      case ReportStatus.underReview:
        return 'under_review';
      default:
        return toString().split('.').last;
    }
  }
}
