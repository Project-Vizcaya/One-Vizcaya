import 'dart:async';
import 'package:flutter/material.dart';
import '../utils/sms_cooldown_manager.dart';

class SmsCooldownButton extends StatefulWidget {
  final VoidCallback onSend;
  const SmsCooldownButton({super.key, required this.onSend});

  @override
  State<SmsCooldownButton> createState() => _SmsCooldownButtonState();
}

class _SmsCooldownButtonState extends State<SmsCooldownButton> {
  int _secondsLeft = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _checkCooldown();
  }

  Future<void> _checkCooldown() async {
    final remaining = await SmsCooldownManager.secondsRemaining();
    if (!mounted) return;
    if (remaining > 0) _startCountdown(remaining);
  }

  void _startCountdown(int seconds) {
    setState(() => _secondsLeft = seconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsLeft <= 1) {
        t.cancel();
        setState(() => _secondsLeft = 0);
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  Future<void> _handleSend() async {
    if (!await SmsCooldownManager.canSend()) return;
    await SmsCooldownManager.recordSmsSent();
    widget.onSend();
    _startCountdown(60);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ready = _secondsLeft == 0;
    return ElevatedButton.icon(
      onPressed: ready ? _handleSend : null,
      icon: const Icon(Icons.sms),
      label: Text(ready ? 'Send OTP' : 'Resend in ${_secondsLeft}s'),
    );
  }
}
