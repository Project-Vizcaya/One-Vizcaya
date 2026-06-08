import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/toast_utils.dart';
import '../state/municipality_state.dart';

/// In-app Data Subject Request portal (RA 10173).
///
/// Lets a citizen formally exercise their rights — access, correction, erasure,
/// objection, portability, or complaint — without leaving the app. Each request
/// is logged to `users/{uid}/dataRequests` for the LGU Data Protection Officer
/// to act on, and the DPO + NPC contacts are surfaced directly.
class DataRequestScreen extends StatefulWidget {
  const DataRequestScreen({super.key});

  @override
  State<DataRequestScreen> createState() => _DataRequestScreenState();
}

class _DataRequestScreenState extends State<DataRequestScreen> {
  // Stable keys are stored in Firestore; labels are localised for display.
  static const List<String> _typeKeys = [
    'reqAccess',
    'reqCorrection',
    'reqErasure',
    'reqObject',
    'reqPortability',
    'reqComplaint',
  ];

  String _selectedType = _typeKeys.first;
  final TextEditingController _detailsController = TextEditingController();
  bool _submitting = false;

  Color get _lguColor => oneVizcayaState.activeTheme['appBarColor'] as Color;

  @override
  void dispose() {
    _detailsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ToastUtils.showError(AppStrings.get('dataRequestSignInRequired'));
      return;
    }
    if (_submitting) return;
    setState(() => _submitting = true);

    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('dataRequests')
          .add({
        'type': _selectedType,
        'typeLabel': AppStrings.get(_selectedType),
        'details': _detailsController.text.trim(),
        'status': 'pending',
        'userId': user.uid,
        'userPhone': user.phoneNumber,
        'userEmail': user.email,
        'requestedAt': FieldValue.serverTimestamp(),
        'law': 'RA 10173',
      });
      if (!mounted) return;
      _detailsController.clear();
      ToastUtils.showSuccess(AppStrings.get('dataRequestSent'));
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) ToastUtils.showError(AppStrings.get('dataRequestFailed'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      ToastUtils.showError('Could not open $url');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: _lguColor,
        foregroundColor: Colors.white,
        title: Text(AppStrings.get('dataRequestTitle'),
            style: const TextStyle(fontWeight: FontWeight.w600)),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _lguColor.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.gavel_outlined, color: _lguColor, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(AppStrings.get('dataRequestIntro'),
                      style: const TextStyle(fontSize: 13, height: 1.4)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(AppStrings.get('dataRequestType'),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 8),
          ..._typeKeys.map((key) => RadioListTile<String>(
                value: key,
                groupValue: _selectedType,
                activeColor: _lguColor,
                contentPadding: EdgeInsets.zero,
                title: Text(AppStrings.get(key)),
                onChanged: (v) => setState(() => _selectedType = v!),
              )),
          const SizedBox(height: 12),
          Text(AppStrings.get('dataRequestDetails'),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 8),
          TextField(
            controller: _detailsController,
            maxLines: 4,
            maxLength: 1000,
            decoration: InputDecoration(
              hintText: AppStrings.get('dataRequestDetailsHint'),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: _lguColor, width: 2),
              ),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _submitting ? null : _submit,
              icon: _submitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.send_outlined),
              label: Text(_submitting
                  ? AppStrings.get('dataRequestSubmitting')
                  : AppStrings.get('dataRequestSubmit')),
              style: ElevatedButton.styleFrom(
                backgroundColor: _lguColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          const SizedBox(height: 28),
          Text(AppStrings.get('contactsHeader'),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 10),
          _contactCard(
            icon: Icons.account_balance_outlined,
            title: AppStrings.get('dpoTitle'),
            lines: [
              AppConstants.dpoOffice,
              AppConstants.dpoAddress,
              AppConstants.dpoEmail,
            ],
            onTap: () => _launch('mailto:${AppConstants.dpoEmail}'),
          ),
          _contactCard(
            icon: Icons.policy_outlined,
            title: AppStrings.get('npcTitle'),
            lines: [
              AppConstants.npcAddress,
              AppConstants.npcWebsite,
              AppConstants.npcHotline,
            ],
            onTap: () => _launch(AppConstants.npcWebsite),
          ),
        ],
      ),
    );
  }

  Widget _contactCard({
    required IconData icon,
    required String title,
    required List<String> lines,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Icon(icon, color: _lguColor),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(lines.join('\n'),
            style: const TextStyle(fontSize: 12, height: 1.4)),
        isThreeLine: lines.length > 2,
        trailing: const Icon(Icons.open_in_new, size: 18),
      ),
    );
  }
}
