import 'package:flutter/material.dart';
import '../state/municipality_state.dart';

class AnnouncementsScreen extends StatelessWidget {
  const AnnouncementsScreen({super.key});

  static final List<Map<String, String>> _allAnnouncements = [
    {
      'municipality': 'Bambang',
      'title': 'Community Agri-Fair',
      'date': 'Oct 30',
      'body': 'Join the Bambang town plaza for the local agricultural produce fair! 8AM-5PM.',
    },
    {
      'municipality': 'Solano',
      'title': 'Public Market Drainage Upgrade',
      'date': 'Oct 28',
      'body': 'Maintenance ongoing on market drainage; Expect temporary road closures around Solano market area.',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final activeLguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final activeMunicipalityName = oneVizcayaState.selectedMunicipality.value;

    final localizedAnnouncements = _allAnnouncements
        .where((a) => a['municipality'] == activeMunicipalityName)
        .toList();

    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        title: Text('Announcements: $activeMunicipalityName'),
      ),
      body: localizedAnnouncements.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.campaign, size: 64, color: activeLguColor.withOpacity(0.3)),
                  const SizedBox(height: 16),
                  Text('No recent announcements for $activeMunicipalityName.'),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(8.0),
              itemCount: localizedAnnouncements.length,
              itemBuilder: (context, index) {
                final announcement = localizedAnnouncements[index];
                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 8.0),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              announcement['title']!,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: activeLguColor,
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            Text(
                              announcement['date']!,
                              style: const TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Divider(),
                        const SizedBox(height: 8),
                        Text(
                          announcement['body']!,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final activeLguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: activeLguColor,
        title: const Text('Support & FAQs'),
      ),
      body: Center(child: Text('Support screen under construction.', style: TextStyle(color: activeLguColor))),
    );
  }
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: const Center(child: Text('No new notifications.')),
    );
  }
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Profile')),
      body: const Center(child: Text('Profile management coming soon.')),
    );
  }
}
