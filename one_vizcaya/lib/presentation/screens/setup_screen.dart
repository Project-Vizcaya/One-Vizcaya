import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../state/municipality_state.dart';
import '../../features/auth/presentation/screens/privacy_policy_screen.dart';

class MunicipalitySetupScreen extends StatefulWidget {
  const MunicipalitySetupScreen({super.key});

  @override
  _MunicipalitySetupScreenState createState() => _MunicipalitySetupScreenState();
}

class _MunicipalitySetupScreenState extends State<MunicipalitySetupScreen> {
  String? _selectedTown;
  bool _hasAcceptedPrivacy = false;

  Color _getMunicipalityColor(String? name) {
    if (name == null) return const Color(0xFF00796B);
    final theme = AppConstants.municipalityThemes[name];
    if (theme != null) return theme['appBarColor'] as Color;
    return const Color(0xFF00796B);
  }

  @override
  Widget build(BuildContext context) {
    // ── Dynamic color based on selected municipality ──
    final activeColor = _getMunicipalityColor(_selectedTown);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Welcome to One Nueva Vizcaya',
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
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── Location Icon ──
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: Icon(
                    Icons.location_on,
                    key: ValueKey(activeColor.value),
                    size: 80,
                    color: activeColor,
                  ),
                ),
                const SizedBox(height: 24),

                // ── Title ──
                AnimatedDefaultTextStyle(
                  duration: const Duration(milliseconds: 300),
                  style: Theme.of(context).textTheme.headlineSmall!.copyWith(
                    color: activeColor,
                    fontWeight: FontWeight.bold,
                  ),
                  child: const Text(
                    'Select Your Municipality',
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'This defines your default homepage and allows your reports to route correctly.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 48),

                // ── Municipality Dropdown ──
                DropdownButtonFormField<String>(
                  value: _selectedTown,
                  hint: const Text('Select Municipality'),
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
                  onChanged: (newValue) {
                    setState(() => _selectedTown = newValue);
                  },
                  decoration: InputDecoration(
                    labelText: 'Municipality',
                    prefixIcon: Icon(Icons.location_city, color: activeColor),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: activeColor, width: 2),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: activeColor.withValues(alpha: 0.4)),
                    ),
                    labelStyle: TextStyle(color: activeColor),
                  ),
                ),

                const SizedBox(height: 24),

                // ── Privacy Consent Checkbox ──
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Checkbox(
                      value: _hasAcceptedPrivacy,
                      activeColor: activeColor,
                      onChanged: (val) =>
                          setState(() => _hasAcceptedPrivacy = val ?? false),
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

                const SizedBox(height: 16),

                // ── Complete Setup Button ──
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: (_selectedTown != null && _hasAcceptedPrivacy)
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
                    onPressed: (_selectedTown == null || !_hasAcceptedPrivacy)
                        ? null
                        : () {
                            oneVizcayaState.selectedMunicipality.value =
                                _selectedTown!;
                            Navigator.of(context).pushReplacementNamed('/home');
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          (_selectedTown != null && _hasAcceptedPrivacy)
                              ? activeColor
                              : Colors.grey.shade300,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Complete Setup',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}