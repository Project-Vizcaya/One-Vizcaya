import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/utils/connectivity_probe.dart';
import '../../core/utils/toast_utils.dart';
import '../../domain/enums/report_category.dart';
import '../../domain/enums/report_priority.dart';
import '../../domain/enums/report_status.dart';
import '../../domain/models/problem_report.dart';
import '../repositories_impl/firebase_report_repository.dart';
import 'offline_queue_service.dart';
import 'priority_service.dart';

/// The ONE path by which a citizen report reaches Firestore — used both for a
/// live submission and for delivering a queued one (PDRRMO §1, §8, §12).
///
/// Previously a queued report was written raw, so it skipped the photo, the
/// acknowledgement receipt and priority triage (always 'normal'). Now every
/// report, however it arrives, gets the same treatment.
class ReportSubmitter {
  ReportSubmitter._();

  static const _stepTimeout = Duration(seconds: 30);

  /// Compresses and re-encodes a photo with EXIF stripped (RA 10173 data
  /// minimisation). Returns null if re-encoding fails — the original file is
  /// never used, since it would carry raw EXIF, including GPS.
  static Future<Uint8List?> compressPhoto(File image) =>
      FlutterImageCompress.compressWithFile(
        image.absolute.path,
        minWidth: 1024,
        minHeight: 1024,
        quality: 75,
        format: CompressFormat.jpeg,
        keepExif: false,
      );

  /// Saves the compressed photo inside the app's own storage, so a queued
  /// report keeps its photo even if the picker's temporary file is cleaned up.
  static Future<String?> persistPhoto(File image, String queueId) async {
    final bytes = await compressPhoto(image);
    if (bytes == null) return null;
    final dir = Directory('${(await getApplicationDocumentsDirectory()).path}/queued_photos');
    await dir.create(recursive: true);
    final f = File('${dir.path}/$queueId.jpg');
    await f.writeAsBytes(bytes, flush: true);
    return f.path;
  }

  /// A report id chosen up front, before the first attempt.
  static String newReportId(String uid) => FirebaseFirestore.instance
      .collection('users')
      .doc(uid)
      .collection('reports')
      .doc()
      .id;

  /// Delivers [item] (the queue's map shape). Idempotent: if the report
  /// already exists on the server it returns null without writing again.
  /// Throws on failure; [isNetworkError] tells the caller whether to retry.
  static Future<({ReportPriority priority, int duplicateCount})?> deliver(
    Map<String, dynamic> item, {
    required bool queued,
  }) async {
    final user = FirebaseAuth.instance.currentUser;
    final uid = item['userId'] as String?;
    if (user == null || uid == null || user.uid != uid) {
      throw StateError('Report belongs to a different or signed-out account');
    }
    final reportId = item['reportId'] as String;
    final ref = FirebaseFirestore.instance
        .collection('users')
        .doc(uid)
        .collection('reports')
        .doc(reportId);

    // Already delivered (e.g. a previous attempt landed, or Firestore's own
    // offline sync caught up)? Then this attempt is done.
    if (queued) {
      final existing =
          await ref.get(const GetOptions(source: Source.server)).timeout(_stepTimeout);
      if (existing.exists) {
        await _deletePhoto(item);
        return null;
      }
    }

    final category = ReportCategory.fromString(item['category'] as String? ?? '');
    final municipality = item['municipality'] as String? ?? '';

    // Photo: upload if we still have it. A missing file just means no photo.
    String? imageUrl;
    final photoPath = item['photoPath'] as String?;
    if (photoPath != null && await File(photoPath).exists()) {
      final storageRef = FirebaseStorage.instance
          .ref()
          .child('report_images')
          .child('${uid}_$reportId.jpg');
      await storageRef
          .putData(await File(photoPath).readAsBytes(),
              SettableMetadata(contentType: 'image/jpeg'))
          .timeout(_stepTimeout);
      imageUrl = await storageRef.getDownloadURL().timeout(_stepTimeout);
    }

    final p = await PriorityService()
        .calculatePriority(category: category, municipality: municipality)
        .timeout(_stepTimeout);

    final reportedAt = DateTime.tryParse(item['reportedAt'] as String? ?? '') ?? DateTime.now();
    final photoTs = DateTime.tryParse(item['photoTimestamp'] as String? ?? '');
    final report = ProblemReport(
      id: reportId,
      category: category,
      description: item['description'] as String? ?? '',
      location: item['location'] as String? ?? '',
      municipality: municipality,
      status: ReportStatus.reported,
      priority: p.priority,
      priorityScore: p.score,
      duplicateCount: p.duplicateCount,
      reportedAt: reportedAt,
      latitude: (item['latitude'] as num?)?.toDouble(),
      longitude: (item['longitude'] as num?)?.toDouble(),
      userId: uid,
      userPhone: user.phoneNumber ?? item['userPhone'] as String?,
      imageUrl: imageUrl,
      photoTimestamp: photoTs,
      photoLatitude: (item['photoLatitude'] as num?)?.toDouble(),
      photoLongitude: (item['photoLongitude'] as num?)?.toDouble(),
      photoSource: item['photoSource'] as String?,
      isAnonymous: false,
      barangay: item['barangay'] as String?,
    );

    await FirebaseReportRepository()
        .submitReport(report, uid,
            docId: reportId, originalReportedAt: queued ? reportedAt : null)
        .timeout(_stepTimeout);
    await _deletePhoto(item);
    return (priority: p.priority, duplicateCount: p.duplicateCount);
  }

  /// Connectivity-type failures worth retrying later (vs. a permanent refusal).
  static bool isNetworkError(Object e) =>
      e is TimeoutException ||
      e is SocketException ||
      (e is FirebaseException &&
          const ['unavailable', 'deadline-exceeded', 'network-request-failed', 'retry-limit-exceeded']
              .contains(e.code));

  static Future<void> _deletePhoto(Map<String, dynamic> item) async {
    final path = item['photoPath'] as String?;
    if (path == null) return;
    try {
      final f = File(path);
      if (await f.exists()) await f.delete();
    } catch (_) {/* best effort */}
  }
}

/// Delivers queued reports automatically when connectivity returns: on app
/// start, on sign-in, whenever the app comes back to the foreground, and every
/// 60 s while anything is queued. (Previously: only at the next cold start.)
class QueueFlusher with WidgetsBindingObserver {
  QueueFlusher._();
  static final QueueFlusher instance = QueueFlusher._();

  bool _started = false;
  bool _running = false;
  Timer? _timer;

  void start() {
    if (_started) return;
    _started = true;
    WidgetsBinding.instance.addObserver(this);
    FirebaseAuth.instance.authStateChanges().listen((u) {
      if (u != null) flush();
    });
    OfflineQueueService.count.addListener(_syncTimer);
    OfflineQueueService().getQueue(); // seeds the count -> timer
    flush();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) flush();
  }

  void _syncTimer() {
    if (OfflineQueueService.count.value > 0) {
      _timer ??= Timer.periodic(const Duration(seconds: 60), (_) => flush());
    } else {
      _timer?.cancel();
      _timer = null;
    }
  }

  /// Single-flight: overlapping triggers share one pass.
  Future<void> flush() async {
    if (_running) return;
    _running = true;
    try {
      final queue = await OfflineQueueService().getQueue();
      final uid = FirebaseAuth.instance.currentUser?.uid;
      final mine = queue
          .where((x) => x['userId'] == uid &&
              ((x['attempts'] as int?) ?? 0) < OfflineQueueService.maxAttempts)
          .toList();
      if (uid == null || mine.isEmpty) return;
      if (!await ConnectivityProbe.isOnline()) return;

      var delivered = 0;
      for (final item in mine) {
        try {
          await ReportSubmitter.deliver(item, queued: true);
          // Removed immediately, one at a time — never all-or-nothing.
          await OfflineQueueService().remove(item['queueId'] as String);
          delivered++;
        } catch (e) {
          if (ReportSubmitter.isNetworkError(e)) break; // connection dropped; retry later
          // A permanent refusal (e.g. permission): count it, keep the report.
          await OfflineQueueService().recordFailedAttempt(item['queueId'] as String, '$e');
          debugPrint('QueueFlusher: item ${item['queueId']} failed: $e');
        }
      }
      if (delivered > 0) {
        ToastUtils.showSuccess(delivered == 1
            ? 'Your saved report was sent.'
            : '$delivered saved reports were sent.');
      }
    } catch (e) {
      debugPrint('QueueFlusher.flush error: $e');
    } finally {
      _running = false;
    }
  }
}
