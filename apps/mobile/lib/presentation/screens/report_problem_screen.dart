import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:io';

import '../../core/constants/app_constants.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/utils/toast_utils.dart';
import '../../domain/enums/report_category.dart';
import '../../domain/enums/report_priority.dart';
import '../../data/services/geolocator_service.dart';
import '../../data/services/geo_stamp_service.dart';
import '../../data/services/offline_queue_service.dart';
import '../../data/services/report_submitter.dart';
import '../../core/utils/connectivity_probe.dart';
import '../state/municipality_state.dart';
import '../../core/utils/color_utils.dart';

class ReportProblemScreen extends StatefulWidget {
  const ReportProblemScreen({super.key});

  @override
  _ReportProblemScreenState createState() => _ReportProblemScreenState();
}

class _ReportProblemScreenState extends State<ReportProblemScreen> {
  // Description length policy: a citizen must write enough to be actionable
  // (min) but is kept concise so emergency reports don't create long queues
  // (soft max). Characters typed beyond the max are shown struck-through in
  // red so the reporter can trim before submitting.
  static const int _descMin = 30;
  static const int _descMax = 75;

  final _formKey = GlobalKey<FormState>();
  ReportCategory? _selectedCategory;
  ReportPriority? _selectedPriority;
  bool _categoryError = false;
  final _descriptionController =
      _LimitHighlightTextEditingController(limit: _descMax);
  final _locationController = TextEditingController();
  // Proxy reporting (P3): filing for a resident without a smartphone.
  bool _forSomeoneElse = false;
  final _proxyName = TextEditingController();
  final _proxyContact = TextEditingController();
  final _proxyRelationship = TextEditingController();
  String? _selectedBarangay;
  bool _isOffline = false;
  bool _isGettingLocation = false;
  bool _isSubmitting = false;
  Position? _currentPosition;

  final GeolocatorService _geolocatorService = GeolocatorService();
  final ImagePicker _imagePicker = ImagePicker();

  File? _selectedImage;
  // Metadata captured when photo is taken
  DateTime? _photoTimestamp;
  double? _photoLatitude;
  double? _photoLongitude;
  // 'camera' (live capture, GPS-stamped) or 'gallery' (unverified) — lets
  // admins instantly trust the evidence.
  String? _photoSource;

  // Residency gate (Option 3). Default 'grandfathered' so existing users (no
  // status field) are never blocked; only a confirmed 'unverified' status gates.
  String _residencyStatus = 'grandfathered';
  bool get _residencyBlocked => _residencyStatus == 'unverified';

  @override
  void initState() {
    super.initState();
    _loadResidency();
    // Start in offline mode when there is genuinely no connection, instead of
    // letting the reporter submit "online" into a dead network.
    ConnectivityProbe.isOnline().then((online) {
      if (mounted && !online) setState(() => _isOffline = true);
    });
  }

  Future<void> _loadResidency() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    try {
      final doc =
          await FirebaseFirestore.instance.collection('users').doc(uid).get();
      final s = doc.data()?['residencyStatus'] as String?;
      if (mounted && s != null) setState(() => _residencyStatus = s);
    } catch (_) {}
  }

  void _promptVerifyResidency() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        icon: const Icon(Icons.verified_user_outlined,
            color: Color(0xFF2E7D32), size: 40),
        title: const Text('Verify your residency first'),
        content: const Text(
            'Only verified Nueva Vizcaya residents can submit reports. Verify '
            'your residency once and you can report from anywhere.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Later')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.of(context).pushNamed('/verify-residency');
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2E7D32),
                foregroundColor: Colors.white),
            child: const Text('Verify now'),
          ),
        ],
      ),
    );
  }

  Future<void> _getLocation() async {
    setState(() => _isGettingLocation = true);
    final position = await _geolocatorService.getCurrentLocation();
    if (!mounted) return;
    if (position != null) {
      HapticFeedback.lightImpact();
      setState(() {
        _currentPosition = position;
        _isGettingLocation = false;
        _locationController.text =
            'GPS: ${position.latitude.toStringAsFixed(5)}, '
            '${position.longitude.toStringAsFixed(5)}';
      });
      ToastUtils.showSuccess('Location attached successfully');
    } else {
      setState(() => _isGettingLocation = false);
      ToastUtils.showError(
        'Could not get precise location. You can still submit the report.',
      );
    }
  }

  Future<void> _submitReport() async {
    if (_residencyBlocked) {
      _promptVerifyResidency();
      return;
    }
    if (_selectedCategory == null) {
      setState(() => _categoryError = true);
      ToastUtils.showError('Please select a problem category.');
      return;
    }
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_isSubmitting) return;

    // GPS is required for online submissions
    if (!_isOffline && _currentPosition == null) {
      ToastUtils.showError(
        'Please attach your GPS location before submitting online.',
      );
      return;
    }

    // Set submitting flag before first await to prevent double-tap race
    setState(() => _isSubmitting = true);

    final prefs = await SharedPreferences.getInstance();
    final lastSubmitTime = prefs.getInt('last_report_time') ?? 0;
    final currentTime = DateTime.now().millisecondsSinceEpoch;

    if (currentTime - lastSubmitTime < 5 * 60 * 1000) {
      if (mounted) setState(() => _isSubmitting = false);
      ToastUtils.showError(
        'Please wait 5 minutes between submitting reports to prevent spam.',
      );
      return;
    }

    _formKey.currentState?.save();

    final municipalityReportingTo = oneVizcayaState.selectedMunicipality.value;

    // Every report must be tied to the verified, signed-in user — anonymous
    // submission has been removed (government data-integrity requirement).
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      if (mounted) setState(() => _isSubmitting = false);
      ToastUtils.showError('Please sign in to submit a report.');
      return;
    }

    // One item for both paths. Its reportId is fixed BEFORE the first attempt,
    // so a retry — or Firestore's own offline sync — can never create the
    // report twice.
    final item = await _buildQueueItem(user, municipalityReportingTo);

    if (_isOffline) {
      await OfflineQueueService().enqueue(item);
      ToastUtils.showInfo(
        'Report saved. It will be sent automatically when you\'re back online.',
      );
      // In case the connection is actually back already.
      QueueFlusher.instance.flush();
      // The cooldown counts only reports actually sent or saved.
      await prefs.setInt('last_report_time', currentTime);

      // Also offer SMS as secondary option
      final reportDetails =
          'Reporting to: $municipalityReportingTo\n'
          'Category: ${_selectedCategory?.displayName}\n'
          'Location: ${_locationController.text}\n'
          'Description: ${_descriptionController.text}';
      await _sendSmsReport(municipalityReportingTo, reportDetails);
      // Opening the SMS app can background/dispose this screen during the await.
      if (!mounted) return;
      setState(() => _isSubmitting = false);
    } else {
      final filed = await _sendOnlineReport(municipalityReportingTo, item);
      if (filed) await prefs.setInt('last_report_time', currentTime);
    }
  }

  /// Builds the report as a queue item. A photo is compressed (EXIF stripped)
  /// into the app's own storage now, so a report that ends up queued keeps it.
  Future<Map<String, dynamic>> _buildQueueItem(
      User user, String municipality) async {
    final queueId = OfflineQueueService.newId();
    String? photoPath;
    if (_selectedImage != null) {
      photoPath = await ReportSubmitter.persistPhoto(_selectedImage!, queueId);
      if (photoPath == null) {
        ToastUtils.showError(
            'Photo could not be processed — submitting report without it.');
      }
    }
    return <String, dynamic>{
      'queueId': queueId,
      'reportId': ReportSubmitter.newReportId(user.uid),
      'userId': user.uid,
      'userPhone': user.phoneNumber,
      'category': _selectedCategory?.displayName ?? '',
      'description': _descriptionController.text,
      'location': _locationController.text,
      'municipality': municipality,
      'barangay': _selectedBarangay,
      'latitude': _currentPosition?.latitude,
      'longitude': _currentPosition?.longitude,
      'photoPath': photoPath,
      'photoSource': _photoSource,
      'photoLatitude': _photoLatitude,
      'photoLongitude': _photoLongitude,
      'photoTimestamp': _photoTimestamp?.toIso8601String(),
      'reportedAt': DateTime.now().toIso8601String(),
      if (_forSomeoneElse)
        'onBehalfOf': {
          'name': _proxyName.text.trim(),
          'contact': _proxyContact.text.trim(),
          'relationship': _proxyRelationship.text.trim(),
        },
    };
  }

  // Officials and CERTIFIED residents may file for someone else; the rules
  // enforce it, this only explains a refusal before the user fills it in.
  Future<void> _toggleForSomeoneElse(bool on) async {
    if (!on) {
      setState(() => _forSomeoneElse = false);
      return;
    }
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    try {
      final p = (await FirebaseFirestore.instance.collection('users').doc(uid).get()).data() ?? {};
      final role = p['role'] as String? ?? 'citizen';
      final isAdmin = role != 'citizen' && role.isNotEmpty;
      if (!isAdmin && p['residencyStatus'] != 'certified') {
        ToastUtils.showError(AppStrings.get('proxyNotAllowed'));
        return;
      }
    } catch (_) {
      // Offline: let them fill it in; the rules decide on delivery.
    }
    if (mounted) setState(() => _forSomeoneElse = true);
  }

  Widget _proxySection() {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          value: _forSomeoneElse,
          onChanged: _isSubmitting ? null : _toggleForSomeoneElse,
          title: Text(AppStrings.get('proxyToggle'),
              style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(AppStrings.get('proxyHint'),
              style: TextStyle(fontSize: 12, color: muted)),
        ),
        if (_forSomeoneElse) ...[
          TextFormField(
            controller: _proxyName,
            maxLength: 80,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(labelText: AppStrings.get('proxyName')),
            validator: (v) => _forSomeoneElse && (v ?? '').trim().length < 2
                ? AppStrings.get('proxyName')
                : null,
          ),
          TextFormField(
            controller: _proxyContact,
            maxLength: 40,
            decoration: InputDecoration(labelText: AppStrings.get('proxyContact')),
          ),
          TextFormField(
            controller: _proxyRelationship,
            maxLength: 40,
            decoration: InputDecoration(labelText: AppStrings.get('proxyRelationship')),
          ),
        ],
      ],
    );
  }

  Future<void> _sendSmsReport(String municipality, String details) async {
    final localizedHotline = AppConstants.hotlineFor(municipality);

    final String smsUri =
        'sms:$localizedHotline?body=${Uri.encodeComponent(details)}';
    try {
      if (await canLaunchUrl(Uri.parse(smsUri))) {
        await launchUrl(Uri.parse(smsUri));
      } else {
        if (!mounted) return;
        ToastUtils.showError('Could not open SMS app.');
      }
    } catch (e) {
      if (!mounted) return;
      ToastUtils.showError('Failed to open SMS app: $e');
    }
  }

  /// Returns true when the report was sent OR safely queued.
  Future<bool> _sendOnlineReport(
      String municipality, Map<String, dynamic> item) async {
    try {
      if (item['photoPath'] != null) {
        ToastUtils.showSuccess('Uploading photo evidence…');
      }
      // Same pipeline a queued report uses: photo, triage, receipt.
      final result = await ReportSubmitter.deliver(item, queued: false);

      HapticFeedback.mediumImpact();
      _clearForm();
      if (!mounted) return true;

      final priorityMsg = result == null
          ? ''
          : result.duplicateCount > 0
              ? '\n\n${result.duplicateCount} similar report(s) found in the last 48 hours. '
                  'Priority auto-escalated to ${result.priority.displayName}.'
              : '\n\nPriority level: ${result.priority.displayName}.';

      _showConfirmationDialog(
        title: 'Report Submitted',
        content:
            'Your report has been successfully routed to the $municipality '
            'municipal engineering database.$priorityMsg',
      );
      return true;
    } catch (e) {
      if (ReportSubmitter.isNetworkError(e)) {
        // Not lost: keep it and send it automatically when the connection
        // returns. The fixed reportId means that if this attempt did reach
        // the server (or syncs later on its own), nothing is duplicated.
        await OfflineQueueService().enqueue(item);
        _clearForm();
        if (!mounted) return true;
        _showConfirmationDialog(
          title: 'Saved — will send automatically',
          content:
              'The connection dropped before your report could be sent. It is '
              'saved on this phone and will be sent automatically when you are '
              'back online. In an emergency, call 911 or the PDRRMO hotline.',
        );
        return true;
      }
      if (mounted) setState(() => _isSubmitting = false);
      ToastUtils.showError(e is FirebaseException
          ? 'Submission failed: ${e.message}'
          : 'An error occurred. Please try again.');
      return false;
    }
  }

  void _clearForm() {
    _locationController.clear();
    _descriptionController.clear();
    if (!mounted) return;
    setState(() {
      _selectedCategory = null;
      _selectedPriority = null;
      _selectedBarangay = null;
      _categoryError = false;
      _currentPosition = null;
      _selectedImage = null;
      _photoTimestamp = null;
      _photoLatitude = null;
      _photoLongitude = null;
      _photoSource = null;
      _isSubmitting = false;
    });
  }

  void _showConfirmationDialog({
    required String title,
    required String content,
  }) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            child: Text(AppStrings.get('ok')),
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dynamicTheme = oneVizcayaState.activeTheme;
    // Raw accent is used for FILLED backgrounds (app bar, submit button) that
    // carry white text. For every foreground use (icons, labels, borders) we
    // use a contrast-adjusted variant so a dark municipality colour (e.g.
    // Bambang maroon, Bayombong dark green) stays legible in dark mode.
    final rawLguColor = dynamicTheme['appBarColor'] as Color;
    final primaryLguColor = ColorUtils.readableAccentOf(context, rawLguColor);
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: rawLguColor,
        foregroundColor: ColorUtils.readableTextOn(rawLguColor),
        title: Text(
          '${AppStrings.get('reportProblem')} ${AppStrings.get('prepositionTo')} $activeMunicipalityName',
        ),
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            maxWidth: AppConstants.kContentMaxWidth,
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_residencyBlocked) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.orange.shade300),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.verified_user_outlined,
                              color: Colors.orange.shade800),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Verify your Nueva Vizcaya residency to submit '
                              'reports. Tap to verify — then you can report '
                              'from anywhere.',
                              style: TextStyle(
                                  fontSize: 12.5,
                                  height: 1.4,
                                  color: Colors.orange.shade900),
                            ),
                          ),
                          TextButton(
                            onPressed: () => Navigator.of(context)
                                .pushNamed('/verify-residency'),
                            child: const Text('Verify'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  // Proxy reporting (P3)
                  _proxySection(),
                  const SizedBox(height: 8),
                  _SubmissionOptionsCard(
                    isOffline: _isOffline,
                    primaryColor: primaryLguColor,
                    onOfflineChanged: (v) => setState(() => _isOffline = v),
                  ),
                  const SizedBox(height: 24),
                  _CategoryTreeSelector(
                    primaryColor: primaryLguColor,
                    selectedPriority: _selectedPriority,
                    selectedCategory: _selectedCategory,
                    hasError: _categoryError,
                    onPrioritySelected: (p) => setState(() {
                      _selectedPriority = p;
                      _selectedCategory = null;
                      _categoryError = false;
                    }),
                    onCategorySelected: (c) => setState(() {
                      _selectedCategory = c;
                      _categoryError = false;
                    }),
                    onReset: () => setState(() {
                      _selectedPriority = null;
                      _selectedCategory = null;
                      _categoryError = false;
                    }),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _locationController,
                    decoration: InputDecoration(
                      labelText: 'Location / Landmark',
                      prefixIcon: Icon(
                        Icons.location_on,
                        color: primaryLguColor,
                        semanticLabel: 'Location',
                      ),
                      hintText:
                          'e.g., "In front of $activeMunicipalityName Municipal Hall"',
                      focusedBorder: OutlineInputBorder(
                        borderSide: BorderSide(
                          color: primaryLguColor,
                          width: 2,
                        ),
                      ),
                      labelStyle: TextStyle(color: primaryLguColor),
                    ),
                    validator: (value) => value == null || value.isEmpty
                        ? 'Please enter a location'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    icon: _isGettingLocation
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(
                            Icons.gps_fixed,
                            semanticLabel: 'Attach GPS location',
                          ),
                    label: Text(
                      _currentPosition != null
                          ? 'Location Attached ✓'
                          : AppStrings.get('attachPreciseLocation'),
                    ),
                    onPressed: _isOffline || _isGettingLocation
                        ? null
                        : _getLocation,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _currentPosition != null
                          ? Colors.green
                          : primaryLguColor,
                      side: BorderSide(
                        color: _currentPosition != null
                            ? Colors.green
                            : primaryLguColor,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _BarangayDropdown(
                    municipality: oneVizcayaState.selectedMunicipality.value,
                    selectedBarangay: _selectedBarangay,
                    primaryColor: primaryLguColor,
                    onChanged: (val) => setState(() => _selectedBarangay = val),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: InputDecoration(
                      labelText: AppStrings.get('briefDescription'),
                      prefixIcon: Icon(
                        Icons.description,
                        color: primaryLguColor,
                        semanticLabel: 'Brief description',
                      ),
                      hintText: AppStrings.get('descriptionHint'),
                      focusedBorder: OutlineInputBorder(
                        borderSide: BorderSide(
                          color: primaryLguColor,
                          width: 2,
                        ),
                      ),
                      labelStyle: TextStyle(color: primaryLguColor),
                    ),
                    maxLines: 4,
                    // No hard cap: we let the reporter type past the max so the
                    // overflow can be shown struck-through in red, then block
                    // submission in the validator.
                    buildCounter:
                        (
                          context, {
                          required currentLength,
                          required isFocused,
                          maxLength,
                        }) {
                          final tooShort = currentLength < _descMin;
                          final tooLong = currentLength > _descMax;
                          return Text(
                            tooShort
                                ? '$currentLength / $_descMin min'
                                : '$currentLength / $_descMax max',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: (tooShort || tooLong)
                                  ? FontWeight.w600
                                  : FontWeight.normal,
                              color: (tooShort || tooLong)
                                  ? Colors.red.shade400
                                  : Colors.grey.shade600,
                            ),
                          );
                        },
                    onChanged: (_) => setState(() {}),
                    validator: (value) {
                      final raw = value ?? '';
                      final trimmed = raw.trim();
                      if (trimmed.isEmpty) {
                        return 'Please enter a description';
                      }
                      // Measure in grapheme clusters to match the counter and the
                      // red strike-through highlighter (which also use .characters),
                      // so emoji/accented input can't give a contradictory result.
                      if (trimmed.characters.length < _descMin) {
                        return 'Description must be at least $_descMin characters';
                      }
                      if (raw.characters.length > _descMax) {
                        return 'Description must be $_descMax characters or fewer '
                            '(remove the text in red)';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    icon: const Icon(
                      Icons.camera_alt,
                      semanticLabel: 'Attach photo evidence',
                    ),
                    label: Text(
                      _selectedImage != null
                          ? AppStrings.get('photoAttached')
                          : AppStrings.get('attachPhoto'),
                    ),
                    onPressed: _isOffline
                        ? null
                        : () => _showImagePickerOptions(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _selectedImage != null
                          ? Colors.green
                          : primaryLguColor,
                      side: BorderSide(
                        color: _selectedImage != null
                            ? Colors.green
                            : primaryLguColor,
                      ),
                    ),
                  ),
                  if (_selectedImage != null) ...[
                    const SizedBox(height: 12),
                    Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.file(
                            _selectedImage!,
                            height: MediaQuery.of(context).size.height * 0.22,
                            width: double.infinity,
                            fit: BoxFit.cover,
                          ),
                        ),
                        Positioned(
                          top: 8,
                          right: 8,
                          child: GestureDetector(
                            onTap: () => setState(() {
                              _selectedImage = null;
                              _photoTimestamp = null;
                              _photoLatitude = null;
                              _photoLongitude = null;
                              _photoSource = null;
                            }),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: Colors.black54,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.close,
                                color: Colors.white,
                                size: 18,
                                semanticLabel: 'Remove photo',
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (_photoTimestamp != null) ...[
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.green.shade200),
                        ),
                        child: Row(
                          children: [
                            ExcludeSemantics(
                              child: Icon(
                                Icons.verified,
                                size: 14,
                                color: Colors.green.shade700,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Evidence timestamp: '
                                '${_photoTimestamp!.day}/${_photoTimestamp!.month}/${_photoTimestamp!.year} '
                                '${_photoTimestamp!.hour.toString().padLeft(2, '0')}:'
                                '${_photoTimestamp!.minute.toString().padLeft(2, '0')}'
                                '${(_photoLatitude != null && _photoLongitude != null) ? '\nGPS: ${_photoLatitude!.toStringAsFixed(5)}, ${_photoLongitude!.toStringAsFixed(5)}' : ''}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.green.shade700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitReport,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: rawLguColor,
                        foregroundColor: Colors.white,
                      ),
                      child: _isSubmitting
                          ? Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                ),
                                SizedBox(width: 12),
                                Text(AppStrings.get('submitting')),
                              ],
                            )
                          : Text(AppStrings.get('submit')),
                    ),
                  ),
                  const SizedBox(height: 48),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _locationController.dispose();
    _proxyName.dispose();
    _proxyContact.dispose();
    _proxyRelationship.dispose();
    super.dispose();
  }

  void _showImagePickerOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => Align(
        alignment: Alignment.bottomCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            maxWidth: AppConstants.kContentMaxWidth,
          ),
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            padding: EdgeInsets.fromLTRB(
              20,
              10,
              20,
              MediaQuery.of(context).padding.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Attach Photo Evidence',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  'Camera photos include a verified timestamp and GPS location.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),
                const SizedBox(height: 4),
                Text(
                  'Gallery photos do not include a timestamp or GPS.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _imagePickerOption(
                      icon: Icons.camera_alt_rounded,
                      label: AppStrings.get('photoCamera'),
                      sublabel: AppStrings.get('timestamped'),
                      onTap: () {
                        Navigator.pop(context);
                        _pickImage(ImageSource.camera);
                      },
                    ),
                    _imagePickerOption(
                      icon: Icons.photo_library_rounded,
                      label: AppStrings.get('photoGallery'),
                      sublabel: AppStrings.get('noTimestamp'),
                      onTap: () {
                        Navigator.pop(context);
                        _pickImage(ImageSource.gallery);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _imagePickerOption({
    required IconData icon,
    required String label,
    required String sublabel,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, size: 32, color: const Color(0xFF4CAF50)),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(
            sublabel,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  // ─── Two-step category tree selector ──────────────────────────────────────

  Future<void> _pickImage(ImageSource source) async {
    try {
      final captureTime = DateTime.now();

      final pickedFile = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 85,
      );

      if (pickedFile != null) {
        // Capture metadata at time of photo
        double? lat;
        double? lng;
        if (source == ImageSource.camera) {
          // Try to attach current GPS to the evidence record
          final pos = await _geolocatorService.getCurrentLocation();
          if (!mounted) return;
          if (pos != null) {
            lat = pos.latitude;
            lng = pos.longitude;
          }
        }

        File imageFile = File(pickedFile.path);

        // Bake a GPS Map Camera-style stamp into a live capture so the evidence
        // is self-describing (place, coordinates, time, Google-Maps QR).
        bool stamped = false;
        if (source == ImageSource.camera && lat != null && lng != null) {
          final muni = oneVizcayaState.selectedMunicipality.value;
          final place = [
            if (_selectedBarangay != null && _selectedBarangay!.isNotEmpty)
              'Brgy. $_selectedBarangay',
            if (muni.isNotEmpty) muni,
            'Nueva Vizcaya, PH',
          ].join(', ');
          final stampedBytes = await GeoStampService.stamp(
            imageBytes: await imageFile.readAsBytes(),
            lat: lat,
            lng: lng,
            placeLine: place,
            takenAt: captureTime,
          );
          if (stampedBytes != null) {
            final out = File('${pickedFile.path}_stamped.png');
            await out.writeAsBytes(stampedBytes);
            imageFile = out;
            stamped = true;
          }
        }

        if (!mounted) return;
        setState(() {
          _selectedImage = imageFile;
          _photoSource = source == ImageSource.camera ? 'camera' : 'gallery';
          if (source == ImageSource.camera) {
            _photoTimestamp = captureTime;
            _photoLatitude = lat;
            _photoLongitude = lng;
          } else {
            _photoTimestamp = null;
            _photoLatitude = null;
            _photoLongitude = null;
            _photoSource = null;
          }
        });
        ToastUtils.showSuccess(
          source == ImageSource.camera
              ? (stamped
                  ? 'Photo stamped with location, time & QR'
                  : 'Photo attached with timestamp & GPS')
              : 'Photo attached successfully',
        );
      }
    } catch (e) {
      ToastUtils.showError('Failed to pick image: $e');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSION OPTIONS CARD
// Replaces the two confusing SwitchListTiles with clear segmented selectors
// so users instantly see: (1) online vs SMS and (2) named vs anonymous.
// ═══════════════════════════════════════════════════════════════════════════

class _SubmissionOptionsCard extends StatelessWidget {
  final bool isOffline;
  final Color primaryColor;
  final ValueChanged<bool> onOfflineChanged;

  const _SubmissionOptionsCard({
    required this.isOffline,
    required this.primaryColor,
    required this.onOfflineChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? theme.colorScheme.surface : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: isDark ? theme.dividerColor : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── How to send ────────────────────────────────────────────────
          _sectionLabel(context, 'How would you like to send this?'),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _ModeOption(
                  icon: Icons.wifi_rounded,
                  label: 'Online',
                  subtitle: 'Wi-Fi or mobile data',
                  selected: !isOffline,
                  selectedColor: primaryColor,
                  onTap: () => onOfflineChanged(false),
                  semanticHint: 'Send report online via internet',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ModeOption(
                  icon: Icons.sms_outlined,
                  label: 'Send via SMS',
                  subtitle: 'No internet needed',
                  selected: isOffline,
                  selectedColor: const Color(0xFF5C6BC0),
                  onTap: () => onOfflineChanged(true),
                  semanticHint: 'Send report via SMS text message',
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // ── Identity ──────────────────────────────────────────────────
          // Every report is tied to the verified submitter for accountability
          // and follow-up (anonymous reporting has been removed at the LGU's
          // request — government data-integrity requirement).
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: primaryColor.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: primaryColor.withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                Icon(Icons.verified_user_outlined,
                    size: 18, color: primaryColor),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Submitted under your verified account so the LGU can '
                    'follow up and keep records accountable.',
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.35,
                      color: Theme.of(context).brightness == Brightness.dark
                          ? const Color(0xFFA8ADB5)
                          : const Color(0xFF555555),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Supplementary-channel notice (PDRRMO letter §7 and §11) ──────
          // PDRRMO asked that the app "complement, rather than replace,
          // established emergency mechanisms such as the Provincial EOC/OpCen,
          // MDRRMOs, emergency hotlines, radio communications, 911" and that it
          // "not create an expectation of 24/7 emergency response". It has to
          // say so at the point of reporting, not only in project docs.
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF3A2E12) : const Color(0xFFFFF8E1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? const Color(0xFF6B5420) : const Color(0xFFFFE082),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.info_outline_rounded,
                  size: 18,
                  color: isDark ? const Color(0xFFE0B65C) : const Color(0xFF8D6E00),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        AppStrings.get('notReplacementTitle'),
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: isDark
                              ? const Color(0xFFE0B65C)
                              : const Color(0xFF8D6E00),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        AppStrings.get('notReplacementBody'),
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.35,
                          color: isDark
                              ? const Color(0xFFCBB683)
                              : const Color(0xFF6B5420),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(BuildContext context, String text) => Text(
    text,
    style: TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      color: Theme.of(context).brightness == Brightness.dark
          ? const Color(0xFFA8ADB5)
          : const Color(0xFF555555),
      letterSpacing: 0.2,
    ),
  );
}

class _ModeOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final bool selected;
  final Color selectedColor;
  final VoidCallback onTap;
  final String semanticHint;

  const _ModeOption({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.selected,
    required this.selectedColor,
    required this.onTap,
    required this.semanticHint,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Semantics(
      button: true,
      selected: selected,
      hint: semanticHint,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(
            color: selected
                ? selectedColor.withValues(alpha: isDark ? 0.22 : 0.1)
                : (isDark ? theme.colorScheme.surfaceContainerHighest : Colors.white),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected
                  ? selectedColor
                  : (isDark ? theme.dividerColor : Colors.grey.shade300),
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                icon,
                size: 20,
                color: selected
                    ? selectedColor
                    : (isDark ? const Color(0xFFA8ADB5) : Colors.grey.shade500),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: selected
                            ? selectedColor
                            : (isDark
                                ? theme.colorScheme.onSurface
                                : const Color(0xFF333333)),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 11,
                        color: selected
                            ? selectedColor.withValues(alpha: isDark ? 0.9 : 0.75)
                            : (isDark ? const Color(0xFFA8ADB5) : Colors.grey.shade500),
                      ),
                    ),
                  ],
                ),
              ),
              if (selected)
                Icon(
                  Icons.check_circle_rounded,
                  size: 15,
                  color: selectedColor,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BARANGAY DROPDOWN
// Shows barangays for the user's currently selected municipality.
// Falls back to a text field if no data exists for that municipality.
// ═══════════════════════════════════════════════════════════════════════════

class _BarangayDropdown extends StatelessWidget {
  final String municipality;
  final String? selectedBarangay;
  final Color primaryColor;
  final ValueChanged<String?> onChanged;

  const _BarangayDropdown({
    required this.municipality,
    required this.selectedBarangay,
    required this.primaryColor,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final barangays = AppConstants.municipalityBarangays[municipality] ?? [];

    if (barangays.isEmpty) {
      // Fallback: free-text field for unknown municipalities
      return TextFormField(
        initialValue: selectedBarangay,
        onChanged: (val) => onChanged(val.trim().isEmpty ? null : val.trim()),
        decoration: InputDecoration(
          labelText: 'Barangay (optional)',
          hintText: 'Enter your barangay name',
          prefixIcon: Icon(Icons.location_city_outlined, color: primaryColor),
          focusedBorder: OutlineInputBorder(
            borderSide: BorderSide(color: primaryColor, width: 2),
          ),
          enabledBorder: OutlineInputBorder(
            borderSide: BorderSide(color: primaryColor.withValues(alpha: 0.4)),
          ),
          labelStyle: TextStyle(color: primaryColor),
        ),
      );
    }

    // Ensure the current selection is still valid for this municipality
    final validSelection = barangays.contains(selectedBarangay)
        ? selectedBarangay
        : null;

    return DropdownButtonFormField<String>(
      value: validSelection,
      isExpanded: true,
      dropdownColor: Theme.of(context).colorScheme.surface,
      hint: Text(
        '${AppStrings.get('barangay')} (${AppStrings.get('optional')})',
      ),
      decoration: InputDecoration(
        labelText:
            '${AppStrings.get('barangay')} (${AppStrings.get('optional')})',
        prefixIcon: Icon(
          Icons.location_city_outlined,
          color: primaryColor,
          semanticLabel: 'Barangay',
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: BorderSide(color: primaryColor, width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(color: primaryColor.withValues(alpha: 0.4)),
        ),
        labelStyle: TextStyle(color: primaryColor),
      ),
      items: [
        // "None" option to clear the selection
        DropdownMenuItem<String>(
          value: null,
          child: Text(
            AppStrings.get('noneOption'),
            style: const TextStyle(
              color: Colors.grey,
              fontStyle: FontStyle.italic,
            ),
          ),
        ),
        ...barangays.map(
          (b) => DropdownMenuItem<String>(value: b, child: Text(b)),
        ),
      ],
      onChanged: onChanged,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TWO-STEP INLINE CATEGORY TREE SELECTOR
// Step 1: pick a priority tier (Critical / High / Medium / Low)
// Step 2: pick a specific category within that tier
// ═══════════════════════════════════════════════════════════════════════════

class _CategoryTreeSelector extends StatefulWidget {
  final Color primaryColor;
  final ReportPriority? selectedPriority;
  final ReportCategory? selectedCategory;
  final bool hasError;
  final ValueChanged<ReportPriority> onPrioritySelected;
  final ValueChanged<ReportCategory> onCategorySelected;
  final VoidCallback onReset;

  const _CategoryTreeSelector({
    required this.primaryColor,
    required this.selectedPriority,
    required this.selectedCategory,
    required this.hasError,
    required this.onPrioritySelected,
    required this.onCategorySelected,
    required this.onReset,
  });

  @override
  State<_CategoryTreeSelector> createState() => _CategoryTreeSelectorState();
}

class _CategoryTreeSelectorState extends State<_CategoryTreeSelector> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';

  static const _priorityOrder = [
    ReportPriority.critical,
    ReportPriority.high,
    ReportPriority.medium,
    ReportPriority.low,
  ];

  static const _prioritySubtitles = {
    ReportPriority.critical: 'Life, safety & major disasters',
    ReportPriority.high: 'Urgent infrastructure & order',
    ReportPriority.medium: 'Roads, utilities & environment',
    ReportPriority.low: 'Community & general concerns',
  };

  List<ReportCategory> _categoriesFor(ReportPriority p) =>
      ReportCategory.values.where((c) => c.basePriority == p).toList();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // ── State C: both selected → show breadcrumb summary ──────────────────
    if (widget.selectedCategory != null) {
      return _buildSummary(context);
    }

    final query = _query.trim().toLowerCase();
    final searching = query.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section label
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Icon(Icons.category, size: 16, color: widget.primaryColor),
              const SizedBox(width: 6),
              Text(
                'Select Problem Category',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: widget.primaryColor,
                ),
              ),
              if (widget.hasError) ...[
                const SizedBox(width: 8),
                const Text(
                  '* Required',
                  style: TextStyle(fontSize: 11, color: Colors.red),
                ),
              ],
            ],
          ),
        ),

        // ── Search: type what you're reporting (e.g. "traffic") ───────────
        _buildSearchField(),
        const SizedBox(height: 10),

        if (searching)
          _buildSearchResults(query)
        else ...[
          // ── State A: no priority chosen yet → show 2×2 priority tiles ─────
          if (widget.selectedPriority == null) _buildPriorityGrid(),

          // ── State B: priority chosen → show category list for that tier ───
          if (widget.selectedPriority != null) ...[
            _buildSelectedPriorityHeader(),
            const SizedBox(height: 8),
            _buildCategoryList(),
          ],
        ],

        if (widget.hasError)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: Text(
              'Please pick a category (search or browse) to continue.',
              style: TextStyle(fontSize: 11, color: Colors.red.shade700),
            ),
          ),
      ],
    );
  }

  // ── Search field: filters all categories by name or example text ──────────
  Widget _buildSearchField() {
    return TextField(
      controller: _searchCtrl,
      onChanged: (v) => setState(() => _query = v),
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        isDense: true,
        hintText: 'Search e.g. "traffic", "flood", "streetlight"…',
        hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade500),
        prefixIcon: Icon(Icons.search, size: 20, color: widget.primaryColor),
        suffixIcon: _query.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.close, size: 18),
                tooltip: 'Clear search',
                onPressed: () {
                  _searchCtrl.clear();
                  setState(() => _query = '');
                },
              )
            : null,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: widget.primaryColor, width: 2),
        ),
      ),
    );
  }

  // ── Flat, cross-tier results for the current query ────────────────────────
  Widget _buildSearchResults(String query) {
    final matches = ReportCategory.values
        .where((c) =>
            c.displayName.toLowerCase().contains(query) ||
            c.description.toLowerCase().contains(query))
        .toList();

    if (matches.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          children: [
            Text(
              'No categories match "$query".',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              "Report it under “Others” and describe it — the LGU will route it.",
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () => widget.onCategorySelected(ReportCategory.others),
              icon: const Icon(Icons.help_outline, size: 18),
              label: const Text('Report under "Others"'),
              style: OutlinedButton.styleFrom(
                foregroundColor: widget.primaryColor,
                side: BorderSide(color: widget.primaryColor.withValues(alpha: 0.5)),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 6, left: 2),
          child: Text(
            '${matches.length} match${matches.length == 1 ? '' : 'es'}',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
          ),
        ),
        ...matches.map(
          (c) => _CategoryCard(
            category: c,
            onTap: () => widget.onCategorySelected(c),
          ),
        ),
      ],
    );
  }

  // ── 2×2 priority tile grid ────────────────────────────────────────────────
  Widget _buildPriorityGrid() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = constraints.maxWidth > AppConstants.kTabletBreakpoint
            ? 4
            : 2;
        return GridView.count(
          crossAxisCount: cols,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: cols == 4 ? 2.2 : 2.4,
          children: _priorityOrder.map((p) {
            final count = _categoriesFor(p).length;
            return _PriorityTile(
              priority: p,
              subtitle: _prioritySubtitles[p]!,
              categoryCount: count,
              onTap: () => widget.onPrioritySelected(p),
            );
          }).toList(),
        );
      },
    );
  }

  // ── Selected priority header with back button ─────────────────────────────
  Widget _buildSelectedPriorityHeader() {
    final p = widget.selectedPriority!;
    return GestureDetector(
      onTap: widget.onReset,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: p.color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: p.color.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Icon(Icons.arrow_back_ios, size: 13, color: p.color),
            const SizedBox(width: 6),
            Icon(p.icon, size: 16, color: p.color),
            const SizedBox(width: 6),
            Text(
              '${p.displayName} Priority',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: p.color,
              ),
            ),
            const Spacer(),
            Text(
              'Change',
              style: TextStyle(
                fontSize: 11,
                color: p.color.withValues(alpha: 0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Category cards for the selected priority tier ─────────────────────────
  Widget _buildCategoryList() {
    final categories = _categoriesFor(widget.selectedPriority!);
    return AnimatedSize(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
      child: Column(
        children: categories
            .map(
              (c) => _CategoryCard(
                category: c,
                onTap: () => widget.onCategorySelected(c),
              ),
            )
            .toList(),
      ),
    );
  }

  // ── Summary breadcrumb after full selection ───────────────────────────────
  Widget _buildSummary(BuildContext context) {
    final p = widget.selectedCategory!.basePriority;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Breadcrumb row
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: p.color.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: p.color.withValues(alpha: 0.35)),
          ),
          child: Row(
            children: [
              Icon(p.icon, size: 16, color: p.color),
              const SizedBox(width: 6),
              Text(
                p.displayName,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: p.color,
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Icon(
                  Icons.chevron_right,
                  size: 16,
                  color: p.color.withValues(alpha: 0.6),
                ),
              ),
              Expanded(
                child: Text(
                  widget.selectedCategory!.displayName,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? theme.colorScheme.onSurface
                        : const Color(0xFF1A1A1A),
                  ),
                ),
              ),
              GestureDetector(
                onTap: widget.onReset,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? theme.colorScheme.surfaceContainerHighest
                        : Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Change',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDark
                          ? const Color(0xFFA8ADB5)
                          : Colors.grey.shade700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        // Description hint
        Padding(
          padding: const EdgeInsets.only(top: 8, left: 4, right: 4),
          child: Text(
            widget.selectedCategory!.description,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade600,
              fontStyle: FontStyle.italic,
              height: 1.5,
            ),
          ),
        ),
      ],
    );
  }
}

// ── Priority tile card ────────────────────────────────────────────────────────
class _PriorityTile extends StatelessWidget {
  final ReportPriority priority;
  final String subtitle;
  final int categoryCount;
  final VoidCallback onTap;

  const _PriorityTile({
    required this.priority,
    required this.subtitle,
    required this.categoryCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: priority.color.withValues(alpha: 0.07),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: priority.color.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: priority.color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(priority.icon, size: 16, color: priority.color),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      priority.displayName,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: priority.color,
                      ),
                    ),
                    Text(
                      '$categoryCount types',
                      style: TextStyle(
                        fontSize: 10,
                        color: priority.color.withValues(alpha: 0.7),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                size: 16,
                color: priority.color.withValues(alpha: 0.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Category card inside priority tier ───────────────────────────────────────
class _CategoryCard extends StatelessWidget {
  final ReportCategory category;
  final VoidCallback onTap;

  const _CategoryCard({required this.category, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final p = category.basePriority;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: isDark ? theme.colorScheme.surfaceContainerHighest : Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: isDark ? theme.dividerColor : Colors.grey.shade200),
              boxShadow: isDark
                  ? null
                  : [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
            ),
            child: Row(
              children: [
                Icon(p.icon, size: 18, color: p.color),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        category.displayName,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? theme.colorScheme.onSurface
                              : const Color(0xFF1A1A1A),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        category.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade500,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.arrow_forward_ios,
                  size: 13,
                  color: Colors.grey.shade400,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A text controller that renders any characters typed beyond [limit] in red
/// with a strike-through, so the user can see they have exceeded the allowed
/// length without being hard-blocked from typing (submission is still gated by
/// the field's validator).
class _LimitHighlightTextEditingController extends TextEditingController {
  final int limit;
  _LimitHighlightTextEditingController({required this.limit});

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final str = text;
    // While an IME composing region is active, defer to the default rendering
    // so the composing underline isn't broken; the overflow highlight reappears
    // once composing commits.
    final composing = value.composing;
    if (str.characters.length <= limit ||
        (withComposing && composing.isValid && !composing.isCollapsed)) {
      return super.buildTextSpan(
        context: context,
        style: style,
        withComposing: withComposing,
      );
    }
    // Split on grapheme clusters so emoji/accented input isn't cut mid-glyph.
    final allowed = str.characters.take(limit).toString();
    final overflow = str.characters.skip(limit).toString();
    return TextSpan(
      style: style,
      children: [
        TextSpan(text: allowed),
        TextSpan(
          text: overflow,
          style: (style ?? const TextStyle()).copyWith(
            color: Colors.red.shade600,
            decoration: TextDecoration.lineThrough,
            decorationColor: Colors.red.shade600,
            decorationThickness: 2,
          ),
        ),
      ],
    );
  }
}
