import 'package:shared_preferences/shared_preferences.dart';

class SmsCooldownManager {
  static const _key = 'last_sms_sent';
  static const _cooldownSeconds = 60;

  static Future<int> secondsRemaining() async {
    final prefs = await SharedPreferences.getInstance();
    // Store as String to avoid 32-bit int overflow on Android (overflows in 2038)
    final lastSentStr = prefs.getString(_key);
    if (lastSentStr == null) return 0;
    final lastSent = int.tryParse(lastSentStr);
    if (lastSent == null) return 0;
    final elapsed = DateTime.now().millisecondsSinceEpoch - lastSent;
    // Guard against negative elapsed (clock rollback / NTP correction)
    if (elapsed < 0) return 0;
    final remaining = _cooldownSeconds - (elapsed / 1000).floor();
    return remaining > 0 ? remaining : 0;
  }

  static Future<void> recordSmsSent() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, DateTime.now().millisecondsSinceEpoch.toString());
  }

  static Future<bool> canSend() async => (await secondsRemaining()) == 0;
}
