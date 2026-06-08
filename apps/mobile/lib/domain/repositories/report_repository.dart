import '../models/problem_report.dart';
import '../enums/handling_level.dart';

abstract class ReportRepository {
  Future<void> submitReport(ProblemReport report, String userId);
  Stream<List<ProblemReport>> getUserReports(
    String userId,
    String municipality,
  );

  /// Admin: Get ALL reports across ALL users for a specific municipality
  Stream<List<ProblemReport>> getAllMunicipalityReports(String municipality);

  /// Provincial Admin: Get ALL reports across ALL municipalities
  Stream<List<ProblemReport>> getAllProvincialReports();

  /// Admin: Update the status of a report (requires the userId who owns it)
  Future<void> updateReportStatus(String userId, String reportId, String newStatus);

  /// Admin: Escalate a report to provincial level
  Future<void> escalateToProvince(String userId, String reportId);

  /// Admin: Transfer a report to a specific administrative tier
  /// (Barangay, Municipal, Provincial, or Region II).
  Future<void> transferToLevel(
      String userId, String reportId, HandlingLevel level);

  /// Provincial Admin: Permanently delete a report
  Future<void> deleteReport(String userId, String reportId);

  /// Admin: Flag or unflag a report as suspicious
  Future<void> flagReport(String userId, String reportId, bool isFlagged);
}
