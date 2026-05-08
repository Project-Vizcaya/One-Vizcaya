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

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00796B);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Welcome to One Vizcaya'),
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
                value: _selectedTown,
                hint: const Text('Select Municipality'),
                isExpanded: true,
                dropdownColor: Colors.white,
                style: const TextStyle(color: Colors.black87, fontSize: 16),
                items: AppConstants.municipalities.map((String town) {
                  return DropdownMenuItem<String>(value: town, child: Text(town));
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
                  backgroundColor: primaryColor,
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
