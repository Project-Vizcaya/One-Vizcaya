import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/utils/color_utils.dart';
import '../../core/utils/toast_utils.dart';
import '../../data/services/sos_service.dart';
import '../../domain/models/sos_alert.dart';

/// Admin live-emergencies list. Streams open SOS beacons in the admin's scope
/// and lets them navigate to the caller and mark dispatched / resolved.
class SosAlertsScreen extends StatelessWidget {
  final Stream<List<SosAlert>> stream;
  final Color headerColor;
  const SosAlertsScreen({
    super.key,
    required this.stream,
    required this.headerColor,
  });

  Future<void> _launch(Uri uri, String failMsg) async {
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        ToastUtils.showError(failMsg);
      }
    } catch (_) {
      ToastUtils.showError(failMsg);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: headerColor,
        foregroundColor: ColorUtils.readableTextOn(headerColor),
        title: const Text('Live Emergencies'),
      ),
      body: StreamBuilder<List<SosAlert>>(
        stream: stream,
        builder: (context, snap) {
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Could not load emergencies.\n${snap.error}',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
              ),
            );
          }
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          // Genuine emergencies first; flagged (possible-abuse) alerts sink to
          // the bottom but are NEVER hidden — an operator still verifies them.
          final alerts = [...snap.data!]
            ..sort((a, b) {
              if (a.flagged != b.flagged) return a.flagged ? 1 : -1;
              return 0;
            });
          if (alerts.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.check_circle_outline,
                      size: 56, color: Colors.green.shade300),
                  const SizedBox(height: 12),
                  const Text('No active emergencies',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('New SOS alerts appear here instantly.',
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 32),
            itemCount: alerts.length,
            itemBuilder: (context, i) => _SosCard(
              alert: alerts[i],
              onNavigate: () {
                final url = alerts[i].mapsUrl;
                if (url != null) {
                  _launch(Uri.parse(url), 'Could not open the map.');
                } else {
                  ToastUtils.showError('No location on this alert yet.');
                }
              },
              onCall: () {
                final phone = alerts[i].phone;
                if (phone.isEmpty) {
                  ToastUtils.showError('No phone number on this alert.');
                  return;
                }
                _launch(Uri(scheme: 'tel', path: phone),
                    'Could not open the dialer.');
              },
              onVerify: () => sosService.verify(alerts[i].id),
              onDispatch: () => sosService.dispatch(alerts[i].id),
              onResolve: (disposition) =>
                  sosService.resolveWith(alerts[i].id, disposition),
            ),
          );
        },
      ),
    );
  }
}

class _SosCard extends StatelessWidget {
  final SosAlert alert;
  final VoidCallback onNavigate;
  final VoidCallback onCall;
  final VoidCallback onVerify;
  final VoidCallback onDispatch;
  final void Function(String disposition) onResolve;
  const _SosCard({
    required this.alert,
    required this.onNavigate,
    required this.onCall,
    required this.onVerify,
    required this.onDispatch,
    required this.onResolve,
  });

  @override
  Widget build(BuildContext context) {
    final dispatched = alert.status == SosStatus.dispatched;
    final accent = alert.flagged
        ? Colors.blueGrey
        : dispatched
            ? Colors.orange.shade800
            : const Color(0xFFC62828);
    final hasFix = alert.lat != null && alert.lng != null;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: accent.withValues(alpha: 0.4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: accent,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    dispatched ? 'DISPATCHED' : 'ACTIVE SOS',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5),
                  ),
                ),
                const SizedBox(width: 6),
                if (alert.verified)
                  const Icon(Icons.verified, size: 16, color: Colors.green)
                else
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade100,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('UNVERIFIED',
                        style: TextStyle(
                            color: Colors.amber.shade900,
                            fontSize: 12,
                            fontWeight: FontWeight.bold)),
                  ),
                const Spacer(),
                if (alert.updatedAt != null)
                  Text(
                    'updated ${TimeOfDay.fromDateTime(alert.updatedAt!.toLocal()).format(context)}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                  ),
              ],
            ),
            if (alert.flagged) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blueGrey.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.flag_outlined,
                        size: 14, color: Colors.blueGrey.shade700),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Flagged: ${alert.flagReason ?? 'possible misuse'} — verify before dispatch.',
                        style: TextStyle(
                            fontSize: 12, color: Colors.blueGrey.shade700),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 8),
            Text(alert.name,
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 2),
            Text(
              [
                if (alert.barangay != null && alert.barangay!.isNotEmpty)
                  'Brgy. ${alert.barangay}',
                if (alert.municipality.isNotEmpty) alert.municipality,
              ].join(', '),
              style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
            ),
            const SizedBox(height: 6),
            if (hasFix)
              Text(
                '${alert.lat!.toStringAsFixed(6)}, ${alert.lng!.toStringAsFixed(6)}'
                '${alert.accuracy != null ? '  ·  ±${alert.accuracy!.round()} m' : ''}',
                style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade800,
                    fontFeatures: const []),
              )
            else
              Text('Waiting for a location fix…',
                  style: TextStyle(
                      fontSize: 12,
                      fontStyle: FontStyle.italic,
                      color: Colors.grey.shade500)),
            if (alert.note != null && alert.note!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text('“${alert.note}”',
                  style: TextStyle(
                      fontSize: 12,
                      fontStyle: FontStyle.italic,
                      color: Colors.grey.shade700)),
            ],
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                FilledButton.icon(
                  onPressed: onNavigate,
                  style: FilledButton.styleFrom(
                      backgroundColor: accent,
                      padding: const EdgeInsets.symmetric(horizontal: 14)),
                  icon: const Icon(Icons.navigation, size: 16),
                  label: const Text('Navigate'),
                ),
                OutlinedButton.icon(
                  onPressed: onCall,
                  icon: const Icon(Icons.call, size: 16),
                  label: const Text('Call'),
                ),
                if (!alert.verified)
                  OutlinedButton.icon(
                    onPressed: onVerify,
                    style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.green.shade800),
                    icon: const Icon(Icons.verified_outlined, size: 16),
                    label: const Text('Verify (called)'),
                  ),
                if (!dispatched)
                  OutlinedButton.icon(
                    onPressed: onDispatch,
                    icon: const Icon(Icons.local_shipping_outlined, size: 16),
                    label: const Text('Dispatch'),
                  ),
                PopupMenuButton<String>(
                  onSelected: onResolve,
                  itemBuilder: (context) => const [
                    PopupMenuItem(
                        value: 'resolved', child: Text('✓ Resolved (real)')),
                    PopupMenuItem(
                        value: 'false_alarm', child: Text('False alarm')),
                    PopupMenuItem(
                        value: 'abuse', child: Text('⚠ Mark as abuse')),
                  ],
                  child: OutlinedButton.icon(
                    onPressed: null,
                    style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.green.shade700,
                        disabledForegroundColor: Colors.green.shade700),
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Close ▾'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
