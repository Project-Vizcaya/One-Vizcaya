import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:in_app_review/in_app_review.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/utils/toast_utils.dart';
import '../../presentation/state/municipality_state.dart';
import 'offline_queue_service.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Background messages handled by OS notification tray.
}

class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Navigator key for FCM tap routing — set from main.dart after the widget tree is built
  GlobalKey<NavigatorState>? navigatorKey;

  // FIX 2: Guard flag to prevent duplicate listener registration
  bool _listenersActive = false;

  // FIX 3: Store subscriptions so they can be cancelled on logout
  StreamSubscription? _statusSub;
  StreamSubscription? _broadcastSub;

  Future<void> initialize() async {
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional) {
      await _saveTokenForCurrentUser();
    }

    _messaging.onTokenRefresh.listen((newToken) {
      _saveToken(newToken);
    });

    FirebaseAuth.instance.authStateChanges().listen((user) {
      if (user != null) {
        _saveTokenForCurrentUser();
        // FIX 2: Only register listeners if not already active
        if (!_listenersActive) {
          _listenForStatusNotifications(user.uid);
          _listenForBroadcasts(user.uid, oneVizcayaState.selectedMunicipality.value);
          _listenersActive = true;
        }
      } else {
        // FIX 3: Cancel subscriptions and reset flag on logout
        _statusSub?.cancel();
        _statusSub = null;
        _broadcastSub?.cancel();
        _broadcastSub = null;
        _listenersActive = false;
      }
    });

    // Show FCM foreground messages as toasts
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notification = message.notification;
      if (notification != null) {
        final title = notification.title ?? 'Update';
        final body = notification.body ?? '';
        ToastUtils.showSuccess('$title: $body');
      }
    });

    // FCM tap routing: background → foreground
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _handleNotificationTap(message);
    });

    // If already logged in at init time, start listening immediately
    // FIX 2: Only register if not already active
    final user = FirebaseAuth.instance.currentUser;
    if (user != null && !_listenersActive) {
      _listenForStatusNotifications(user.uid);
      _listenForBroadcasts(user.uid, oneVizcayaState.selectedMunicipality.value);
      _listenersActive = true;
    }

    // Process any offline queued reports now that we're initialised (online check
    // happens lazily — if Firebase is reachable the submissions will succeed)
    _processOfflineQueue();
  }

  /// Called after the widget tree is built (via WidgetsBinding.addPostFrameCallback).
  /// Handles the case where the app was terminated and opened via a notification tap.
  Future<void> handleInitialMessage() async {
    final message = await FirebaseMessaging.instance.getInitialMessage();
    if (message != null) {
      _handleNotificationTap(message);
    }
  }

  void _handleNotificationTap(RemoteMessage message) {
    final reportId = message.data['reportId'] as String?;
    if (reportId != null && reportId.isNotEmpty) {
      navigatorKey?.currentState?.pushNamed(
        '/status',
        arguments: {'reportId': reportId},
      );
    }
  }

  Future<void> _processOfflineQueue() async {
    final queue = await OfflineQueueService().getQueue();
    if (queue.isEmpty) return;
    try {
      for (final data in queue) {
        final userId = data['userId'] as String? ?? '';
        if (userId.isEmpty) continue;
        final report = _reportFromMap(data);
        await _firestore
            .collection('users')
            .doc(userId)
            .collection('reports')
            .add(report);
      }
      await OfflineQueueService().clearQueue();
      debugPrint('NotificationService: offline queue flushed (${queue.length} reports)');
    } catch (e) {
      debugPrint('NotificationService._processOfflineQueue error: $e');
    }
  }

  Map<String, dynamic> _reportFromMap(Map<String, dynamic> data) {
    // Re-build the Firestore payload from stored map.
    // We pass through as-is but convert the ISO-8601 reportedAt string back to
    // a server timestamp placeholder for consistency.
    final out = Map<String, dynamic>.from(data);
    out.remove('userId'); // userId is part of the document path, not the payload
    out['reportedAt'] = FieldValue.serverTimestamp();
    return out;
  }

  // Listens to users/{uid}/notifications for documents where read == false
  // and shows an in-app toast. Marks them as read after showing.
  void _listenForStatusNotifications(String uid) {
    // FIX 3: Store subscription for later cancellation
    _statusSub = _firestore
        .collection('users')
        .doc(uid)
        .collection('notifications')
        .where('read', isEqualTo: false)
        .orderBy('timestamp', descending: true)
        .snapshots()
        .listen((snap) async {
      for (final doc in snap.docs) {
        final data = doc.data();
        final title = data['title'] as String? ?? 'Update';
        final body = data['body'] as String? ?? '';
        ToastUtils.showSuccess('$title: $body');
        // Mark as read
        await doc.reference.update({'read': true});

        // Feature 5: prompt in-app review when a report is solved
        final status = data['status'] as String? ?? '';
        if (status == 'solved') {
          _maybeShowRatingPrompt();
        }
      }
    }, onError: (e) {
      // FIX 1: Log errors instead of swallowing them silently
      debugPrint('NotificationService._listenForStatusNotifications error: $e');
    });
  }

  void _listenForBroadcasts(String uid, String municipality) {
    final startTime = Timestamp.now();
    // FIX 3: Store subscription for later cancellation
    _broadcastSub = _firestore
        .collection('broadcasts')
        .where('timestamp', isGreaterThan: startTime)
        .snapshots()
        .listen((snap) async {
      for (final doc in snap.docChanges.where((c) => c.type == DocumentChangeType.added)) {
        final rawData = doc.doc.data();
        if (rawData == null) continue;
        final data = rawData;
        final scope = data['scope'] as String? ?? 'All Province';
        if (scope != 'All Province' && scope != municipality) continue;
        final title = data['title'] as String? ?? 'Announcement';
        final body = data['body'] as String? ?? '';
        ToastUtils.showInfo('📢 $title: $body');
        try {
          await _firestore.collection('users').doc(uid).collection('notifications').add({
            'type': 'broadcast',
            'title': title,
            'body': body,
            'status': 'info',
            'timestamp': FieldValue.serverTimestamp(),
            'read': false,
          });
        } catch (e) {
          // FIX 1: Log errors instead of swallowing them silently
          debugPrint('NotificationService._listenForBroadcasts: failed to save notification: $e');
        }
      }
    }, onError: (e) {
      // FIX 1: Log errors instead of swallowing them silently
      debugPrint('NotificationService._listenForBroadcasts error: $e');
    });
  }

  Future<void> _maybeShowRatingPrompt() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final alreadyShown = prefs.getBool('rating_prompt_shown') ?? false;
      if (alreadyShown) return;
      final inAppReview = InAppReview.instance;
      if (await inAppReview.isAvailable()) {
        await inAppReview.requestReview();
        await prefs.setBool('rating_prompt_shown', true);
      }
    } catch (e) {
      debugPrint('NotificationService._maybeShowRatingPrompt error: $e');
    }
  }

  Future<void> _saveTokenForCurrentUser() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    final token = await _messaging.getToken();
    if (token != null) await _saveToken(token, uid: user.uid);
  }

  Future<void> _saveToken(String token, {String? uid}) async {
    final resolvedUid = uid ?? FirebaseAuth.instance.currentUser?.uid;
    if (resolvedUid == null) return;
    try {
      await _firestore.collection('users').doc(resolvedUid).set(
        {'fcmToken': token},
        SetOptions(merge: true),
      );
    } catch (e) {
      // FIX 1: Log errors instead of swallowing them silently
      debugPrint('NotificationService._saveToken: failed to save FCM token: $e');
    }
  }
}
