import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/utils/toast_utils.dart';
import '../state/municipality_state.dart';

class EmergencyContactsScreen extends StatelessWidget {
  const EmergencyContactsScreen({super.key});

  IconData _getIconForType(String? type) {
    switch (type) {
      case 'police': return Icons.local_police;
      case 'fire': return Icons.fire_truck;
      case 'medical': return Icons.local_hospital;
      case 'disaster': return Icons.warning;
      default: return Icons.phone;
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

    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        title: Text('$activeMunicipalityName Emergency'),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('emergency_contacts')
            .where('municipality', isEqualTo: activeMunicipalityName)
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text('Error: ${snapshot.error}'));
          if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());

          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.warning_amber, size: 64, color: activeLguColor.withOpacity(0.3)),
                  const SizedBox(height: 16),
                  Text('No localized emergency contacts loaded for $activeMunicipalityName yet.'),
                ],
              ),
            );
          }

          final contacts = snapshot.data!.docs;

          return ListView.builder(
            padding: const EdgeInsets.all(8.0),
            itemCount: contacts.length,
            itemBuilder: (context, index) {
              final data = contacts[index].data() as Map<String, dynamic>;
              final name = data['name'] ?? 'Emergency';
              final number = data['number'] ?? '';
              final type = data['type'] ?? 'general';

              return Card(
                margin: const EdgeInsets.symmetric(vertical: 6.0, horizontal: 8.0),
                child: ListTile(
                  leading: Icon(_getIconForType(type), color: activeLguColor, size: 36),
                  title: Text(name, style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold)),
                  subtitle: Text(number, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 16)),
                  trailing: const Icon(Icons.call, color: Colors.green),
                  onTap: () => _makeCall(number),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
