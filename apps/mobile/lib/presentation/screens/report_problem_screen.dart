import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'dart:io';
import 'dart:typed_data';

import '../../core/constants/app_constants.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/utils/toast_utils.dart';
import '../../domain/enums/report_category.dart';
import '../../domain/enums/report_priority.dart';
import '../../domain/enums/report_status.dart';
import '../../domain/models/problem_report.dart';
import '../../domain/repositories/report_repository.dart';
import '../../data/repositories_impl/firebase_report_repository.dart';
import '../../data/services/geolocator_service.dart';
import '../../data/services/offline_queue_service.dart';
import '../../data/services/priority_service.dart';
import '../state/municipality_state.dart';

class ReportProblemScreen extends StatefulWidget {
  const ReportProblemScreen({super.key});

  @override
  _ReportProblemScreenState createState() => _ReportProblemScreenState();
}

class _ReportProblemScreenState extends State<ReportProblemScreen> {
  final _formKey = GlobalKey<FormState>();
  ReportCategory? _selectedCategory;
  ReportPriority? _selectedPriority;
  bool _categoryError = false;
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  String? _selectedBarangay;
  bool _isOffline = false;
  bool _isAnonymous = false;
  bool _isGettingLocation = false;
  bool _isSubmitting = false;
  Position? _currentPosition;

  final ReportRepository _reportRepository = FirebaseReportRepository();
  final GeolocatorService _geolocatorService = GeolocatorService();
  final PriorityService _priorityService = PriorityService();
  final ImagePicker _imagePicker = ImagePicker();

  File? _selectedImage;
  // Metadata captured when photo is taken
  DateTime? _photoTimestamp;
  double? _photoLatitude;
  double? _photoLongitude;

  @override
  void initState() {
    super.initState();
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

  Future<String?> _uploadImage(File image, String userId) async {
    try {
      final fileName = '${userId}_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final ref = FirebaseStorage.instance
          .ref()
          .child('report_images')
          .child(fileName);

      // Compress image before upload (target ~200 KB)
      final Uint8List? compressed = await FlutterImageCompress.compressWithFile(
        image.absolute.path,
        minWidth: 1024,
        minHeight: 1024,
        quality: 75,
        format: CompressFormat.jpeg,
      );

      UploadTask uploadTask;
      if (compressed != null) {
        uploadTask = ref.putData(
          compressed,
          SettableMetadata(contentType: 'image/jpeg'),
        );
      } else {
        uploadTask = ref.putFile(image);
      }

      final snapshot = await uploadTask;
      return await snapshot.ref.getDownloadURL();
    } catch (e) {
      // FIX 6: Only log in debug builds to avoid leaking file paths in release
      assert(() {
        debugPrint('Image upload failed: $e');
        return true;
      }());
      return null;
    }
  }

  Future<void> _submitReport() async {
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

    if (_isOffline) {
      // Queue the report for automatic submission when connectivity returns
      final user = FirebaseAuth.instance.currentUser;
      String userId;
      if (user != null) {
        userId = user.uid;
      } else {
        final p = await SharedPreferences.getInstance();
        String? anonId = p.getString('anon_device_id');
        if (anonId == null) {
          anonId =
              'anon_${DateTime.now().millisecondsSinceEpoch}_${(1000 + (DateTime.now().microsecond % 9000))}';
          await p.setString('anon_device_id', anonId);
        }
        userId = anonId;
      }
      final queuePayload = <String, dynamic>{
        'userId': userId,
        'category': _selectedCategory?.displayName ?? '',
        'description': _descriptionController.text,
        'location': _locationController.text,
        'municipality': municipalityReportingTo,
        'status': 'reported',
        'priority': 'normal',
        'priorityScore': 0,
        'duplicateCount': 0,
        'reportedAt': DateTime.now().toIso8601String(),
        'latitude': _currentPosition?.latitude,
        'longitude': _currentPosition?.longitude,
        'userId_field': _isAnonymous ? null : userId,
        'userPhone': _isAnonymous ? null : user?.phoneNumber,
        'isAnonymous': _isAnonymous,
        'barangay': _selectedBarangay,
      };
      await OfflineQueueService().enqueue(queuePayload);
      ToastUtils.showInfo(
        'Report saved. Will submit automatically when you\'re back online.',
      );

      // Also offer SMS as secondary option
      final reportDetails =
          'Reporting to: $municipalityReportingTo\n'
          'Category: ${_selectedCategory?.displayName}\n'
          'Location: ${_locationController.text}\n'
          'Description: ${_descriptionController.text}';
      await _sendSmsReport(municipalityReportingTo, reportDetails);
      setState(() => _isSubmitting = false);
    } else {
      await _sendOnlineReport(municipalityReportingTo);
    }

    await prefs.setInt('last_report_time', currentTime);
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

  Future<void> _sendOnlineReport(String municipality) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      // FIX 5: Use a persistent anonymous device ID instead of the bare string 'anonymous'
      String userId;
      if (user != null) {
        userId = user.uid;
      } else {
        final prefs = await SharedPreferences.getInstance();
        String? anonId = prefs.getString('anon_device_id');
        if (anonId == null) {
          anonId =
              'anon_${DateTime.now().millisecondsSinceEpoch}_${(1000 + (DateTime.now().microsecond % 9000))}';
          await prefs.setString('anon_device_id', anonId);
        }
        userId = anonId;
      }

      // Upload image if one was selected
      String? imageUrl;
      if (_selectedImage != null) {
        ToastUtils.showSuccess('Uploading photo evidence…');
        imageUrl = await _uploadImage(_selectedImage!, userId);
      }

      final priorityResult = await _priorityService.calculatePriority(
        category: _selectedCategory!,
        municipality: municipality,
      );

      final report = ProblemReport(
        id: '',
        category: _selectedCategory!,
        description: _descriptionController.text,
        location: _locationController.text,
        municipality: municipality,
        status: ReportStatus.reported,
        priority: priorityResult.priority,
        priorityScore: priorityResult.score,
        duplicateCount: priorityResult.duplicateCount,
        reportedAt: DateTime.now(),
        latitude: _currentPosition?.latitude,
        longitude: _currentPosition?.longitude,
        userId: _isAnonymous ? null : userId,
        userPhone: _isAnonymous ? null : user?.phoneNumber,
        imageUrl: imageUrl,
        photoTimestamp: _photoTimestamp,
        photoLatitude: _photoLatitude,
        photoLongitude: _photoLongitude,
        isAnonymous: _isAnonymous,
        barangay: _selectedBarangay,
      );

      await _reportRepository.submitReport(report, userId);

      HapticFeedback.mediumImpact();

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
        _isAnonymous = false;
        _isSubmitting = false;
      });

      if (!mounted) return;

      String priorityMsg = priorityResult.duplicateCount > 0
          ? '\n\n${priorityResult.duplicateCount} similar report(s) found in the last 48 hours. '
                'Priority auto-escalated to ${priorityResult.priority.displayName}.'
          : '\n\nPriority level: ${priorityResult.priority.displayName}.';

      _showConfirmationDialog(
        title: 'Report Submitted',
        content:
            'Your report has been successfully routed to the $municipality '
            'municipal engineering database.$priorityMsg',
      );
    } on FirebaseException catch (e) {
      setState(() => _isSubmitting = false);
      if (e.code == 'unavailable') {
        ToastUtils.showError(
          'No internet connection. Please try again when online, or use SMS mode.',
        );
      } else {
        ToastUtils.showError('Submission failed: ${e.message}');
      }
    } catch (e) {
      setState(() => _isSubmitting = false);
      ToastUtils.showError('An error occurred. Please try again.');
    }
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
    final primaryLguColor = dynamicTheme['appBarColor'] as Color;
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: primaryLguColor,
        foregroundColor: Colors.white,
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
                  _SubmissionOptionsCard(
                    isOffline: _isOffline,
                    isAnonymous: _isAnonymous,
                    primaryColor: primaryLguColor,
                    onOfflineChanged: (v) => setState(() => _isOffline = v),
                    onAnonymousChanged: (v) => setState(() => _isAnonymous = v),
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
                    maxLength: 500,
                    buildCounter:
                        (
                          context, {
                          required currentLength,
                          required isFocused,
                          maxLength,
                        }) => Text(
                          '$currentLength / 50 min',
                          style: TextStyle(
                            fontSize: 12,
                            color: currentLength < 50
                                ? Colors.red.shade400
                                : Colors.grey.shade600,
                          ),
                        ),
                    onChanged: (_) => setState(() {}),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter a description';
                      }
                      if (value.trim().length < 50) {
                        return 'Description must be at least 50 characters';
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
                        backgroundColor: primaryLguColor,
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

        if (!mounted) return;
        setState(() {
          _selectedImage = File(pickedFile.path);
          if (source == ImageSource.camera) {
            _photoTimestamp = captureTime;
            _photoLatitude = lat;
            _photoLongitude = lng;
          }
        });
        ToastUtils.showSuccess(
          source == ImageSource.camera
              ? 'Photo attached with timestamp & GPS'
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
  final bool isAnonymous;
  final Color primaryColor;
  final ValueChanged<bool> onOfflineChanged;
  final ValueChanged<bool> onAnonymousChanged;

  const _SubmissionOptionsCard({
    required this.isOffline,
    required this.isAnonymous,
    required this.primaryColor,
    required this.onOfflineChanged,
    required this.onAnonymousChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── How to send ────────────────────────────────────────────────
          _sectionLabel('How would you like to send this?'),
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
          _sectionLabel('Your identity'),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _ModeOption(
                  icon: Icons.person_outlined,
                  label: 'With my name',
                  subtitle: 'LGU can follow up',
                  selected: !isAnonymous,
                  selectedColor: primaryColor,
                  onTap: () => onAnonymousChanged(false),
                  semanticHint: 'Submit with your name visible to LGU',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ModeOption(
                  icon: Icons.visibility_off_outlined,
                  label: 'Anonymous',
                  subtitle: 'Identity is hidden',
                  selected: isAnonymous,
                  selectedColor: Colors.grey.shade700,
                  onTap: () => onAnonymousChanged(true),
                  semanticHint: 'Submit anonymously, identity hidden from LGU',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(String text) => Text(
    text,
    style: const TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      color: Color(0xFF555555),
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
                ? selectedColor.withValues(alpha: 0.1)
                : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? selectedColor : Colors.grey.shade300,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                icon,
                size: 20,
                color: selected ? selectedColor : Colors.grey.shade500,
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
                            : const Color(0xFF333333),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 11,
                        color: selected
                            ? selectedColor.withValues(alpha: 0.75)
                            : Colors.grey.shade500,
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
      dropdownColor: Colors.white,
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

class _CategoryTreeSelector extends StatelessWidget {
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
  Widget build(BuildContext context) {
    // ── State C: both selected → show breadcrumb summary ──────────────────
    if (selectedCategory != null) {
      return _buildSummary();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section label
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Icon(Icons.category, size: 16, color: primaryColor),
              const SizedBox(width: 6),
              Text(
                'Select Problem Category',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: primaryColor,
                ),
              ),
              if (hasError) ...[
                const SizedBox(width: 8),
                const Text(
                  '* Required',
                  style: TextStyle(fontSize: 11, color: Colors.red),
                ),
              ],
            ],
          ),
        ),

        // ── State A: no priority chosen yet → show 2×2 priority tiles ─────
        if (selectedPriority == null) _buildPriorityGrid(),

        // ── State B: priority chosen → show category list for that tier ───
        if (selectedPriority != null) ...[
          _buildSelectedPriorityHeader(),
          const SizedBox(height: 8),
          _buildCategoryList(),
        ],

        if (hasError)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: Text(
              'Please complete both steps to continue.',
              style: TextStyle(fontSize: 11, color: Colors.red.shade700),
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
              onTap: () => onPrioritySelected(p),
            );
          }).toList(),
        );
      },
    );
  }

  // ── Selected priority header with back button ─────────────────────────────
  Widget _buildSelectedPriorityHeader() {
    final p = selectedPriority!;
    return GestureDetector(
      onTap: onReset,
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
    final categories = _categoriesFor(selectedPriority!);
    return AnimatedSize(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
      child: Column(
        children: categories
            .map(
              (c) => _CategoryCard(
                category: c,
                onTap: () => onCategorySelected(c),
              ),
            )
            .toList(),
      ),
    );
  }

  // ── Summary breadcrumb after full selection ───────────────────────────────
  Widget _buildSummary() {
    final p = selectedCategory!.basePriority;
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
                  selectedCategory!.displayName,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
              ),
              GestureDetector(
                onTap: onReset,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Change',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey.shade700,
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
            selectedCategory!.description,
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
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
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
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1A1A1A),
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
