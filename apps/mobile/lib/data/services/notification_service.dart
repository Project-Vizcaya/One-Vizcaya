import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:in_app_review/in_app_review.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/utils/toast_utils.dart';
import '../../presentation/widgets/broadcast_presenter.dart';
import 'report_submitter.dart';
import 'citizen_broadcasts.dart';

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
  final List<StreamSubscription> _broadcastSubs = [];

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
          _listenForBroadcasts(user.uid);
          _listenersActive = true;
        }
      } else {
        // FIX 3: Cancel subscriptions and reset flag on logout
        _statusSub?.cancel();
        _statusSub = null;
        for (final sub in _broadcastSubs) {
          sub.cancel();
        }
        _broadcastSubs.clear();
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
      _listenForBroadcasts(user.uid);
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

    // "Approval needed" push to admins: open the admin dashboard, whose
    // banner lists the alerts awaiting approval.
    if (data['type'] == 'alert_draft') {
      navigatorKey?.currentState?.pushNamed('/admin');
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

  // Presents a new broadcast in-app while the app is open. Uses the same scoped
  // queries as the inbox (citizen_broadcasts.dart): firestore.rules refuse an
  // unscoped read of `broadcasts` to residents, so the old unscoped listener
  // only ever worked for admins. Broadcasts are no longer copied into
  // users/{uid}/notifications: the inbox reads them directly.
  Future<void> _listenForBroadcasts(String uid) async {
    final startTime = DateTime.now();
    final town = await profileMunicipality(_firestore, uid);
    // Signed out (or switched account) while the profile was loading.
    if (FirebaseAuth.instance.currentUser?.uid != uid) return;
    final presented = <String>{};
    for (final q in citizenBroadcastQueries(_firestore, town, limit: 5)) {
      _broadcastSubs.add(q.snapshots().listen((snap) {
        for (final c in snap.docChanges.where((c) => c.type == DocumentChangeType.added)) {
          final data = c.doc.data();
          if (data == null) continue;
          final ts = (data['timestamp'] as Timestamp?)?.toDate();
          // The first snapshot lists recent alerts; only present new ones.
          if (ts == null || !ts.isAfter(startTime)) continue;
          if (!presented.add(c.doc.id)) continue;

          final title = data['title'] as String? ?? 'Announcement';
          final body = data['body'] as String? ?? '';
          final urgent = data['urgent'] as bool? ?? false;
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
        }
      }, onError: (e) {
        debugPrint('NotificationService._listenForBroadcasts error: $e');
      }));
    }
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
