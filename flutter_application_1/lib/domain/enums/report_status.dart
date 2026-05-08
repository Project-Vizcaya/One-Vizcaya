enum ReportStatus { 
  reported, 
  ongoing, 
  solved 
}

extension ReportStatusExtension on ReportStatus {
  static ReportStatus fromString(String? status) {
    switch (status) {
      case 'ongoing':
        return ReportStatus.ongoing;
      case 'solved':
        return ReportStatus.solved;
      default:
        return ReportStatus.reported;
    }
  }

  String toShortString() {
    return toString().split('.').last;
  }
}
