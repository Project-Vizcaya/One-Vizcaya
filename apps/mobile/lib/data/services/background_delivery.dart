import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:workmanager/workmanager.dart';

import 'report_submitter.dart';

/// Background delivery of saved reports (P3, PDRRMO §1), Android only.
///
/// When reports are queued, a one-off WorkManager task is scheduled that
/// Android runs once the phone has a network connection, even if the app is
/// closed. It delivers through the same idempotent path as the app
/// (QueueFlusher.deliverQueued). If the connection drops part-way it asks
/// Android to retry with backoff. iOS keeps the existing behaviour: saved
/// reports are sent when the app is next opened.
const _taskName = 'deliver-saved-reports';

@pragma('vm:entry-point')
void backgroundDeliveryDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      // Android reads its config from google-services.json, so no options
      // are needed (and this file stays importable without firebase_options).
      if (Firebase.apps.isEmpty) await Firebase.initializeApp();
      final r = await QueueFlusher.deliverQueued();
      debugPrint('Background delivery: sent ${r.delivered}, interrupted: ${r.interrupted}');
      return !r.interrupted; // false -> Android retries later
    } catch (e) {
      debugPrint('Background delivery failed: $e');
      return false;
    }
  });
}

class BackgroundDelivery {
  static bool _ready = false;

  static bool get _supported => !kIsWeb && Platform.isAndroid;

  static Future<void> init() async {
    if (!_supported || _ready) return;
    try {
      await Workmanager().initialize(backgroundDeliveryDispatcher);
      _ready = true;
    } catch (e) {
      debugPrint('BackgroundDelivery.init failed: $e');
    }
  }

  /// Ensures one pending delivery task exists (no-op if already scheduled).
  static Future<void> schedule() async {
    if (!_supported) return;
    await init();
    if (!_ready) return;
    try {
      await Workmanager().registerOneOffTask(
        _taskName,
        _taskName,
        constraints: Constraints(networkType: NetworkType.connected),
        existingWorkPolicy: ExistingWorkPolicy.keep,
        backoffPolicy: BackoffPolicy.exponential,
        backoffPolicyDelay: const Duration(minutes: 1),
      );
    } catch (e) {
      debugPrint('BackgroundDelivery.schedule failed: $e');
    }
  }
}
