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
    final ok = await launchUrl(Uri(scheme: 'tel', path: number));
    if (!ok) ToastUtils.showError('Could not start the call. Dial $number.');
  }

  @override
  Widget build(BuildContext context) {
    final onRed = Colors.white;
    return Semantics(
      container: true,
      label: AppStrings.get('callFirstTitle'),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        decoration: BoxDecoration(
          color: _red.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _red.withValues(alpha: 0.5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              const Icon(Icons.phone_in_talk, color: _red),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  AppStrings.get('callFirstTitle'),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: _red),
                ),
              ),
            ]),
            const SizedBox(height: 4),
            Text(AppStrings.get('callFirstBody'), style: const TextStyle(fontSize: 13.5, height: 1.35)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: _red, foregroundColor: onRed,
                      minimumSize: const Size(0, 48)),
                  onPressed: () => _call(AppConstants.pdrrmoHotline),
                  icon: const Icon(Icons.call),
                  label: Text(AppStrings.get('callPdrrmo')),
                ),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(foregroundColor: _red, side: const BorderSide(color: _red),
                      minimumSize: const Size(0, 48)),
                  onPressed: () => _call('911'),
                  icon: const Icon(Icons.call),
                  label: Text(AppStrings.get('call911')),
                ),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(foregroundColor: _red, side: const BorderSide(color: _red),
                      minimumSize: const Size(0, 48)),
                  onPressed: () => startSosFlow(context),
                  icon: const Icon(Icons.sos_rounded),
                  label: const Text('SOS'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
