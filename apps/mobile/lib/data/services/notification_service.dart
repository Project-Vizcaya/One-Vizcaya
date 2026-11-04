import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:in_app_review/in_app_review.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/utils/toast_utils.dart';
import '../../presentation/state/municipality_state.dart';
import '../../presentation/widgets/broadcast_presenter.dart';
import 'report_submitter.dart';

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

    // Present FCM foreground messages as a professional top heads-up banner
    // (replaces the easy-to-miss green bottom toast). Broadcasts are skipped
    // here — the in-app Firestore listener presents them (urgent takeover /
    // heads-up banner) — which also avoids a duplicate.
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      if (message.data['type'] == 'broadcast') return;
      final notification = message.notification;
      if (notification == null) return;
      final title = notification.title ?? 'Update';
      final body = notification.body ?? '';
      final reportId = message.data['reportId'] as String?;
      final navKey = navigatorKey;
      if (navKey != null) {
        // notifyOnStatusChange sends the status under `newStatus`.
        final statusData = message.data['status'] as String? ??
            message.data['newStatus'] as String? ??
            '';
        final style = _statusStyle(statusData);
        InAppNotifier.show(
          navigatorKey: navKey,
          label: style.label,
          title: title,
          body: body,
          icon: style.icon,
          accent: style.accent,
          onTap: (reportId != null && reportId.isNotEmpty)
              ? () => navKey.currentState?.pushNamed(
                    '/status',
                    arguments: {'reportId': reportId},
                  )
              : null,
        );
      } else {
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

    // Deliver queued reports now and whenever connectivity returns (app start,
    // sign-in, return to foreground, and every 60 s while anything is queued).
    QueueFlusher.instance.start();
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
    final data = message.data;

    // Broadcast opened from the notification tray (app was backgrounded/killed):
    // show the same in-app presentation the foreground listener would have.
    if (data['type'] == 'broadcast') {
      final navKey = navigatorKey;
      if (navKey != null) {
        BroadcastPresenter.present(
          navigatorKey: navKey,
          urgent: data['urgent'] == 'true',
          title: data['title'] as String? ?? 'Announcement',
          body: data['body'] as String? ?? '',
        );
      }
      return;
    }

    final reportId = data['reportId'] as String?;
    if (reportId != null && reportId.isNotEmpty) {
      navigatorKey?.currentState?.pushNamed(
        '/status',
        arguments: {'reportId': reportId},
      );
    }
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
        // Broadcasts are presented by _listenForBroadcasts (urgent takeover /
        // heads-up banner) and also stored here for the inbox. Skip them so they
        // aren't presented a second time; leave them unread for the inbox badge.
        if (data['type'] == 'broadcast') continue;
        final title = data['title'] as String? ?? 'Update';
        final body = data['body'] as String? ?? '';
        final status = data['status'] as String? ?? '';
        final reportId = data['reportId'] as String?;
        final ts = (data['timestamp'] as Timestamp?)?.toDate();

        final navKey = navigatorKey;
        if (navKey != null) {
          final style = _statusStyle(status);
          InAppNotifier.show(
            navigatorKey: navKey,
            label: style.label,
            title: title,
            body: body,
            icon: style.icon,
            accent: style.accent,
            timestamp: ts,
            onTap: (reportId != null && reportId.isNotEmpty)
                ? () => navKey.currentState?.pushNamed(
                      '/status',
                      arguments: {'reportId': reportId},
                    )
                : null,
          );
        } else {
          ToastUtils.showSuccess('$title: $body');
        }
        // Mark as read
        await doc.reference.update({'read': true});

        // Feature 5: prompt in-app review when a report is solved
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
        // Resolve the target municipality the same way the onNewBroadcast Cloud
        // Function does, so in-app presentation matches who actually gets the push:
        //   • admin composer: scope="all" (everyone) or scope="municipality" + municipality field
        //   • rainfallWatch:  scope=<municipality name>
        //   • legacy:         scope="All Province"
        final scope = data['scope'] as String?;
        final muniField = data['municipality'] as String?;
        String? targetMuni;
        if (muniField != null && muniField.isNotEmpty) {
          targetMuni = muniField;
        } else if (scope != null &&
            !const ['all', 'All Province', 'municipality'].contains(scope)) {
          targetMuni = scope; // scope is itself a municipality name
        }
        // null target = province-wide (everyone); otherwise must match this user.
        if (targetMuni != null && targetMuni != municipality) continue;

        final title = data['title'] as String? ?? 'Announcement';
        final body = data['body'] as String? ?? '';
        final urgent = data['urgent'] as bool? ?? false;
        final ts = (data['timestamp'] as Timestamp?)?.toDate();

        final navKey = navigatorKey;
        if (navKey != null) {
          BroadcastPresenter.present(
            navigatorKey: navKey,
            urgent: urgent,
            title: title,
            body: body,
            timestamp: ts,
          );
        } else {
          // Fallback if the navigator isn't ready yet (very early startup).
          ToastUtils.showInfo('$title: $body');
        }
        try {
          await _firestore.collection('users').doc(uid).collection('notifications').add({
            'type': 'broadcast',
            'title': title,
            'body': body,
            'status': urgent ? 'urgent' : 'info',
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

  // Maps a report/notification status to a label, icon, and accent colour for
  // the in-app heads-up banner.
  ({String label, IconData icon, Color accent}) _statusStyle(String status) {
    switch (status) {
      case 'solved':
      case 'success':
        return (
          label: 'REPORT RESOLVED',
          icon: Icons.check_circle_rounded,
          accent: const Color(0xFF2E7D32),
        );
      case 'ongoing':
        return (
          label: 'REPORT UPDATE',
          icon: Icons.construction_rounded,
          accent: const Color(0xFFE65100),
        );
      case 'urgent':
        return (
          label: 'URGENT',
          icon: Icons.warning_amber_rounded,
          accent: const Color(0xFF8B0000),
        );
      default:
        return (
          label: 'UPDATE',
          icon: Icons.notifications_active_rounded,
          accent: const Color(0xFF1565C0),
        );
    }
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
