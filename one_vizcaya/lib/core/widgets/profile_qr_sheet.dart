import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../utils/toast_utils.dart';
import '../../presentation/state/municipality_state.dart';

class ProfileQrSheet extends StatelessWidget {
  const ProfileQrSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useSafeArea: true,
      builder: (_) => const ProfileQrSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final municipality = oneVizcayaState.selectedMunicipality.value;
    final uid = user?.uid ?? 'unknown';
    final phone = user?.phoneNumber ?? 'Unknown';

    // Partially mask phone: show first 2 chars + XXXXX + last 4 digits
    String maskedPhone = phone;
    if (phone.length >= 7) {
      maskedPhone = '${phone.substring(0, 2)}XXXXX${phone.substring(phone.length - 4)}';
    }

    final qrData = jsonEncode({
      'type': 'onevizcaya_citizen',
      'uid': uid,
      'phone': phone,
      'municipality': municipality,
      'version': '1',
    });

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(
        24,
        12,
        24,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      // ── Wrap in SingleChildScrollView so buttons are always reachable ──
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Drag handle ──
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),

            // ── Title ──
            Text(
              'Citizen Digital ID',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: lguColor,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Scan to verify citizen identity',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
            ),
            const SizedBox(height: 20),

            // ── QR Code ──
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: lguColor.withValues(alpha: 0.3),
                  width: 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: lguColor.withValues(alpha: 0.1),
                    blurRadius: 20,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: QrImageView(
                data: qrData,
                version: QrVersions.auto,
                size: 180, // ← Slightly smaller to fit better
                eyeStyle: QrEyeStyle(
                  eyeShape: QrEyeShape.square,
                  color: lguColor,
                ),
                dataModuleStyle: QrDataModuleStyle(
                  dataModuleShape: QrDataModuleShape.square,
                  color: const Color(0xFF1A1A2E),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // ── Citizen Info ──
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: lguColor.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: [
                  _InfoRow(
                    label: 'Municipality',
                    value: municipality,
                    icon: Icons.location_on,
                    color: lguColor,
                  ),
                  const SizedBox(height: 6),
                  _InfoRow(
                    label: 'Phone',
                    value: maskedPhone,
                    icon: Icons.phone,
                    color: lguColor,
                  ),
                  const SizedBox(height: 6),
                  _InfoRow(
                    label: 'Citizen ID',
                    value: uid.length > 8 ? uid.substring(0, 8) : uid,
                    icon: Icons.badge,
                    color: lguColor,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // ── Buttons ──
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: uid));
                      ToastUtils.showSuccess('Citizen ID copied to clipboard');
                    },
                    icon: const Icon(Icons.copy, size: 16),
                    label: const Text('Copy ID'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: lguColor,
                      side: BorderSide(color: lguColor),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Done'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: lguColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            // ── Security note ──
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.lock_outline, size: 12, color: Colors.grey.shade400),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    'Issued by $municipality LGU · One Vizcaya v1',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                    textAlign: TextAlign.center,
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

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _InfoRow({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF333333),
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
