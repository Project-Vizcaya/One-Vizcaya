import 'package:cloud_firestore/cloud_firestore.dart';

/// Service to determine if a user has admin privileges.
///
/// Currently uses a hardcoded list of admin UIDs.
/// Can be extended to read from Firestore `config/admins` document.
class AdminService {
  static final AdminService _instance = AdminService._internal();
  factory AdminService() => _instance;
  AdminService._internal();

  // ── Hardcoded admin UIDs ──────────────────────────────────────────
  // Add the Firebase Auth UIDs of admin users here.
  // These users will see the Admin Dashboard in their Profile menu.
  static const List<String> _hardcodedAdminUids = [
    // Example: 'abc123XYZ...'
    // Add your admin UIDs below:
    'KXeL25cxqiaTSHj8CJGCPvNpIh23',
    'XgWMpOQxnGg21a2wtCjJys3u3Ze2',
  ];

  // Cache for Firestore-based admin list
  List<String>? _firestoreAdminUids;
  DateTime? _lastFetched;
  static const _cacheDuration = Duration(minutes: 10);

  /// Check if a user UID has admin privileges.
  ///
  /// First checks the hardcoded list, then falls back to Firestore.
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
      // If Firestore fails, only hardcoded list is used
      return false;
    }
  }

  /// Fetch admin UIDs from Firestore `config/admins` document.
  /// Results are cached for [_cacheDuration].
  Future<List<String>> _getFirestoreAdmins() async {
    final now = DateTime.now();

    // Return cached if fresh
    if (_firestoreAdminUids != null &&
        _lastFetched != null &&
        now.difference(_lastFetched!) < _cacheDuration) {
      return _firestoreAdminUids!;
    }

    // Fetch from Firestore
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

  /// Clear the cached admin list (e.g. on logout).
  void clearCache() {
    _firestoreAdminUids = null;
    _lastFetched = null;
  }
}

final adminService = AdminService();
