import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Reports waiting to be submitted (no connection, or a failed online submit).
///
/// Each item carries:
///  - `queueId`  — identifies the queue entry, so items are removed ONE AT A
///    TIME as each is delivered. (Previously the whole queue was cleared only
///    after every item succeeded, so a mid-loop failure re-submitted the
///    earlier items on the next launch.)
///  - `reportId` — the Firestore document id, chosen BEFORE the first attempt.
///    Every attempt (and Firestore's own offline sync) writes that same
///    document, so a report can never be created twice.
///  - `reportedAt` — when the citizen actually filed it, preserved on delivery.
///  - `attempts`   — failed non-network attempts, so a permanently rejected
///    report stops retrying instead of looping forever.
///
/// Keys `category` and `description` are read by the home screen's queue
/// sheet and are kept as-is.
class OfflineQueueService {
  static const String _queueKey = 'offline_report_queue';

  /// Live queue length, for the home banner.
  static final ValueNotifier<int> count = ValueNotifier<int>(0);

  /// Non-network failures after which an item is kept but no longer retried.
  static const int maxAttempts = 5;

  static String newId() {
    final r = Random.secure();
    return '${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}'
        '${List.generate(8, (_) => r.nextInt(36).toRadixString(36)).join()}';
  }

  Future<void> enqueue(Map<String, dynamic> item) async {
    final list = await getQueue();
    item['queueId'] ??= newId();
    item['attempts'] ??= 0;
    // Same report queued twice (e.g. retry tapped) -> keep one entry.
    list.removeWhere((x) => x['reportId'] != null && x['reportId'] == item['reportId']);
    list.add(item);
    await _save(list);
  }

  /// Removes one delivered (or discarded) item.
  Future<void> remove(String queueId) async {
    final list = await getQueue();
    list.removeWhere((x) => x['queueId'] == queueId);
    await _save(list);
  }

  Future<void> recordFailedAttempt(String queueId, String error) async {
    final list = await getQueue();
    for (final x in list) {
      if (x['queueId'] == queueId) {
        x['attempts'] = ((x['attempts'] as int?) ?? 0) + 1;
        x['lastError'] = error.length > 200 ? error.substring(0, 200) : error;
      }
    }
    await _save(list);
  }

  Future<List<Map<String, dynamic>>> getQueue() async {
    final prefs = await SharedPreferences.getInstance();
    // The Android background task (background_delivery.dart) runs in another
    // isolate with its own cache; read from disk so neither overwrites the
    // other's changes with a stale copy.
    await prefs.reload();
    final list = _decodeList(prefs.getString(_queueKey));
    // Items queued by older app versions have no ids: give them stable ones
    // now so they flow through the same idempotent path.
    var migrated = false;
    for (final x in list) {
      if (x['queueId'] == null) {
        x['queueId'] = newId();
        migrated = true;
      }
      if (x['reportId'] == null) {
        x['reportId'] = newId();
        migrated = true;
      }
    }
    if (migrated) await _save(list);
    count.value = list.length;
    return list;
  }

  Future<void> clearQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_queueKey);
    count.value = 0;
  }

  Future<void> _save(List<Map<String, dynamic>> list) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_queueKey, jsonEncode(list));
    count.value = list.length;
  }

  List<Map<String, dynamic>> _decodeList(String? raw) {
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      // whereType performs a safe cast, skipping any malformed items
      return decoded
          .whereType<Map>()
          .map((m) => Map<String, dynamic>.from(m))
          .toList();
    } catch (_) {
      return [];
    }
  }
}
