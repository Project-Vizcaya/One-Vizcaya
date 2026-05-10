enum UserRole { citizen, admin }

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
      role: map['role'] == 'admin' ? UserRole.admin : UserRole.citizen,
    );
  }

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
