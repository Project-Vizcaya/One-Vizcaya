import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/utils/toast_utils.dart';
import '../state/municipality_state.dart';

class EmergencyContactsScreen extends StatelessWidget {
  const EmergencyContactsScreen({super.key});

  // National hotlines shown for every municipality
  static const List<Map<String, String>> _nationalHotlines = [
    {
      'name': 'National Emergency Hotline',
      'number': '911',
      'type': 'general',
    },
    {
      'name': 'NDRRMC Operations Center',
      'number': '02-8911-5061',
      'type': 'disaster',
    },
    {
      'name': 'NDRRMC Hotline',
      'number': '09178990098',
      'type': 'disaster',
    },
    {
      'name': 'DPWH – Region II Hotline',
      'number': '078-396-0796',
      'type': 'infrastructure',
    },
    {
      'name': 'DPWH Nueva Vizcaya DEO',
      'number': '09175000100',
      'type': 'infrastructure',
    },
    {
      'name': 'PDRRMO Nueva Vizcaya',
      'number': '09171227150',
      'type': 'disaster',
    },
  ];

  static const Map<String, List<Map<String, String>>> _localContacts = {
    'Alfonso Castañeda': [
      {'name': 'PNP Alfonso Castañeda', 'number': '09193262160', 'type': 'police'},
      {'name': 'BFP Alfonso Castañeda', 'number': '09171112222', 'type': 'fire'},
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
      {'name': 'BFP Bambang', 'number': '09175444946', 'type': 'fire'},
      {'name': 'NV Provincial Hospital', 'number': '09228680843', 'type': 'medical'},
      {'name': 'MDRRMO Bambang', 'number': '09175861838', 'type': 'disaster'},
    ],
    'Bayombong': [
      {'name': 'PNP Bayombong', 'number': '09153116455', 'type': 'police'},
      {'name': 'BFP Bayombong', 'number': '09187654321', 'type': 'fire'},
      {'name': 'Nueva Vizcaya Prov. Hospital', 'number': '09228680843', 'type': 'medical'},
      {'name': 'PDRRMO Nueva Vizcaya', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Diadi': [
      {'name': 'PNP Diadi', 'number': '09989673133', 'type': 'police'},
      {'name': 'BFP Diadi', 'number': '09171116666', 'type': 'fire'},
      {'name': 'Diadi Emergency Hospital', 'number': '09228680843', 'type': 'medical'},
      {'name': 'MDRRMO / PDRRMO', 'number': '09171227150', 'type': 'disaster'},
    ],
    'Dupax del Norte': [
      {'name': 'PNP Dupax del Norte', 'number': '09989673134', 'type': 'police'},
      {'name': 'BFP Dupax del Norte', 'number': '09171117777', 'type': 'fire'},
      {'name': 'Dupax District Hospital', 'number': '0788081178', 'type': 'medical'},
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
      {'name': 'Kasibu Municipal Hospital', 'number': '09273659546', 'type': 'medical'},
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
      {'name': 'MDRRMO Villaverde', 'number': '09171227150', 'type': 'disaster'},
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
      case 'infrastructure':
        return Icons.construction;
      default:
        return Icons.phone;
    }
  }

  String _getSemanticLabelForType(String? type) {
    switch (type) {
      case 'police':
        return 'Police';
      case 'fire':
        return 'Fire';
      case 'medical':
        return 'Medical';
      case 'disaster':
        return 'Disaster';
      case 'infrastructure':
        return 'Infrastructure';
      default:
        return 'Emergency';
    }
  }

  Color _getColorForType(String? type, Color lguColor) {
    switch (type) {
      case 'police':
        return const Color(0xFF1565C0);
      case 'fire':
        return const Color(0xFFD32F2F);
      case 'medical':
        return const Color(0xFF2E7D32);
      case 'disaster':
        return const Color(0xFFE65100);
      case 'infrastructure':
        return const Color(0xFF6A1B9A);
      default:
        return lguColor;
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

  Widget _buildSectionHeader(String title, Color lguColor) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 16, 8, 6),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 18,
            decoration: BoxDecoration(
              color: lguColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: lguColor,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactTile(
    Map<String, String> data,
    Color lguColor,
    BuildContext context,
  ) {
    final name = data['name'] ?? 'Emergency';
    final number = data['number'] ?? '';
    final type = data['type'] ?? 'general';
    final iconColor = _getColorForType(type, lguColor);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      child: ListTile(
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(_getIconForType(type), color: iconColor, size: 22, semanticLabel: _getSemanticLabelForType(type)),
        ),
        title: Text(
          name,
          style: Theme.of(context)
              .textTheme
              .bodyLarge
              ?.copyWith(fontWeight: FontWeight.bold, fontSize: 14),
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
        ),
        subtitle: Text(
          number,
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(fontSize: 15, color: Colors.grey.shade700),
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
        ),
        trailing: Tooltip(
          message: 'Call',
          child: Container(
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: IconButton(
              icon: const Icon(Icons.call, color: Colors.green),
              onPressed: () => _makeCall(number),
            ),
          ),
        ),
        onTap: () => _makeCall(number),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeLguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;

    final localContacts = _localContacts[activeMunicipalityName] ?? [];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        foregroundColor: Colors.white,
        title: Text('$activeMunicipalityName Emergency'),
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).padding.bottom + 32,
          ),
          children: [
            // ── Local contacts ──
            if (localContacts.isNotEmpty) ...[
              _buildSectionHeader(
                  '$activeMunicipalityName Local Contacts', activeLguColor),
              ...localContacts.map(
                  (c) => _buildContactTile(c, activeLguColor, context)),
            ],

            // ── National / Provincial hotlines ──
            _buildSectionHeader(
                'National & Provincial Hotlines', activeLguColor),
            ..._nationalHotlines.map(
                (c) => _buildContactTile(c, activeLguColor, context)),
          ],
        ),
      ),
    );
  }
}
