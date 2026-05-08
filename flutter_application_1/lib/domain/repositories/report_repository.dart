import '../models/problem_report.dart';

abstract class ReportRepository {
  Future<void> submitReport(ProblemReport report, String userId);
  Stream<List<ProblemReport>> getUserReports(String userId, String municipality);

  /// Admin: Get ALL reports across ALL users for a specific municipality
  Stream<List<ProblemReport>> getAllMunicipalityReports(String municipality);

  /// Admin: Update the status of a report (requires the userId who owns it)
  Future<void> updateReportStatus(String userId, String reportId, String newStatus);
}
