import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../../domain/models/problem_report.dart';
import '../../domain/enums/handling_level.dart';
import '../../domain/repositories/report_repository.dart';
import '../../core/utils/toast_utils.dart';

class FirebaseReportRepository implements ReportRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  @override
  Future<void> submitReport(ProblemReport report, String userId) async {
    try {
      final docRef = await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .add(report.toMap());

      await _firestore
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .add({
            'type': 'report_submitted',
            'title': 'Report Submitted',
            'body':
                'Your report about "${report.category.displayName}" has been received. '
                'We will review it shortly.',
            'status': 'info',
            'reportId': docRef.id,
            'timestamp': FieldValue.serverTimestamp(),
            'read': false,
          });
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
        .transform(_safeReportTransformer('getUserReports'));
  }

  // Cap live admin queries so a growing dataset can't balloon reads/memory.
  static const int _adminQueryLimit = 500;

  @override
  Stream<List<ProblemReport>> getAllMunicipalityReports(String municipality) {
    return _firestore
        .collectionGroup('reports')
        .where('municipality', isEqualTo: municipality)
        .orderBy('priorityScore', descending: true)
        .limit(_adminQueryLimit)
        .snapshots()
        .transform(_safeReportTransformer('getAllMunicipalityReports'));
  }

  @override
  Stream<List<ProblemReport>> getAllProvincialReports() {
    return _firestore
        .collectionGroup('reports')
        .orderBy('reportedAt', descending: true)
        .limit(_adminQueryLimit)
        .snapshots()
        .transform(_safeReportTransformer('getAllProvincialReports'));
  }

  StreamTransformer<QuerySnapshot<Map<String, dynamic>>, List<ProblemReport>>
      _safeReportTransformer(String tag) {
    return StreamTransformer<
      QuerySnapshot<Map<String, dynamic>>,
      List<ProblemReport>
    >.fromHandlers(
      handleData: (snapshot, sink) {
        // Parse each doc independently so one malformed document can't blank
        // the entire list — skip bad docs and surface the rest.
        final reports = <ProblemReport>[];
        for (final doc in snapshot.docs) {
          try {
            reports.add(ProblemReport.fromFirestore(doc));
          } catch (e) {
            debugPrint('$tag parse error on ${doc.id}: $e');
          }
        }
        sink.add(reports);
      },
      handleError: (error, stackTrace, sink) {
        // Forward the error so the UI shows an error state instead of silently
        // rendering "no reports" (which hid missing-index/permission failures).
        debugPrint('$tag stream error: $error');
        sink.addError(error, stackTrace);
      },
    );
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
        update['resolvedAt'] = FieldValue.delete();
      }
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .doc(reportId)
          .update(update);

      final notif = _statusNotification(newStatus, reportId);
      if (notif != null) {
        try {
          await _firestore
              .collection('users')
              .doc(userId)
              .collection('notifications')
              .add(notif);
        } catch (e) {
          debugPrint('Failed to write status notification: $e');
        }
      }

      ToastUtils.showSuccess('Status updated');
    } catch (e) {
      ToastUtils.showError('Failed to update status: $e');
      rethrow;
    }
  }

  Map<String, dynamic>? _statusNotification(String status, String reportId) {
    String title;
    String body;
    switch (status) {
      case 'ongoing':
        title = 'Report In Progress';
        body = 'Your report is now being acted upon by the LGU.';
        break;
      case 'solved':
        title = 'Report Resolved ✓';
        body =
            'Great news! Your report has been resolved. Thank you for helping improve your community.';
        break;
      case 'acknowledged':
        title = 'Report Acknowledged';
        body = 'The LGU has received and acknowledged your report.';
        break;
      case 'under_review':
        title = 'Report Under Review';
        body = 'Your report is now being reviewed by the LGU.';
        break;
      case 'reported':
        title = 'Report Reopened';
        body = 'Your report has been reopened for further review.';
        break;
      default:
        return null;
    }
    return {
      'type': 'status_update',
      'title': title,
      'body': body,
      'status': status == 'solved' ? 'success' : 'info',
      'reportId': reportId,
      'timestamp': FieldValue.serverTimestamp(),
      'read': false,
    };
  }

  @override
  Future<void> flagReport(String userId, String reportId, bool isFlagged) async {
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .doc(reportId)
          .update({'isFlagged': isFlagged});
      ToastUtils.showSuccess(
          isFlagged ? 'Report flagged as suspicious' : 'Flag removed');
    } catch (e) {
      ToastUtils.showError('Failed to update flag: $e');
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
  Future<void> transferToLevel(
      String userId, String reportId, HandlingLevel level) async {
    try {
      // Keep escalatedToProvince in sync so existing province views/badges
      // continue to work: it's true for provincial and Region II tiers.
      final escalated = level == HandlingLevel.provincial ||
          level == HandlingLevel.regionII;
      final data = <String, dynamic>{
        'handlingLevel': level.key,
        'escalatedToProvince': escalated,
      };
      if (escalated) {
        data['escalatedAt'] = FieldValue.serverTimestamp();
      }
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .doc(reportId)
          .update(data);
      ToastUtils.showSuccess('Report transferred to ${level.displayName} level');
    } catch (e) {
      ToastUtils.showError('Failed to transfer report: $e');
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
