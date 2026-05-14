import 'package:cloud_firestore/cloud_firestore.dart';
import '../../features/auth/domain/entities/app_user.dart';

class AdminService {
  static final AdminService _instance = AdminService._internal();
  factory AdminService() => _instance;
  AdminService._internal();

  // ── Hardcoded legacy admin UIDs (backward compat) ──
  static const List<String> _hardcodedAdminUids = [
    'KXeL25cxqiaTSHj8CJGCPvNpIh23',
    'XgWMpOQxnGg21a2wtCjJys3u3Ze2',
    'xT02JP6jbecjKRqKPy3zXQ7mtHt2', // Aaron's phone — Bambang admin
  ];

  List<String>? _firestoreAdminUids;
  DateTime? _lastFetched;
  static const _cacheDuration = Duration(minutes: 10);

  Future<bool> isAdmin(String uid) async {
    if (_hardcodedAdminUids.contains(uid)) return true;
    try {
      final firestoreAdmins = await _getFirestoreAdmins();
      return firestoreAdmins.contains(uid);
    } catch (_) {
      return false;
    }
  }

  /// Returns the Firestore-stored role for [uid].
  /// Falls back to [UserRole.admin] for legacy hardcoded admins.
  Future<UserRole> getUserRole(String uid) async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .get();
      if (doc.exists) {
        final roleStr = (doc.data() ?? {})['role'] as String?;
        final role = AppUser.roleFromString(roleStr);
        if (role != UserRole.citizen) return role;
      }
    } catch (_) {}
    // Backward compat: legacy hardcoded admins get admin role
    if (await isAdmin(uid)) return UserRole.admin;
    return UserRole.citizen;
  }

  Future<List<String>> _getFirestoreAdmins() async {
    final now = DateTime.now();
    if (_firestoreAdminUids != null &&
        _lastFetched != null &&
        now.difference(_lastFetched!) < _cacheDuration) {
      return _firestoreAdminUids!;
    }
    final doc = await FirebaseFirestore.instance
        .collection('config')
        .doc('admins')
        .get();
    if (doc.exists && doc.data() != null) {
      final uids = List<String>.from(doc.data()!['uids'] ?? []);
      _firestoreAdminUids = uids;
      _lastFetched = now;
      return uids;
    }
    _firestoreAdminUids = [];
    _lastFetched = now;
    return [];
  }

  void clearCache() {
    _firestoreAdminUids = null;
    _lastFetched = null;
  }
}

final adminService = AdminService();
