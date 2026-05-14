import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/models/problem_report.dart';
import '../../domain/repositories/report_repository.dart';
import '../../core/utils/toast_utils.dart';

class FirebaseReportRepository implements ReportRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  @override
  Future<void> submitReport(ProblemReport report, String userId) async {
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .add(report.toMap());
    } catch (e) {
      ToastUtils.showError('Error submitting report. Please try again.');
      rethrow;
    }
  }

  @override
  Stream<List<ProblemReport>> getUserReports(
    String userId,
    String municipality,
  ) {
    return _firestore
        .collection('users')
        .doc(userId)
        .collection('reports')
        .where('municipality', isEqualTo: municipality)
        .orderBy('reportedAt', descending: true)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map((doc) => ProblemReport.fromFirestore(doc))
              .toList(),
        )
        .handleError((_) => <ProblemReport>[]);
  }

  @override
  Stream<List<ProblemReport>> getAllMunicipalityReports(String municipality) {
    return _firestore
        .collectionGroup('reports')
        .where('municipality', isEqualTo: municipality)
        .orderBy('priorityScore', descending: true)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map((doc) => ProblemReport.fromFirestore(doc))
              .toList(),
        )
        .handleError((error) {
          ToastUtils.showError('Failed to load reports: $error');
          return <ProblemReport>[];
        });
  }

  @override
  Stream<List<ProblemReport>> getAllProvincialReports() {
    // Returns all reports across every municipality, newest first by default
    return _firestore
        .collectionGroup('reports')
        .orderBy('reportedAt', descending: true)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map((doc) => ProblemReport.fromFirestore(doc))
              .toList(),
        )
        .handleError((error) {
          ToastUtils.showError('Failed to load provincial reports: $error');
          return <ProblemReport>[];
        });
  }

  @override
  Future<void> updateReportStatus(
    String userId,
    String reportId,
    String newStatus,
  ) async {
    try {
      final update = <String, dynamic>{'status': newStatus};
      if (newStatus == 'solved') {
        update['resolvedAt'] = FieldValue.serverTimestamp();
      } else {
        // Clear resolvedAt if report is reopened
        update['resolvedAt'] = null;
      }
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .doc(reportId)
          .update(update);
      ToastUtils.showSuccess('Status updated');
    } catch (e) {
      ToastUtils.showError('Failed to update status: $e');
      rethrow;
    }
  }

  @override
  Future<void> escalateToProvince(String userId, String reportId) async {
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .doc(reportId)
          .update({
            'escalatedToProvince': true,
            'escalatedAt': FieldValue.serverTimestamp(),
          });
      ToastUtils.showSuccess('Report escalated to Provincial Office');
    } catch (e) {
      ToastUtils.showError('Failed to escalate report: $e');
      rethrow;
    }
  }

  @override
  Future<void> deleteReport(String userId, String reportId) async {
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .doc(reportId)
          .delete();
      ToastUtils.showSuccess('Report deleted');
    } catch (e) {
      ToastUtils.showError('Failed to delete report: $e');
      rethrow;
    }
  }
}
