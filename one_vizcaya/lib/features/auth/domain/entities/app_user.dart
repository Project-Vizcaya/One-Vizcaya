enum UserRole { citizen, admin, municipalAdmin, provincialAdmin }

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
      role: _roleFromString(map['role'] as String?),
    );
  }

  static UserRole _roleFromString(String? value) {
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
    'role': role.name,
  };

  AppUser copyWith({UserRole? role}) => AppUser(
    uid: uid,
    name: name,
    phoneNumber: phoneNumber,
    municipality: municipality,
    role: role ?? this.role,
  );
}
