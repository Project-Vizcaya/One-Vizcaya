import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/toast_utils.dart';
import '../state/municipality_state.dart';

/// Certified-resident path (Option 3): a citizen who could not be auto-verified
/// by GPS (e.g. they registered from outside the province) submits a residency
/// proof — a Barangay Certificate of Residency or a government ID showing a
/// Nueva Vizcaya address — for their Barangay/Municipal admin to certify.
class ResidencyVerificationScreen extends StatefulWidget {
  const ResidencyVerificationScreen({super.key});

  @override
  State<ResidencyVerificationScreen> createState() =>
      _ResidencyVerificationScreenState();
}

class _ResidencyVerificationScreenState
    extends State<ResidencyVerificationScreen> {
  String? _barangay;
  String _docType = 'Barangay Certificate of Residency';
  File? _proof;
  bool _submitting = true; // start true while loading current status
  String? _status; // residencyStatus
  String? _requestStatus; // latest request: pending/approved/rejected
  String _municipality = '';
  String _name = '';
  String _phone = '';

  static const _docTypes = [
    'Barangay Certificate of Residency',
    'Government ID with Nueva Vizcaya address',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) {
      if (mounted) setState(() => _submitting = false);
      return;
    }
    final db = FirebaseFirestore.instance;
    final profile = await db.collection('users').doc(uid).get();
    final reqs = await db
        .collection('verificationRequests')
        .where('uid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .limit(1)
        .get();
    if (!mounted) return;
    setState(() {
      _municipality = (profile.data()?['municipality'] as String?) ?? '';
      _name = (profile.data()?['name'] as String?) ?? '';
      _phone = (profile.data()?['phoneNumber'] as String?) ?? '';
      _status = (profile.data()?['residencyStatus'] as String?) ?? 'unverified';
      _requestStatus =
          reqs.docs.isNotEmpty ? reqs.docs.first.data()['status'] as String? : null;
      _submitting = false;
    });
  }

  Future<void> _pickProof() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
        source: ImageSource.gallery, imageQuality: 85);
    if (picked != null && mounted) {
      setState(() => _proof = File(picked.path));
    }
  }

  Future<String?> _uploadProof(File file, String uid) async {
    try {
      final Uint8List? compressed = await FlutterImageCompress.compressWithFile(
        file.absolute.path,
        minWidth: 1280,
        minHeight: 1280,
        quality: 80,
        format: CompressFormat.jpeg,
        keepExif: false,
      );
      if (compressed == null) return null;
      final ref = FirebaseStorage.instance.ref().child('residency_proofs').child(
          '${uid}_${DateTime.now().millisecondsSinceEpoch}.jpg');
      await ref.putData(compressed, SettableMetadata(contentType: 'image/jpeg'));
      return await ref.getDownloadURL();
    } catch (_) {
      return null;
    }
  }

  Future<void> _submit() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    if (_barangay == null) {
      ToastUtils.showError('Please select your barangay.');
      return;
    }
    if (_proof == null) {
      ToastUtils.showError('Please attach your residency proof.');
      return;
    }
    setState(() => _submitting = true);
    final url = await _uploadProof(_proof!, uid);
    if (url == null) {
      if (mounted) setState(() => _submitting = false);
      ToastUtils.showError('Could not upload your document. Please try again.');
      return;
    }
    try {
      await FirebaseFirestore.instance.collection('verificationRequests').add({
        'uid': uid,
        'name': _name,
        'phoneNumber': _phone,
        'municipality': _municipality,
        'barangay': _barangay,
        'docType': _docType,
        'docUrl': url,
        'status': 'pending',
        'createdAt': FieldValue.serverTimestamp(),
      });
      if (!mounted) return;
      setState(() {
        _requestStatus = 'pending';
        _submitting = false;
      });
      ToastUtils.showSuccess(
          'Submitted. Your Barangay/Municipal LGU will review it.');
    } catch (e) {
      if (mounted) setState(() => _submitting = false);
      ToastUtils.showError('Failed to submit: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final barangays =
        AppConstants.municipalityBarangays[_municipality] ?? const [];
    final certified = _status == 'certified';

    return Scaffold(
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: Colors.white,
        title: const Text('Verify Residency'),
      ),
      body: _submitting && _status == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: EdgeInsets.fromLTRB(
                  16, 16, 16, MediaQuery.of(context).padding.bottom + 32),
              children: [
                _StatusBanner(
                    status: _status ?? 'unverified',
                    requestStatus: _requestStatus,
                    color: lguColor),
                if (!certified) ...[
                  const SizedBox(height: 20),
                  const Text(
                    'Certify that you are a resident of Nueva Vizcaya so you can '
                    'use One Vizcaya from anywhere — even when you are outside the '
                    'province. Your Barangay (or Municipal) LGU reviews and '
                    'approves your request.',
                    style: TextStyle(fontSize: 13, height: 1.5),
                  ),
                  const SizedBox(height: 20),
                  Text('Municipality',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade600)),
                  const SizedBox(height: 4),
                  Text(_municipality.isEmpty ? '—' : _municipality,
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: _barangay,
                    decoration: InputDecoration(
                      labelText: 'Your Barangay',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    items: barangays
                        .map((b) =>
                            DropdownMenuItem(value: b, child: Text(b)))
                        .toList(),
                    onChanged: (v) => setState(() => _barangay = v),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: _docType,
                    decoration: InputDecoration(
                      labelText: 'Proof of residency',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    items: _docTypes
                        .map((t) =>
                            DropdownMenuItem(value: t, child: Text(t)))
                        .toList(),
                    onChanged: (v) =>
                        setState(() => _docType = v ?? _docType),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: _submitting ? null : _pickProof,
                    icon: Icon(_proof == null
                        ? Icons.upload_file_outlined
                        : Icons.check_circle),
                    label: Text(_proof == null
                        ? 'Attach document photo'
                        : 'Document attached ✓'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor:
                          _proof == null ? lguColor : Colors.green,
                      side: BorderSide(
                          color: _proof == null ? lguColor : Colors.green),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                  if (_proof != null) ...[
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(_proof!,
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover),
                    ),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed:
                          (_submitting || _requestStatus == 'pending')
                              ? null
                              : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: lguColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(_submitting
                          ? 'Submitting…'
                          : _requestStatus == 'pending'
                              ? 'Awaiting review…'
                              : 'Submit for certification'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Your document is shared only with authorised LGU staff for '
                    'verification, in line with RA 10173.',
                    style: TextStyle(
                        fontSize: 11, color: Colors.grey.shade500),
                  ),
                ],
              ],
            ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  final String status;
  final String? requestStatus;
  final Color color;
  const _StatusBanner(
      {required this.status, required this.requestStatus, required this.color});

  @override
  Widget build(BuildContext context) {
    late final IconData icon;
    late final Color c;
    late final String title;
    late final String sub;
    if (status == 'certified') {
      icon = Icons.verified;
      c = Colors.green.shade700;
      title = 'Certified Resident';
      sub = 'Your residency is verified. You can use One Vizcaya from anywhere.';
    } else if (status == 'gps_verified') {
      icon = Icons.gps_fixed;
      c = color;
      title = 'Location-verified';
      sub =
          'You were verified by GPS inside Nueva Vizcaya. Submit a document below to become a Certified Resident (works from anywhere).';
    } else if (requestStatus == 'pending') {
      icon = Icons.hourglass_top;
      c = Colors.orange.shade800;
      title = 'Under review';
      sub = 'Your Barangay/Municipal LGU is reviewing your request.';
    } else if (requestStatus == 'rejected') {
      icon = Icons.cancel_outlined;
      c = Colors.red.shade700;
      title = 'Not approved';
      sub = 'Your previous request was not approved. You may submit again.';
    } else {
      icon = Icons.info_outline;
      c = Colors.grey.shade700;
      title = 'Not yet verified';
      sub = 'Verify your Nueva Vizcaya residency to submit reports.';
    }
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: c),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        fontWeight: FontWeight.bold, color: c, fontSize: 14)),
                const SizedBox(height: 4),
                Text(sub,
                    style: const TextStyle(fontSize: 12.5, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
