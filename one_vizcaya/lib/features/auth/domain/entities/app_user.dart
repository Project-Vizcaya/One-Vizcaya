enum UserRole { citizen, admin, municipalAdmin, provincialAdmin }

extension UserRoleX on UserRole {
  String get displayName {
    switch (this) {
      case UserRole.citizen:
        return 'Citizen';
      case UserRole.admin:
        return 'Admin';
      case UserRole.municipalAdmin:
        return 'Municipal Admin';
      case UserRole.provincialAdmin:
        return 'Provincial Admin';
    }
  }

  String get firestoreValue {
    switch (this) {
      case UserRole.provincialAdmin:
        return 'provincial_admin';
      case UserRole.municipalAdmin:
        return 'municipal_admin';
      case UserRole.admin:
        return 'admin';
      case UserRole.citizen:
        return 'citizen';
    }
  }
}

class AppUser {
  final String uid;
  final String name;
  final String phoneNumber;
  final String municipality;
  final UserRole role;

  const AppUser({
    required this.uid,
    required this.name,
    required this.phoneNumber,
    required this.municipality,
    this.role = UserRole.citizen,
  });

  factory AppUser.fromMap(Map<String, dynamic> map, String uid) {
    return AppUser(
      uid: uid,
      name: map['name'] ?? '',
      phoneNumber: map['phoneNumber'] ?? '',
      municipality: map['municipality'] ?? '',
      role: roleFromString(map['role'] as String?),
    );
  }

  static UserRole roleFromString(String? value) {
    switch (value) {
      case 'provincial_admin':
        return UserRole.provincialAdmin;
      case 'municipal_admin':
        return UserRole.municipalAdmin;
      case 'admin':
        return UserRole.admin;
      default:
        return UserRole.citizen;
    }
  }

  bool get isAnyAdmin =>
      role == UserRole.admin ||
      role == UserRole.municipalAdmin ||
      role == UserRole.provincialAdmin;

  bool get isProvincialAdmin => role == UserRole.provincialAdmin;

  Map<String, dynamic> toMap() => {
        'name': name,
        'phoneNumber': phoneNumber,
        'municipality': municipality,
        'role': role.firestoreValue,
      };

  AppUser copyWith({UserRole? role}) => AppUser(
        uid: uid,
        name: name,
        phoneNumber: phoneNumber,
        municipality: municipality,
        role: role ?? this.role,
      );
}
