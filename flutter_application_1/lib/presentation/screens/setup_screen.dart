import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../state/municipality_state.dart';

class MunicipalitySetupScreen extends StatefulWidget {
  const MunicipalitySetupScreen({super.key});

  @override
  _MunicipalitySetupScreenState createState() => _MunicipalitySetupScreenState();
}

class _MunicipalitySetupScreenState extends State<MunicipalitySetupScreen> {
  String? _selectedTown;

  /// Get the municipality color from themes
  Color _getMunicipalityColor(String name) {
    final theme = AppConstants.municipalityThemes[name];
    if (theme != null) {
      return theme['appBarColor'] as Color;
    }
    return const Color(0xFF616161);
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00796B);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Welcome to One Nueva Vizcaya'),
        centerTitle: true,
        backgroundColor: primaryColor,
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.location_on, size: 80, color: primaryColor),
              const SizedBox(height: 24),
              Text(
                'Select Your Municipality',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: primaryColor),
              ),
              const SizedBox(height: 12),
              Text(
                'This defines your default homepage and allows your reports to route correctly.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 48),
              DropdownButtonFormField<String>(
                initialValue: _selectedTown,
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
                              fontWeight: _selectedTown == town ? FontWeight.w600 : FontWeight.normal,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (newValue) {
                  setState(() {
                    _selectedTown = newValue;
                  });
                },
                decoration: const InputDecoration(
                  labelText: 'Municipality',
                  prefixIcon: Icon(Icons.location_city, color: primaryColor),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: primaryColor, width: 2),
                  ),
                  labelStyle: TextStyle(color: primaryColor),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _selectedTown == null
                    ? null
                    : () {
                        oneVizcayaState.selectedMunicipality.value = _selectedTown!;
                        Navigator.of(context).pushReplacementNamed('/home');
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: _selectedTown != null
                      ? _getMunicipalityColor(_selectedTown!)
                      : primaryColor,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Complete Setup'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
