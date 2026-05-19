import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/utils/toast_utils.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Background messages handled by OS notification tray.
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

    _messaging.onTokenRefresh.listen((newToken) {
      _saveToken(newToken);
    });

    FirebaseAuth.instance.authStateChanges().listen((user) {
      if (user != null) {
        _saveTokenForCurrentUser();
        _listenForStatusNotifications(user.uid);
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

    // If already logged in at init time, start listening immediately
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) _listenForStatusNotifications(user.uid);
  }

  // Listens to users/{uid}/notifications for documents where read == false
  // and shows an in-app toast. Marks them as read after showing.
  void _listenForStatusNotifications(String uid) {
    _firestore
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
    } catch (_) {}
  }
}
