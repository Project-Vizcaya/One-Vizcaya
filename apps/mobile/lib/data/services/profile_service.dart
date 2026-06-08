import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/models/user_profile.dart';
import '../../core/utils/toast_utils.dart';

/// Service for reading and writing user profile data in Firestore.
///
/// Profile data is stored at: `users/{uid}/profile/info`
class ProfileService {
  static final ProfileService _instance = ProfileService._internal();
  factory ProfileService() => _instance;
  ProfileService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Fetch the user's profile from Firestore.
  /// Returns null if no profile exists yet.
  Future<UserProfile?> getProfile(String uid) async {
    try {
      final doc = await _firestore
          .collection('users')
          .doc(uid)
          .get();

      if (doc.exists) {
        return UserProfile.fromFirestore(doc);
      }
      return null;
    } catch (e) {
      ToastUtils.showError('Failed to load profile: $e');
      return null;
    }
  }

  /// Save or update the user's profile in Firestore.
  Future<void> saveProfile(UserProfile profile) async {
    try {
      final data = profile.toMap();

      // Also set createdAt on first write
      final ref = _firestore.collection('users').doc(profile.uid);
      final existing = await ref.get();
      final payload = <String, dynamic>{...data};
      if (!existing.exists || existing.data()?['createdAt'] == null) {
        payload['createdAt'] = FieldValue.serverTimestamp();
      }
      await ref.set(payload, SetOptions(merge: true));

      ToastUtils.showSuccess('Profile saved successfully');
    } catch (e) {
      ToastUtils.showError('Failed to save profile: $e');
      rethrow;
    }
  }

  /// Stream the user's profile for real-time updates.
  Stream<UserProfile?> profileStream(String uid) {
    return _firestore
        .collection('users')
        .doc(uid)
        .snapshots()
        .map((doc) {
      if (doc.exists) {
        return UserProfile.fromFirestore(doc);
      }
      return null;
    });
  }
}

final profileService = ProfileService();
