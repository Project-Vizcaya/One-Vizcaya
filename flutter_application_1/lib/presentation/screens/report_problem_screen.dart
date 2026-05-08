import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';

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
  bool _isOffline = false;
  bool _isGettingLocation = false;
  Position? _currentPosition;

  final ReportRepository _reportRepository = FirebaseReportRepository();
  final GeolocatorService _geolocatorService = GeolocatorService();
  final PriorityService _priorityService = PriorityService();

  Future<void> _getLocation() async {
    setState(() => _isGettingLocation = true);
    final position = await _geolocatorService.getCurrentLocation();
    if (position != null) {
      setState(() {
        _currentPosition = position;
        _isGettingLocation = false;
      });
      ToastUtils.showSuccess('Location attached successfully');
    } else {
      setState(() => _isGettingLocation = false);
      ToastUtils.showError('Could not get precise location. You can still submit the report.');
    }
  }

  void _submitReport() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();

      final municipalityReportingTo = oneVizcayaState.selectedMunicipality.value;

      final reportDetails =
          'Reporting to: $municipalityReportingTo\n'
          'Category: ${_selectedCategory?.displayName}\n'
          'Location: ${_locationController.text}\n'
          'Description: ${_descriptionController.text}';

      if (_isOffline) {
        _sendSmsReport(municipalityReportingTo, reportDetails);
      } else {
        _sendOnlineReport(municipalityReportingTo);
      }
    }
  }

  Future<void> _sendSmsReport(String municipality, String details) async {
    String localizedHotline = '+639170000000';
    if (municipality == 'Solano') localizedHotline = '+639181111111';

    final String smsUri = 'sms:$localizedHotline?body=${Uri.encodeComponent(details)}';
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

      // Calculate priority based on category severity + crowd duplicates
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
        userId: userId,
        userPhone: user?.phoneNumber,
      );

      // Fire and forget with try-catch in repository
      _reportRepository.submitReport(report, userId);

      _locationController.clear();
      _descriptionController.clear();
      setState(() {
        _selectedCategory = null;
        _currentPosition = null;
      });

      if (!mounted) return;

      // Show priority feedback in the confirmation dialog
      String priorityMsg = '';
      if (priorityResult.duplicateCount > 0) {
        priorityMsg = '\n\n📊 ${priorityResult.duplicateCount} similar report(s) found in the last 48 hours. '
            'Priority auto-escalated to ${priorityResult.priority.displayName}.';
      } else {
        priorityMsg = '\n\nPriority level: ${priorityResult.priority.displayName}.';
      }

      _showConfirmationDialog(
        title: 'Report Submitted',
        content: 'Your report has been successfully routed to the $municipality municipal engineering database.$priorityMsg',
      );
    } catch (e) {
      ToastUtils.showError('Error preparing report: $e');
    }
  }

  void _showConfirmationDialog({required String title, required String content}) {
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
    final primaryLguColor = dynamicTheme['appBarColor'];
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: primaryLguColor,
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
                  _isOffline ? 'Report via SMS (Offline)' : 'Report via App (Online)',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold),
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
                        Icon(category.basePriority.icon, size: 16, color: category.basePriority.color),
                        const SizedBox(width: 8),
                        Expanded(child: Text(category.displayName)),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (newValue) => setState(() => _selectedCategory = newValue),
                validator: (value) => value == null ? 'Please select a category' : null,
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
                  padding: const EdgeInsets.only(top: 8.0, left: 12.0, right: 12.0),
                  child: Text(
                    _selectedCategory!.description,
                    style: TextStyle(fontSize: 12, color: Colors.grey[700], fontStyle: FontStyle.italic),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4.0, left: 12.0),
                  child: Row(
                    children: [
                      Icon(_selectedCategory!.basePriority.icon, size: 14, color: _selectedCategory!.basePriority.color),
                      const SizedBox(width: 4),
                      Text(
                        'Base Priority: ${_selectedCategory!.basePriority.displayName}',
                        style: TextStyle(fontSize: 12, color: _selectedCategory!.basePriority.color, fontWeight: FontWeight.bold),
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
                  hintText: 'e.g., "In front of $activeMunicipalityName Municipal Hall"',
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: primaryLguColor, width: 2),
                  ),
                  labelStyle: TextStyle(color: primaryLguColor),
                ),
                validator: (value) => value == null || value.isEmpty ? 'Please enter a location' : null,
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                icon: _isGettingLocation
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.gps_fixed),
                label: Text(_currentPosition != null ? 'Location Attached' : 'Attach Precise Location (GPS)'),
                onPressed: _isOffline || _isGettingLocation ? null : _getLocation,
                style: OutlinedButton.styleFrom(
                  foregroundColor: _currentPosition != null ? Colors.green : primaryLguColor,
                  side: BorderSide(color: _currentPosition != null ? Colors.green : primaryLguColor),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                decoration: InputDecoration(
                  labelText: 'Brief Description',
                  prefixIcon: Icon(Icons.description, color: primaryLguColor),
                  hintText: 'Describe the problem in detail.',
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: primaryLguColor, width: 2),
                  ),
                  labelStyle: TextStyle(color: primaryLguColor),
                ),
                maxLines: 4,
                validator: (value) => value == null || value.isEmpty ? 'Please enter a description' : null,
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                icon: const Icon(Icons.camera_alt),
                label: const Text('Attach Photo (Optional)'),
                onPressed: _isOffline ? null : () => ToastUtils.showInfo('Image picker not yet implemented'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: primaryLguColor,
                  side: BorderSide(color: primaryLguColor),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _submitReport,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryLguColor,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Submit Report'),
              ),
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
    super.dispose();
  }
}
