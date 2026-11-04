import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../../domain/models/problem_report.dart';
import '../../domain/enums/handling_level.dart';
import '../../domain/repositories/report_repository.dart';
import '../../core/utils/toast_utils.dart';
import '../../core/utils/callable.dart';

class FirebaseReportRepository implements ReportRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  @override
  Future<String> submitReport(ProblemReport report, String userId,
      {String? docId, DateTime? originalReportedAt}) async {
    // Errors propagate: the caller decides whether a failure means "queue it
    // for later" or "tell the user", so no toast is shown here.
    final reports =
        _firestore.collection('users').doc(userId).collection('reports');
    final docRef = docId != null ? reports.doc(docId) : reports.doc();
    final data = report.toMap();
    if (originalReportedAt != null) {
      // Filed offline: keep the citizen's real filing time (response-time
      // metrics depend on it) and record when it actually arrived.
      data['reportedAt'] = Timestamp.fromDate(originalReportedAt);
      data['submittedAt'] = FieldValue.serverTimestamp();
      data['queuedOffline'] = true;
    }
    await docRef.set(data);

    // Fixed receipt id: a retry overwrites the same receipt instead of
    // sending the citizen a second "Report Submitted" notice.
    await _firestore
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .doc('receipt_${docRef.id}')
        .set({
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
    return docRef.id;
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
  Stream<List<ProblemReport>> getBarangayReports(
    String municipality,
    String barangay,
  ) {
    // Scoped to a single barangay. The equality filters on municipality AND
    // barangay are what let the security rules authorise a Barangay admin's
    // collectionGroup read (the rule confines them to actorMunicipality +
    // actorBarangay).
    return _firestore
        .collectionGroup('reports')
        .where('municipality', isEqualTo: municipality)
        .where('barangay', isEqualTo: barangay)
        .orderBy('reportedAt', descending: true)
        .limit(_adminQueryLimit)
        .snapshots()
        .transform(_safeReportTransformer('getBarangayReports'));
  }

  @override
  Stream<List<ProblemReport>> getAllProvincialReports() {
    // Approval chain: the Provincial dashboard only surfaces reports a Municipal
    // admin has approved for escalation (escalatedToProvince == true). Reports
    // pending municipal review are not visible/actionable at the provincial tier.
    return _firestore
        .collectionGroup('reports')
        .where('escalatedToProvince', isEqualTo: true)
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

  // PDRRMO §8: a bad report is recorded, never silently deleted.
  // firestore.rules requires every field below: an allowed disposition, a
  // reason of 5+ characters, dispositionBy == this admin, and the server time.
  @override
  Future<void> referToOffice(String userId, String reportId,
      {required String officeType,
      required String officeName,
      String contact = '',
      String note = ''}) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .doc(reportId)
          .update({
        // firestore.rules require by == the acting admin and at == the
        // server time, and refuse removal of a referral.
        'referral': {
          'officeType': officeType,
          'officeName': officeName.trim(),
          'contact': contact.trim(),
          'note': note.trim(),
          'by': uid,
          'at': FieldValue.serverTimestamp(),
        },
      });
      ToastUtils.showSuccess('Referred to ${officeName.trim()}');
    } catch (e) {
      ToastUtils.showError('Failed to record referral: $e');
      rethrow;
    }
  }

  @override
  Future<void> closeWithDisposition(String userId, String reportId,
      String disposition, String reason, {String? duplicateOf}) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    final dup = duplicateOf?.trim();
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .doc(reportId)
          .update({
        'status': 'closed',
        'disposition': disposition,
        'dispositionReason': reason.trim(),
        'dispositionBy': uid,
        'dispositionAt': FieldValue.serverTimestamp(),
        'duplicateOf': disposition == 'duplicate' && dup != null && dup.isNotEmpty
            ? dup
            : FieldValue.delete(),
      });
      ToastUtils.showSuccess(
          'Closed: ${ProblemReport.dispositionLabel(disposition)}');
    } catch (e) {
      ToastUtils.showError('Failed to close report: $e');
      rethrow;
    }
  }

  @override
  Future<void> reopenReport(String userId, String reportId) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .doc(reportId)
          .update({
        'status': 'under_review',
        'disposition': FieldValue.delete(),
        'dispositionReason': FieldValue.delete(),
        'dispositionBy': FieldValue.delete(),
        'dispositionAt': FieldValue.delete(),
        'duplicateOf': FieldValue.delete(),
        'reopenedBy': uid,
      });
      ToastUtils.showSuccess('Report re-opened');
    } catch (e) {
      ToastUtils.showError('Failed to re-open report: $e');
      rethrow;
    }
  }

  @override
  Future<void> escalateToProvince(String userId, String reportId) async {
    try {
      // Approval handoff (Municipal → Provincial): record WHO approved the
      // escalation so it's an auditable transition, not just a status flag.
      final approverUid = FirebaseAuth.instance.currentUser?.uid;
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('reports')
          .doc(reportId)
          .update({
            'escalatedToProvince': true,
            'escalatedAt': FieldValue.serverTimestamp(),
            'escalatedBy': approverUid,
          });
      ToastUtils.showSuccess('Report approved & escalated to Provincial Office');
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
        data['escalatedBy'] = FirebaseAuth.instance.currentUser?.uid;
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
  Future<void> deleteReport(String userId, String reportId, String reason) async {
    try {
      await callFunction('deleteReportWithReason',
          {'userId': userId, 'reportId': reportId, 'reason': reason});
      ToastUtils.showSuccess('Report deleted');
    } catch (e) {
      ToastUtils.showError('Failed to delete report: $e');
      rethrow;
    }
  }
}
