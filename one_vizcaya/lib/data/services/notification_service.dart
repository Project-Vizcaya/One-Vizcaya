import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/utils/toast_utils.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Background messages are handled by the OS notification tray automatically.
}

class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

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

    // Save token when it refreshes
    _messaging.onTokenRefresh.listen((newToken) {
      _saveToken(newToken);
    });

    // Listen to auth state so token is saved when user logs in
    FirebaseAuth.instance.authStateChanges().listen((user) {
      if (user != null) {
        _saveTokenForCurrentUser();
      }
    });

    // Show foreground messages as toasts
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notification = message.notification;
      if (notification != null) {
        final title = notification.title ?? 'Update';
        final body = notification.body ?? '';
        ToastUtils.showSuccess('$title: $body');
      }
    });
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
    } catch (_) {
      // Non-fatal — token will be saved on next login
    }
  }
}
