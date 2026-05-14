import 'package:cloud_firestore/cloud_firestore.dart';

/// Model representing a user's profile information.
class UserProfile {
  final String uid;
  final String phoneNumber;
  final String name;
  final String email;
  final String location; // Municipality or barangay
  final DateTime? createdAt;
  final DateTime? updatedAt;

  UserProfile({
    required this.uid,
    required this.phoneNumber,
    this.name = '',
    this.email = '',
    this.location = '',
    this.createdAt,
    this.updatedAt,
  });

  factory UserProfile.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return UserProfile(
      uid: doc.id,
      phoneNumber: data['phoneNumber'] ?? '',
      name: data['name'] ?? '',
      email: data['email'] ?? '',
      location: data['location'] ?? '',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'phoneNumber': phoneNumber,
      'name': name,
      'email': email,
      'location': location,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  /// Creates a copy with updated fields.
  UserProfile copyWith({
    String? phoneNumber,
    String? name,
    String? email,
    String? location,
  }) {
    return UserProfile(
      uid: uid,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      name: name ?? this.name,
      email: email ?? this.email,
      location: location ?? this.location,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
    );
  }
}
