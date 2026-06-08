import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Assembles a complete, structured copy of everything One Vizcaya holds about
/// the signed-in user.
///
/// Backs the citizen's **Right to Access** and **Right to Data Portability**
/// under the Data Privacy Act of 2012 (RA 10173). The result is a plain,
/// machine-readable map that can be serialised to JSON or rendered to a PDF.
class DataExportService {
  static final DataExportService _instance = DataExportService._internal();
  factory DataExportService() => _instance;
  DataExportService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Gathers the user's profile, consent record, and every report they filed
  /// into a single structured map. Returns `null` if no user is signed in.
  Future<Map<String, dynamic>?> collectUserData() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return null;
    final uid = user.uid;

    final userDoc = await _firestore.collection('users').doc(uid).get();
    final userData = userDoc.data() ?? <String, dynamic>{};

    final reportsSnap =
        await _firestore.collection('users').doc(uid).collection('reports').get();

    final reports = reportsSnap.docs
        .map((d) => _normalise(<String, dynamic>{'id': d.id, ...d.data()}))
        .toList();

    return {
      'export': {
        'app': 'One Vizcaya',
        'law': 'Republic Act No. 10173 (Data Privacy Act of 2012)',
        'generatedAt': DateTime.now().toUtc().toIso8601String(),
        'note':
            'This file contains all personal data One Vizcaya holds about you. '
            'It is provided in support of your right to access and data portability.',
      },
      'account': {
        'userId': uid,
        'phoneNumber': user.phoneNumber ?? userData['phoneNumber'],
        'email': user.email ?? userData['email'],
      },
      'profile': {
        'name': userData['name'],
        'email': userData['email'],
        'phoneNumber': userData['phoneNumber'],
        'location': userData['location'],
        'createdAt': _readable(userData['createdAt']),
        'updatedAt': _readable(userData['updatedAt']),
      },
      'consent': {
        'consentGiven': userData['consentGiven'] ?? false,
        'consentTimestamp': _readable(userData['consentTimestamp']),
      },
      'pushNotifications': {
        'fcmTokenOnRecord': userData['fcmToken'] != null,
      },
      'reports': reports,
      'reportCount': reports.length,
    };
  }

  /// Pretty-printed JSON representation of [collectUserData], suitable for the
  /// clipboard or a downloadable file.
  Future<String?> exportAsJson() async {
    final data = await collectUserData();
    if (data == null) return null;
    return const JsonEncoder.withIndent('  ').convert(data);
  }

  /// Recursively converts Firestore-specific types (Timestamp, GeoPoint) into
  /// portable, human-readable values so the export is provider-neutral.
  Map<String, dynamic> _normalise(Map<String, dynamic> input) {
    final out = <String, dynamic>{};
    input.forEach((key, value) {
      out[key] = _readable(value);
    });
    return out;
  }

  dynamic _readable(dynamic value) {
    if (value is Timestamp) return value.toDate().toUtc().toIso8601String();
    if (value is GeoPoint) {
      return {'latitude': value.latitude, 'longitude': value.longitude};
    }
    if (value is Map) {
      return value.map((k, v) => MapEntry(k.toString(), _readable(v)));
    }
    if (value is List) return value.map(_readable).toList();
    return value;
  }
}

final dataExportService = DataExportService();
