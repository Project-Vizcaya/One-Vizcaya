import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineQueueService {
  static const String _queueKey = 'offline_report_queue';

  Future<void> enqueue(Map<String, dynamic> reportData) async {
    final prefs = await SharedPreferences.getInstance();
    final current = _decodeList(prefs.getString(_queueKey));
    current.add(reportData);
    await prefs.setString(_queueKey, jsonEncode(current));
  }

  Future<Map<String, dynamic>?> dequeue() async {
    final prefs = await SharedPreferences.getInstance();
    final current = _decodeList(prefs.getString(_queueKey));
    if (current.isEmpty) return null;
    final item = current.removeAt(0);
    await prefs.setString(_queueKey, jsonEncode(current));
    return item;
  }

  Future<List<Map<String, dynamic>>> getQueue() async {
    final prefs = await SharedPreferences.getInstance();
    return _decodeList(prefs.getString(_queueKey));
  }

  Future<void> clearQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_queueKey);
  }

  List<Map<String, dynamic>> _decodeList(String? raw) {
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded.cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }
}
