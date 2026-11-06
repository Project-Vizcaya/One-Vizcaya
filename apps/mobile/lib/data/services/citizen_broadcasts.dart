import 'package:cloud_firestore/cloud_firestore.dart';

/// The broadcasts a resident may read (P2 inbox), as firestore.rules allows
/// them: province-wide, or addressed to the town on the resident's PROFILE —
/// the same town onNewBroadcast uses to choose who gets the push. That is not
/// necessarily the town the user is currently browsing in the app.
///
/// Two queries, because a town alert stores the town in `scope` (approved
/// automated alerts, legacy) or in `municipality` (admin composer). The rules
/// refuse an unscoped read, so never query `broadcasts` without one of these.
List<Query<Map<String, dynamic>>> citizenBroadcastQueries(
  FirebaseFirestore db,
  String profileMunicipality, {
  int limit = 20,
}) {
  final col = db.collection('broadcasts');
  final hasTown = profileMunicipality.isNotEmpty;
  return [
    col
        .where('scope', whereIn: [
          'all',
          'All Province',
          if (hasTown) profileMunicipality,
        ])
        .orderBy('timestamp', descending: true)
        .limit(limit),
    if (hasTown)
      col
          .where('municipality', isEqualTo: profileMunicipality)
          .orderBy('timestamp', descending: true)
          .limit(limit),
  ];
}

/// The town on the signed-in user's profile ('' if none or unreadable).
Future<String> profileMunicipality(FirebaseFirestore db, String uid) async {
  try {
    final snap = await db.collection('users').doc(uid).get();
    return (snap.data()?['municipality'] as String?) ?? '';
  } catch (_) {
    return '';
  }
}
