import '../models/problem_report.dart';
import '../enums/handling_level.dart';

abstract class ReportRepository {
  /// Writes a report and its acknowledgement receipt.
  ///
  /// [docId]: a document id chosen before the first attempt, so a retry (or
  /// Firestore's own offline sync) writes the SAME report instead of a second
  /// one. [originalReportedAt]: for a report filed while offline, the time the
  /// citizen actually filed it (otherwise the server time is used).
  Future<String> submitReport(ProblemReport report, String userId,
      {String? docId, DateTime? originalReportedAt});
  Stream<List<ProblemReport>> getUserReports(
    String userId,
    String municipality,
  );

  /// Admin: Get ALL reports across ALL users for a specific municipality
  Stream<List<ProblemReport>> getAllMunicipalityReports(String municipality);

  // Reports within a single barangay of a municipality — used to scope a
  // Barangay admin's dashboard to their own barangay.
  Stream<List<ProblemReport>> getBarangayReports(
    String municipality,
    String barangay,
  );

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

  /// Closes a report WITHOUT action (PDRRMO §8), recording the disposition,
  /// a reason, the acting admin and the server time. [disposition] is one of
  /// false_report | duplicate | incomplete | unverifiable.
  Future<void> closeWithDisposition(String userId, String reportId,
      String disposition, String reason, {String? duplicateOf});

  /// Re-opens a closed report into the queue, attributed to the acting admin.
  Future<void> reopenReport(String userId, String reportId);
}
