import 'package:cloud_firestore/cloud_firestore.dart';
import '../../features/auth/domain/entities/app_user.dart';
import '../../core/utils/toast_utils.dart';

class RoleService {
  static final RoleService _instance = RoleService._internal();
  factory RoleService() => _instance;
  RoleService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Assigns [role] to the user with [targetUid] by writing to their Firestore doc.
  Future<void> assignRole(String targetUid, UserRole role) async {
    try {
      await _firestore.collection('users').doc(targetUid).set(
        {'role': role.firestoreValue},
        SetOptions(merge: true),
      );
      ToastUtils.showSuccess('Role updated to ${role.displayName}');
    } catch (e) {
      ToastUtils.showError('Failed to assign role: $e');
      rethrow;
    }
  }

  /// Stream of all users ordered by name, for the role management tab.
  Stream<QuerySnapshot> getUsersStream() {
    return _firestore.collection('users').orderBy('name').snapshots();
  }
}

final roleService = RoleService();
