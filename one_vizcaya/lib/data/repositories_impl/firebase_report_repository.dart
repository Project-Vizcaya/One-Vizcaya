import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/models/problem_report.dart';
import '../../domain/repositories/report_repository.dart';
import '../../core/utils/toast_utils.dart';

class FirebaseReportRepository implements ReportRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  @override
  Future<void> submitReport(ProblemReport report, String userId) async {
    try {
      // NEW SCHEMA: users/{uid}/reports/{reportId}
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .add(report.toMap())
          .catchError((e) {
        ToastUtils.showError('Background sync error: $e');
        throw e;
      });
    } catch (e) {
      ToastUtils.showError('Error submitting report. Falling back to offline mode.');
      rethrow;
    }
  }

  @override
  Stream<List<ProblemReport>> getUserReports(String userId, String municipality) {
    return _firestore
        .collection('users')
        .doc(userId)
        .collection('reports')
        .where('municipality', isEqualTo: municipality)
        .orderBy('reportedAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => ProblemReport.fromFirestore(doc)).toList();
    }).handleError((error) {
      ToastUtils.showError('Failed to load reports. Please check your connection.');
      return <ProblemReport>[];
    });
  }

  @override
  Stream<List<ProblemReport>> getAllMunicipalityReports(String municipality) {
    // collectionGroup('reports') queries across ALL users/{uid}/reports sub-collections
    return _firestore
        .collectionGroup('reports')
        .where('municipality', isEqualTo: municipality)
        .orderBy('priorityScore', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => ProblemReport.fromFirestore(doc)).toList();
    }).handleError((error) {
      ToastUtils.showError('Failed to load municipality reports: $error');
      return <ProblemReport>[];
    });
  }

  @override
  Future<void> updateReportStatus(String userId, String reportId, String newStatus) async {
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .doc(reportId)
          .update({'status': newStatus});
      ToastUtils.showSuccess('Report status updated successfully');
    } catch (e) {
      ToastUtils.showError('Failed to update report status: $e');
      rethrow;
    }
  }
}
