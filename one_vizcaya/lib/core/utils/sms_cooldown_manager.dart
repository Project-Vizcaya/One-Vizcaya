import 'package:shared_preferences/shared_preferences.dart';

class SmsCooldownManager {
  static const _key = 'last_sms_sent';
  static const _cooldownSeconds = 60;

  static Future<int> secondsRemaining() async {
    final prefs = await SharedPreferences.getInstance();
    final lastSent = prefs.getInt(_key);
    if (lastSent == null) return 0;
    final elapsed = DateTime.now().millisecondsSinceEpoch - lastSent;
    final remaining = _cooldownSeconds - (elapsed / 1000).floor();
    return remaining > 0 ? remaining : 0;
  }

  static Future<void> recordSmsSent() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_key, DateTime.now().millisecondsSinceEpoch);
  }

  static Future<bool> canSend() async => (await secondsRemaining()) == 0;
}
