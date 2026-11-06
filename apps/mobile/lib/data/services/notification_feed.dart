import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'citizen_broadcasts.dart';

/// One unified notification feed (PANaHON-style inbox) merging the sources a
/// citizen is allowed to read:
///   1. personal report updates  →  users/{uid}/notifications
///   2. LGU announcements (incl. urgent weather advisories) for their town / All
///   3. broadcast alerts addressed to them (P2) — so a missed or dismissed
///      urgent alert can be read again. Scoped by the PROFILE town, see
///      citizen_broadcasts.dart.
enum FeedType { report, announcement, broadcast }

class FeedItem {
  final String id;
  final FeedType type;
  final String title;
  final String body;
  final DateTime time;
  final String? reportId; // report notifications → deep-link to /status
  final String? status; // report status (solved/ongoing/…) for the icon
  final bool urgent; // urgent announcement (weather/disaster advisory)

  const FeedItem({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.time,
    this.reportId,
    this.status,
    this.urgent = false,
  });
}

DateTime _asDate(dynamic ts) =>
    ts is Timestamp ? ts.toDate() : DateTime.fromMillisecondsSinceEpoch(0);

/// Live merged, newest-first feed for [uid] scoped to [municipality].
Stream<List<FeedItem>> notificationFeedStream(String uid, String municipality) {
  final controller = StreamController<List<FeedItem>>.broadcast();
  List<FeedItem> personal = [];
  List<FeedItem> announcements = [];
  // Keyed by id: an alert can match both broadcast queries.
  final broadcasts = <int, Map<String, FeedItem>>{};
  StreamSubscription? s1, s2;
  final broadcastSubs = <StreamSubscription>[];
  var cancelled = false;

  void emit() {
    final merged = [
      ...personal,
      ...announcements,
      ...{for (final m in broadcasts.values) ...m}.values,
    ]..sort((a, b) => b.time.compareTo(a.time));
    if (!controller.isClosed) controller.add(merged);
  }

  s1 = FirebaseFirestore.instance
      .collection('users')
      .doc(uid)
      .collection('notifications')
      .orderBy('timestamp', descending: true)
      .limit(50)
      .snapshots()
      .listen((snap) {
    // Older app versions copied broadcasts into this collection; they now
    // come from the broadcasts themselves, so skip the copies.
    personal = snap.docs
        .where((d) => d.data()['type'] != 'broadcast')
        .map((d) {
      final m = d.data();
      return FeedItem(
        id: d.id,
        type: FeedType.report,
        title: (m['title'] as String?) ?? 'Update',
        body: (m['body'] as String?) ?? '',
        time: _asDate(m['timestamp']),
        reportId: m['reportId'] as String?,
        status: m['status'] as String?,
      );
    }).toList();
    emit();
  }, onError: (_) {});

  s2 = FirebaseFirestore.instance
      .collection('announcements')
      .orderBy('timestamp', descending: true)
      .limit(40)
      .snapshots()
      .listen((snap) {
    announcements = snap.docs
        .where((d) {
          final muni = (d.data()['municipality'] as String?) ?? '';
          return muni == municipality || muni.toLowerCase() == 'all';
        })
        .map((d) {
          final m = d.data();
          return FeedItem(
            id: d.id,
            type: FeedType.announcement,
            title: (m['title'] as String?) ?? 'Announcement',
            body: (m['body'] as String?) ?? '',
            time: _asDate(m['timestamp']),
            urgent: (m['isUrgent'] as bool?) ?? false,
          );
        })
        .toList();
    emit();
  }, onError: (_) {});

  final db = FirebaseFirestore.instance;
  profileMunicipality(db, uid).then((town) {
    if (cancelled) return;
    final queries = citizenBroadcastQueries(db, town);
    for (var i = 0; i < queries.length; i++) {
      broadcastSubs.add(queries[i].snapshots().listen((snap) {
        broadcasts[i] = {
          for (final d in snap.docs)
            d.id: FeedItem(
              id: d.id,
              type: FeedType.broadcast,
              title: (d.data()['title'] as String?) ?? 'Alert',
              body: (d.data()['body'] as String?) ?? '',
              time: _asDate(d.data()['timestamp']),
              urgent: (d.data()['urgent'] as bool?) ?? false,
            ),
        };
        emit();
      }, onError: (_) {}));
    }
  });

  controller.onCancel = () {
    cancelled = true;
    s1?.cancel();
    s2?.cancel();
    for (final s in broadcastSubs) {
      s.cancel();
    }
  };
  return controller.stream;
}

// ── Unread tracking ──────────────────────────────────────────────────────────
// "Unread" is time-based (items newer than the last time the inbox was opened),
// which unifies the two sources without per-user fan-out writes.
const String _lastSeenKey = 'notifications_last_seen_ms';

Future<DateTime> getLastSeen() async {
  final prefs = await SharedPreferences.getInstance();
  return DateTime.fromMillisecondsSinceEpoch(prefs.getInt(_lastSeenKey) ?? 0);
}

Future<void> markFeedSeen() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt(_lastSeenKey, DateTime.now().millisecondsSinceEpoch);
}
