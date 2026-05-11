import 'package:cloud_firestore/cloud_firestore.dart';

class AdminService {
  static final AdminService _instance = AdminService._internal();
  factory AdminService() => _instance;
  AdminService._internal();

  // ── Hardcoded admin UIDs ──
  static const List<String> _hardcodedAdminUids = [
    'KXeL25cxqiaTSHj8CJGCPvNpIh23',
    'XgWMpOQxnGg21a2wtCjJys3u3Ze2',
    'xT02JP6jbecjKRqKPy3zXQ7mtHt2', // Aaron's phone — Bambang admin
  ];

  List<String>? _firestoreAdminUids;
  DateTime? _lastFetched;
  static const _cacheDuration = Duration(minutes: 10);

  Future<bool> isAdmin(String uid) async {
    // 1. Check hardcoded list first (instant)
    if (_hardcodedAdminUids.contains(uid)) {
      return true;
    }

    // 2. Check Firestore document (cached)
    try {
      final firestoreAdmins = await _getFirestoreAdmins();
      return firestoreAdmins.contains(uid);
    } catch (_) {
      return false;
    }
  }

  Future<List<String>> _getFirestoreAdmins() async {
    final now = DateTime.now();

    // Return cached if fresh
    if (_firestoreAdminUids != null &&
        _lastFetched != null &&
        now.difference(_lastFetched!) < _cacheDuration) {
      return _firestoreAdminUids!;
    }

    // Fetch from Firestore config/admins
    final doc = await FirebaseFirestore.instance
        .collection('config')
        .doc('admins')
        .get();

    if (doc.exists && doc.data() != null) {
      final data = doc.data()!;
      final uids = List<String>.from(data['uids'] ?? []);
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
    _lastFetched = now;
  }
}

final adminService = AdminService();