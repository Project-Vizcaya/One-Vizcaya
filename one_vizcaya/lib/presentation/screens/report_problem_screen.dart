import 'package:flutter/material.dart';
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
import '../../core/utils/toast_utils.dart';
import '../../domain/enums/report_category.dart';
import '../../domain/enums/report_status.dart';
import '../../domain/models/problem_report.dart';
import '../../domain/repositories/report_repository.dart';
import '../../data/repositories_impl/firebase_report_repository.dart';
import '../../data/services/geolocator_service.dart';
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
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  late final TextEditingController _barangayController;
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
    _barangayController = TextEditingController();
  }

  Future<void> _getLocation() async {
    setState(() => _isGettingLocation = true);
    final position = await _geolocatorService.getCurrentLocation();
    if (position != null) {
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
      debugPrint('Image upload failed: $e');
      return null;
    }
  }

  Future<void> _submitReport() async {
    if (!_formKey.currentState!.validate()) return;
    if (_isSubmitting) return;

    // GPS is required for online submissions
    if (!_isOffline && _currentPosition == null) {
      ToastUtils.showError(
        'Please attach your GPS location before submitting online.',
      );
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    final lastSubmitTime = prefs.getInt('last_report_time') ?? 0;
    final currentTime = DateTime.now().millisecondsSinceEpoch;

    if (currentTime - lastSubmitTime < 5 * 60 * 1000) {
      ToastUtils.showError(
        'Please wait 5 minutes between submitting reports to prevent spam.',
      );
      return;
    }

    _formKey.currentState!.save();
    setState(() => _isSubmitting = true);

    final municipalityReportingTo = oneVizcayaState.selectedMunicipality.value;

    if (_isOffline) {
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
      final String userId = user?.uid ?? 'anonymous';

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
        barangay: _barangayController.text.trim().isEmpty
            ? null
            : _barangayController.text.trim(),
      );

      await _reportRepository.submitReport(report, userId);

      _locationController.clear();
      _descriptionController.clear();
      _barangayController.clear();
      if (!mounted) return;
      setState(() {
        _selectedCategory = null;
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
            child: const Text('OK'),
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
        title: Text('Report Problem to $activeMunicipalityName'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SwitchListTile(
                title: Text(
                  _isOffline
                      ? 'Report via SMS (Offline)'
                      : 'Report via App (Online)',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                subtitle: Text(
                  _isOffline
                      ? 'Uses your phone\'s SMS plan. Standard rates may apply.'
                      : 'Uses mobile data or Wi-Fi.',
                ),
                value: _isOffline,
                onChanged: (value) => setState(() => _isOffline = value),
                activeThumbColor: primaryLguColor,
              ),
              SwitchListTile(
                title: const Text(
                  'Submit Anonymously',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: const Text(
                  'Your name and phone number will not be attached to this report.',
                ),
                secondary: const Icon(Icons.visibility_off_outlined),
                value: _isAnonymous,
                onChanged: (value) => setState(() => _isAnonymous = value),
                activeThumbColor: primaryLguColor,
              ),
              const SizedBox(height: 24),
              DropdownButtonFormField<ReportCategory>(
                value: _selectedCategory,
                hint: const Text('Select Problem Category'),
                isExpanded: true,
                dropdownColor: Colors.white,
                style: const TextStyle(color: Colors.black87, fontSize: 16),
                items: ReportCategory.values.map((category) {
                  return DropdownMenuItem<ReportCategory>(
                    value: category,
                    child: Row(
                      children: [
                        Icon(
                          category.basePriority.icon,
                          size: 16,
                          color: category.basePriority.color,
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Text(category.displayName)),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (newValue) =>
                    setState(() => _selectedCategory = newValue),
                validator: (value) =>
                    value == null ? 'Please select a category' : null,
                decoration: InputDecoration(
                  labelText: 'Category',
                  prefixIcon: Icon(Icons.category, color: primaryLguColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: primaryLguColor, width: 2),
                  ),
                  labelStyle: TextStyle(color: primaryLguColor),
                ),
              ),
              if (_selectedCategory != null) ...[
                Padding(
                  padding: const EdgeInsets.only(top: 8, left: 12, right: 12),
                  child: Text(
                    _selectedCategory!.description,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[700],
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4, left: 12),
                  child: Row(
                    children: [
                      Icon(
                        _selectedCategory!.basePriority.icon,
                        size: 14,
                        color: _selectedCategory!.basePriority.color,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Base Priority: ${_selectedCategory!.basePriority.displayName}',
                        style: TextStyle(
                          fontSize: 12,
                          color: _selectedCategory!.basePriority.color,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              TextFormField(
                controller: _locationController,
                decoration: InputDecoration(
                  labelText: 'Location / Landmark',
                  prefixIcon: Icon(Icons.location_on, color: primaryLguColor),
                  hintText:
                      'e.g., "In front of $activeMunicipalityName Municipal Hall"',
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: primaryLguColor, width: 2),
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
                    : const Icon(Icons.gps_fixed),
                label: Text(
                  _currentPosition != null
                      ? 'Location Attached ✓'
                      : 'Attach Precise Location (GPS)',
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
              TextFormField(
                controller: _barangayController,
                decoration: InputDecoration(
                  labelText: 'Barangay (optional)',
                  hintText: 'Enter your barangay name',
                  prefixIcon: Icon(Icons.location_city_outlined, color: primaryLguColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: primaryLguColor, width: 2),
                  ),
                  labelStyle: TextStyle(color: primaryLguColor),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                decoration: InputDecoration(
                  labelText: 'Brief Description',
                  prefixIcon: Icon(Icons.description, color: primaryLguColor),
                  hintText: 'Describe the problem in detail (min. 50 characters).',
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: primaryLguColor, width: 2),
                  ),
                  labelStyle: TextStyle(color: primaryLguColor),
                ),
                maxLines: 4,
                maxLength: 500,
                buildCounter: (context,
                        {required currentLength,
                        required isFocused,
                        maxLength}) =>
                    Text(
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
                icon: const Icon(Icons.camera_alt),
                label: Text(
                  _selectedImage != null
                      ? 'Photo Attached ✓'
                      : 'Attach Photo Evidence (Optional)',
                ),
                onPressed: _isOffline ? null : () => _showImagePickerOptions(),
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
                        Icon(
                          Icons.verified,
                          size: 14,
                          color: Colors.green.shade700,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Evidence timestamp: '
                            '${_photoTimestamp!.day}/${_photoTimestamp!.month}/${_photoTimestamp!.year} '
                            '${_photoTimestamp!.hour.toString().padLeft(2, '0')}:'
                            '${_photoTimestamp!.minute.toString().padLeft(2, '0')}'
                            '${_photoLatitude != null ? '\nGPS: ${_photoLatitude!.toStringAsFixed(5)}, ${_photoLongitude!.toStringAsFixed(5)}' : ''}',
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
                      ? const Row(
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
                            Text('Submitting…'),
                          ],
                        )
                      : const Text('Submit Report'),
                ),
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _locationController.dispose();
    _barangayController.dispose();
    super.dispose();
  }

  void _showImagePickerOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
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
                    label: 'Camera',
                    sublabel: 'Timestamped',
                    onTap: () {
                      Navigator.pop(context);
                      _pickImage(ImageSource.camera);
                    },
                  ),
                  _imagePickerOption(
                    icon: Icons.photo_library_rounded,
                    label: 'Gallery',
                    sublabel: 'No timestamp',
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
          if (pos != null) {
            lat = pos.latitude;
            lng = pos.longitude;
          }
        }

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
