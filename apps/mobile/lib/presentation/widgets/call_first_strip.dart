import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_constants.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/utils/toast_utils.dart';
import '../../data/services/sos_service.dart';
import '../screens/sos_active_screen.dart';

/// One-tap Emergency SOS: confirms, shares the user's live location with
/// responders, then opens the active-emergency screen to place the call.
/// Used by the home screen and by [CallFirstStrip].
Future<void> startSosFlow(BuildContext context) async {
  final confirm = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Row(children: [
        Icon(Icons.sos_rounded, color: Color(0xFFC62828)),
        SizedBox(width: 8),
        Text('Send Emergency SOS?'),
      ]),
      content: const Text(
          'This shares your LIVE location with emergency responders so they can '
          'reach you fast, and lets you call the hotline. Use only for real '
          'emergencies.'),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel')),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFC62828)),
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Send SOS'),
        ),
      ],
    ),
  );
  if (confirm != true) return;
  ToastUtils.showInfo('Sending your location to responders…');
  final id = await sosService.startEmergency();
  if (!context.mounted) return;
  if (id == null) {
    ToastUtils.showError('Please sign in to send an SOS.');
    return;
  }
  Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => SosActiveScreen(alertId: id)),
  );
}

/// "Emergency? Call first." at the top of Report a Problem (PDRRMO, Nov 2026:
/// call first, post later). Calling comes before the form; SOS stays one tap
/// away for when the caller also needs to share their location.
class CallFirstStrip extends StatelessWidget {
  const CallFirstStrip({super.key});

  static const _red = Color(0xFFC62828);

  Future<void> _call(String number) async {
    try {
      if (!await launchUrl(Uri(scheme: 'tel', path: number))) {
        ToastUtils.showError('Could not open the dialer. Dial $number.');
      }
    } catch (_) {
      ToastUtils.showError('Could not open the dialer. Dial $number.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    // Red means danger and is used for nothing else in the app.
    final red = dark ? const Color(0xFFEF5350) : _red;
    // Keep the app's typeface: extend the theme's button text, don't replace it.
    final label = Theme.of(context).textTheme.labelLarge ?? const TextStyle();
    final outlined = OutlinedButton.styleFrom(
      foregroundColor: red,
      side: BorderSide(color: red, width: 1.5),
      minimumSize: const Size.fromHeight(52),
      textStyle: label.copyWith(fontSize: 15, fontWeight: FontWeight.w700),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    );
    return Semantics(
      container: true,
      label: AppStrings.get('callFirstTitle'),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: red.withValues(alpha: dark ? 0.12 : 0.06),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: red.withValues(alpha: 0.45)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              Icon(Icons.phone_in_talk_rounded, color: red, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  AppStrings.get('callFirstTitle'),
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: red),
                ),
              ),
            ]),
            const SizedBox(height: 4),
            Text(AppStrings.get('callFirstBody'), style: const TextStyle(fontSize: 14, height: 1.4)),
            const SizedBox(height: 12),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: _red,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(56),
                textStyle: label.copyWith(fontSize: 16, fontWeight: FontWeight.w800),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => _call(AppConstants.pdrrmoHotline),
              icon: const Icon(Icons.call_rounded),
              label: Text(AppStrings.get('callPdrrmo')),
            ),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: outlined,
                  onPressed: () => _call('911'),
                  icon: const Icon(Icons.call_rounded, size: 20),
                  label: Text(AppStrings.get('call911')),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: outlined,
                  onPressed: () => startSosFlow(context),
                  icon: const Icon(Icons.emergency_share_rounded, size: 20),
                  label: const Text('SOS'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
