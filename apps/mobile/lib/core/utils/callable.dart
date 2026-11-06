import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:http/http.dart' as http;

/// Error returned by a Cloud Function, e.g. code "PERMISSION_DENIED".
class CallableException implements Exception {
  final String code;
  final String message;
  const CallableException(this.code, this.message);
  @override
  String toString() => message;
}

/// Calls an `onCall` Cloud Function through Firebase's documented callable
/// HTTP protocol, using the existing `http` package and the signed-in user's
/// ID token — so no native cloud_functions plugin is needed.
///
/// Returns the function's `result`. Throws [CallableException] with the
/// function's own error code and message on failure.
Future<dynamic> callFunction(
  String name,
  Map<String, dynamic> data, {
  Duration timeout = const Duration(seconds: 20),
}) async {
  final user = FirebaseAuth.instance.currentUser;
  if (user == null) {
    throw const CallableException('UNAUTHENTICATED', 'Please sign in.');
  }
  final idToken = await user.getIdToken();
  final projectId = Firebase.app().options.projectId;
  final resp = await http
      .post(
        Uri.parse('https://us-central1-$projectId.cloudfunctions.net/$name'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
        body: json.encode({'data': data}),
      )
      .timeout(timeout);

  final decoded = resp.body.isEmpty ? null : json.decode(resp.body);
  if (resp.statusCode != 200) {
    final err = decoded is Map ? decoded['error'] : null;
    throw CallableException(
      err is Map ? (err['status'] as String? ?? 'UNKNOWN') : 'HTTP_${resp.statusCode}',
      err is Map ? (err['message'] as String? ?? 'Request failed') : 'Request failed (${resp.statusCode})',
    );
  }
  return decoded is Map ? decoded['result'] : null;
}
