import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/constants/app_constants.dart';
import '../../core/l10n/app_strings.dart';
import '../state/municipality_state.dart';
import '../../features/auth/presentation/screens/privacy_policy_screen.dart';

class MunicipalitySetupScreen extends StatefulWidget {
  const MunicipalitySetupScreen({super.key});

  @override
  _MunicipalitySetupScreenState createState() => _MunicipalitySetupScreenState();
}

class _MunicipalitySetupScreenState extends State<MunicipalitySetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  String? _selectedTown;
  bool _hasAcceptedPrivacy = false;
  bool _isSaving = false;

  Color _getMunicipalityColor(String? name) {
    if (name == null) return const Color(0xFF00796B);
    final theme = AppConstants.municipalityThemes[name];
    if (theme != null) return theme['appBarColor'] as Color;
    return const Color(0xFF00796B);
  }

  Future<void> _completeSetup() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedTown == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppStrings.get('selectMunicipality'))),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        final ref = FirebaseFirestore.instance.collection('users').doc(user.uid);
        await ref.set({
          'uid': user.uid,
          'name': _nameController.text.trim(),
          'phoneNumber': user.phoneNumber ?? '',
          'municipality': _selectedTown,
          'role': 'citizen',
          'createdAt': FieldValue.serverTimestamp(),
          'consentGiven': true,
          'consentTimestamp': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      }

      oneVizcayaState.selectedMunicipality.value = _selectedTown!;
      if (mounted) Navigator.of(context).pushReplacementNamed('/home');
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save profile: $e')),
        );
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeColor = _getMunicipalityColor(_selectedTown);
    final canProceed = _selectedTown != null &&
        _hasAcceptedPrivacy &&
        _nameController.text.trim().isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Welcome to One Vizcaya',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
        backgroundColor: activeColor,
        automaticallyImplyLeading: false,
      ),
      body: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        color: Color.lerp(Colors.white, activeColor, 0.05),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: Icon(
                      Icons.person_pin_circle_outlined,
                      key: ValueKey(activeColor.value),
                      size: 80,
                      color: activeColor,
                    ),
                  ),
                  const SizedBox(height: 24),

                  AnimatedDefaultTextStyle(
                    duration: const Duration(milliseconds: 300),
                    style: Theme.of(context).textTheme.headlineSmall!.copyWith(
                      color: activeColor,
                      fontWeight: FontWeight.bold,
                    ),
                    child: const Text(
                      'Set Up Your Profile',
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your name and municipality help us route your reports to the right LGU.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 36),

                  // ── Full Name ──
                  TextFormField(
                    controller: _nameController,
                    textCapitalization: TextCapitalization.words,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      labelText: 'Full Name *',
                      hintText: 'e.g. Juan Dela Cruz',
                      prefixIcon: Icon(Icons.person_outline, color: activeColor),
                      focusedBorder: OutlineInputBorder(
                        borderSide: BorderSide(color: activeColor, width: 2),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderSide: BorderSide(
                            color: activeColor.withValues(alpha: 0.4)),
                      ),
                      labelStyle: TextStyle(color: activeColor),
                    ),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'Please enter your full name.';
                      }
                      if (v.trim().length < 3) {
                        return 'Name must be at least 3 characters.';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),

                  // ── Municipality ──
                  DropdownButtonFormField<String>(
                    value: _selectedTown,
                    hint: Text(AppStrings.get('selectMunicipality')),
                    isExpanded: true,
                    dropdownColor: Colors.white,
                    style: const TextStyle(color: Colors.black87, fontSize: 16),
                    items: AppConstants.municipalities.map((String town) {
                      final mColor = _getMunicipalityColor(town);
                      return DropdownMenuItem<String>(
                        value: town,
                        child: Row(
                          children: [
                            Container(
                              width: 14,
                              height: 14,
                              decoration: BoxDecoration(
                                color: mColor,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                town,
                                style: TextStyle(
                                  color: Colors.black87,
                                  fontWeight: _selectedTown == town
                                      ? FontWeight.w600
                                      : FontWeight.normal,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (v) => setState(() => _selectedTown = v),
                    decoration: InputDecoration(
                      labelText: 'Municipality *',
                      prefixIcon:
                          Icon(Icons.location_city, color: activeColor),
                      focusedBorder: OutlineInputBorder(
                        borderSide: BorderSide(color: activeColor, width: 2),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderSide: BorderSide(
                            color: activeColor.withValues(alpha: 0.4)),
                      ),
                      labelStyle: TextStyle(color: activeColor),
                    ),
                    validator: (v) =>
                        v == null ? 'Please select your municipality.' : null,
                  ),
                  const SizedBox(height: 24),

                  // ── Privacy Consent ──
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Checkbox(
                        value: _hasAcceptedPrivacy,
                        activeColor: activeColor,
                        onChanged: (val) => setState(
                            () => _hasAcceptedPrivacy = val ?? false),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const PrivacyPolicyScreen(),
                            ),
                          ),
                          child: Text.rich(TextSpan(children: [
                            const TextSpan(text: 'I agree to the '),
                            TextSpan(
                              text: 'Privacy Policy',
                              style: TextStyle(
                                color: activeColor,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                            const TextSpan(text: ' (RA 10173)'),
                          ])),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // ── Complete Setup Button ──
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: canProceed
                          ? [
                              BoxShadow(
                                color: activeColor.withValues(alpha: 0.4),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ]
                          : [],
                    ),
                    child: ElevatedButton(
                      onPressed: (canProceed && !_isSaving)
                          ? _completeSetup
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            canProceed ? activeColor : Colors.grey.shade300,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: _isSaving
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Text(
                              'Complete Setup',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'You can update your name and municipality later from your Profile.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 11, color: Colors.grey.shade400),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
