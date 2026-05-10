import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/utils/toast_utils.dart';
import '../state/municipality_state.dart';

class EmergencyContactsScreen extends StatelessWidget {
  const EmergencyContactsScreen({super.key});

  // 1. ADD THIS STATIC DATA MAP (No Firestore needed)
  // 1. ADD THIS STATIC DATA MAP (No Firestore needed)
  static const Map<String, List<Map<String, String>>> _localContacts = {
    'Alfonso Castañeda': [
      {
        'name': 'PNP Alfonso Castañeda',
        'number': '09193262160',
        'type': 'police',
      },
      {
        'name': 'BFP Alfonso Castañeda',
        'number': '09171112222',
        'type': 'fire',
      },
      {'name': 'MDRRMO / PDRRMO', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Ambaguio': [
      {'name': 'PNP Ambaguio', 'number': '09061675646', 'type': 'police'},
      {'name': 'BFP Ambaguio', 'number': '09171113333', 'type': 'fire'},
      {'name': 'MDRRMO / PDRRMO', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Aritao': [
      {'name': 'PNP Aritao', 'number': '09164956244', 'type': 'police'},
      {'name': 'BFP Aritao', 'number': '09171114444', 'type': 'fire'},
      {'name': 'MDRRMO Aritao', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Bagabag': [
      {'name': 'PNP Bagabag', 'number': '09175063958', 'type': 'police'},
      {'name': 'BFP Bagabag', 'number': '09171115555', 'type': 'fire'},
      {'name': 'MDRRMO Bagabag', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Bambang': [
      {'name': 'PNP Bambang', 'number': '09065630944', 'type': 'police'},
      {'name': 'BFP Bambang', 'number': '09181234567', 'type': 'fire'},
      {
        'name': 'NV Provincial Hospital',
        'number': '09228680843',
        'type': 'medical',
      },
      {'name': 'MDRRMO Bambang', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Bayombong': [
      {'name': 'PNP Bayombong', 'number': '09153116455', 'type': 'police'},
      {'name': 'BFP Bayombong', 'number': '09187654321', 'type': 'fire'},
      {
        'name': 'Nueva Vizcaya Prov. Hospital',
        'number': '09228680843',
        'type': 'medical',
      },
      {
        'name': 'PDRRMO Nueva Vizcaya',
        'number': '09171227150',
        'type': 'disaster',
      },
    ],
    'Diadi': [
      {'name': 'PNP Diadi', 'number': '09989673133', 'type': 'police'},
      {'name': 'BFP Diadi', 'number': '09171116666', 'type': 'fire'},
      {
        'name': 'Diadi Emergency Hospital',
        'number': '09228680843',
        'type': 'medical',
      },
      {'name': 'MDRRMO / PDRRMO', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Dupax del Norte': [
      {
        'name': 'PNP Dupax del Norte',
        'number': '09989673134',
        'type': 'police',
      },
      {'name': 'BFP Dupax del Norte', 'number': '09171117777', 'type': 'fire'},
      {
        'name': 'Dupax District Hospital',
        'number': '0788081178',
        'type': 'medical',
      },
      {'name': 'MDRRMO / PDRRMO', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Dupax del Sur': [
      {'name': 'PNP Dupax del Sur', 'number': '09989673135', 'type': 'police'},
      {'name': 'BFP Dupax del Sur', 'number': '09171118888', 'type': 'fire'},
      {'name': 'MDRRMO / PDRRMO', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Kasibu': [
      {'name': 'PNP Kasibu', 'number': '09055889533', 'type': 'police'},
      {'name': 'BFP Kasibu', 'number': '09171119999', 'type': 'fire'},
      {
        'name': 'Kasibu Municipal Hospital',
        'number': '09273659546',
        'type': 'medical',
      },
      {'name': 'MDRRMO Kasibu', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Kayapa': [
      {'name': 'PNP Kayapa', 'number': '09175168649', 'type': 'police'},
      {'name': 'BFP Kayapa', 'number': '09172221111', 'type': 'fire'},
      {'name': 'MDRRMO Kayapa', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Quezon': [
      {'name': 'PNP Quezon', 'number': '09351346735', 'type': 'police'},
      {'name': 'BFP Quezon', 'number': '09172223333', 'type': 'fire'},
      {'name': 'MDRRMO Quezon', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Santa Fe': [
      {'name': 'PNP Santa Fe', 'number': '09164625062', 'type': 'police'},
      {'name': 'BFP Santa Fe', 'number': '09172224444', 'type': 'fire'},
      {'name': 'MDRRMO Santa Fe', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Solano': [
      {'name': 'PNP Solano', 'number': '09274008033', 'type': 'police'},
      {'name': 'BFP Solano', 'number': '09360620305', 'type': 'fire'},
      {'name': 'R2TMC Medical', 'number': '09068195569', 'type': 'medical'},
      {'name': 'MDRRMO Solano', 'number': '09263833744', 'type': 'disaster'},
    ],
    'Villaverde': [
      {'name': 'PNP Villaverde', 'number': '09062683761', 'type': 'police'},
      {'name': 'BFP Villaverde', 'number': '09172225555', 'type': 'fire'},
      {
        'name': 'MDRRMO Villaverde',
        'number': '09171227150',
        'type': 'disaster',
      },
    ],
    'Default': [
      {
        'name': 'National Emergency Hotline',
        'number': '911',
        'type': 'general',
      },
      {'name': 'NDRRMC', 'number': '09178990098', 'type': 'disaster'},
      {
        'name': 'PDRRMO Nueva Vizcaya',
        'number': '09171227150',
        'type': 'disaster',
      },
    ],
  };

  IconData _getIconForType(String? type) {
    switch (type) {
      case 'police':
        return Icons.local_police;
      case 'fire':
        return Icons.fire_truck;
      case 'medical':
        return Icons.local_hospital;
      case 'disaster':
        return Icons.warning;
      default:
        return Icons.phone;
    }
  }

  Future<void> _makeCall(String phoneNumber) async {
    final Uri launchUri = Uri(scheme: 'tel', path: phoneNumber);
    try {
      if (await canLaunchUrl(launchUri)) {
        await launchUrl(launchUri);
      } else {
        ToastUtils.showError('Could not open dialer for $phoneNumber');
      }
    } catch (e) {
      ToastUtils.showError('Failed to make call: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeLguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;

    // 2. FETCH CONTACTS SYNCHRONOUSLY
    final contacts =
        _localContacts[activeMunicipalityName] ?? _localContacts['Default']!;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        title: Text('$activeMunicipalityName Emergency'),
      ),
      // 3. USE LISTVIEW INSTEAD OF STREAMBUILDER
      body: ListView.builder(
        padding: const EdgeInsets.all(8.0),
        itemCount: contacts.length,
        itemBuilder: (context, index) {
          final data = contacts[index];
          final name = data['name'] ?? 'Emergency';
          final number = data['number'] ?? '';
          final type = data['type'] ?? 'general';

          return Card(
            margin: const EdgeInsets.symmetric(vertical: 6.0, horizontal: 8.0),
            child: ListTile(
              leading: Icon(
                _getIconForType(type),
                color: activeLguColor,
                size: 36,
              ),
              title: Text(
                name,
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              subtitle: Text(
                number,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(fontSize: 16),
              ),
              trailing: const Icon(Icons.call, color: Colors.green),
              onTap: () => _makeCall(number),
            ),
          );
        },
      ),
    );
  }
}
