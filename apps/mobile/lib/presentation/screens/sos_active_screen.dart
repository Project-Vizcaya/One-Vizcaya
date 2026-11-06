import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_constants.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/utils/toast_utils.dart';
import '../../data/services/sos_service.dart';
import '../../domain/models/sos_alert.dart';

/// Shown while a citizen's SOS is active — reassures them their live location is
/// being shared, lets them call the hotline, and lets them stand the alert down.
class SosActiveScreen extends StatelessWidget {
  final String alertId;
  const SosActiveScreen({super.key, required this.alertId});

  Future<void> _call() async {
    final uri = Uri(scheme: 'tel', path: AppConstants.pdrrmoHotline);
    try {
      if (!await launchUrl(uri)) {
        ToastUtils.showError('Could not open the dialer. Call ${AppConstants.pdrrmoHotline}.');
      }
    } catch (_) {
      ToastUtils.showError('Call ${AppConstants.pdrrmoHotline} for emergencies.');
    }
  }

  Future<void> _standDown(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('End emergency?'),
        content: const Text(
            'This stops sharing your live location with responders. Only do this '
            'if you are safe or it was a false alarm.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Keep active')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text("I'm safe now"),
          ),
        ],
      ),
    );
    if (ok == true) {
      await sosService.cancelActive();
      if (context.mounted) Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, // don't let a back-swipe silently abandon the beacon
      child: Scaffold(
        backgroundColor: const Color(0xFFB71C1C),
        body: SafeArea(
          child: StreamBuilder<SosAlert>(
            stream: sosService.watch(alertId),
            builder: (context, snap) {
              final alert = snap.data;
              final dispatched = alert?.status == SosStatus.dispatched;
              final hasFix = alert?.lat != null && alert?.lng != null;
              // Scrolls only when the content cannot fit (small phone, large
              // text), so the Call button can never be pushed off-screen;
              // otherwise the Spacer still pins the buttons to the bottom.
              return LayoutBuilder(builder: (context, viewport) =>
                  SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: viewport.maxHeight),
                  child: IntrinsicHeight(
                    child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 12),
                    const Icon(Icons.sos_rounded, color: Colors.white, size: 64),
                    const SizedBox(height: 12),
                    Text(
                      dispatched ? 'Help is on the way' : 'Emergency active',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    // Announced when it changes, so a screen-reader user hears
                    // that their location has started being shared.
                    Semantics(
                      liveRegion: true,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // A spinner only while it is actually still working.
                          // (It previously spun forever — `value: hasFix ? null
                          // : null` — telling a frightened person it was still
                          // loading after the location was already shared.)
                          hasFix
                              ? const Icon(Icons.share_location_rounded,
                                  color: Colors.white, size: 18)
                              : const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor:
                                        AlwaysStoppedAnimation(Colors.white),
                                  ),
                                ),
                          const SizedBox(width: 10),
                          Flexible(
                            child: Text(
                              hasFix
                                  ? 'Your live location is being shared with responders'
                                  : 'Getting your location…',
                              // Full white: white70 on this red was ~4:1, below
                              // 4.5:1 for the most important line on screen.
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (hasFix)
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Location shared',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13)),
                            const SizedBox(height: 4),
                            Text(
                              '${alert!.lat!.toStringAsFixed(6)}, ${alert.lng!.toStringAsFixed(6)}'
                              '${alert.accuracy != null ? '  ·  ±${alert.accuracy!.round()} m' : ''}',
                              style: const TextStyle(
                                  color: Colors.white70, fontSize: 12),
                            ),
                            if (alert.barangay != null &&
                                alert.barangay!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                  'Brgy. ${alert.barangay}, ${alert.municipality}',
                                  style: const TextStyle(
                                      color: Colors.white70, fontSize: 12),
                                ),
                              ),
                          ],
                        ),
                      ),
                    const Spacer(),
                    // PDRRMO §7: the beacon complements, not replaces, a call.
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.info_outline_rounded,
                              color: Colors.white, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              AppStrings.get('sosNotACall'),
                              style: const TextStyle(
                                  color: Colors.white, fontSize: 13, height: 1.35),
                            ),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton.icon(
                      onPressed: _call,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFFB71C1C),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        textStyle: const TextStyle(
                            fontSize: 17, fontWeight: FontWeight.bold),
                      ),
                      icon: const Icon(Icons.call),
                      label: Text('Call ${AppConstants.pdrrmoHotlineLabel}'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: () => _standDown(context),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        // White edge: white54 was ~2.5:1 on red, under the
                        // 3:1 needed for a control's boundary to be seen.
                        side: const BorderSide(color: Colors.white, width: 1.5),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text("I'm safe now — end emergency"),
                    ),
                  ],
                ),
                    ),
                  ),
                ),
              ));
            },
          ),
        ),
      ),
    );
  }
}
