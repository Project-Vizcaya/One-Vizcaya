import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;

/// Real reachability check, shared by the home banner, the report screen and
/// the offline-queue flusher. (Moved from HomeScreen._checkConnectivity.)
///
/// Uses an actual request rather than a "network interface is up" signal:
/// a phone can be on Wi-Fi with no internet, which is common in rural areas.
class ConnectivityProbe {
  ConnectivityProbe._();

  static Future<bool> isOnline() async {
    // Primary: Google's generate_204 endpoint — tiny and fast.
    try {
      final r = await http
          .head(Uri.parse('https://clients3.google.com/generate_204'))
          .timeout(const Duration(seconds: 10));
      return r.statusCode == 204 || r.statusCode == 200;
    } catch (_) {
      // Fallback: can Firestore's servers be reached at all?
      try {
        await FirebaseFirestore.instance
            .collection('_ping')
            .doc('ping')
            .get(const GetOptions(source: Source.server))
            .timeout(const Duration(seconds: 10));
        return true;
      } on FirebaseException catch (_) {
        // The server answered (e.g. permission-denied), so it is reachable.
        return true;
      } catch (_) {
        return false;
      }
    }
  }
}
