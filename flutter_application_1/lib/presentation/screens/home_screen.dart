import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../core/constants/app_constants.dart';
import '../state/municipality_state.dart';
import '../widgets/home_grid_item.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: oneVizcayaState.selectedMunicipality,
      builder: (context, municipality, child) {
        final activeTheme = oneVizcayaState.activeTheme;
        final appBarColor = activeTheme['appBarColor'] as Color;
        final welcomeMsg = activeTheme['welcomeMsg'] as String;

        return Scaffold(
          appBar: AppBar(
            backgroundColor: appBarColor,
            title: Row(
              children: [
                const Icon(Icons.location_on, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: municipality,
                      dropdownColor: appBarColor,
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      iconEnabledColor: Colors.white,
                      items: AppConstants.municipalities.map((String value) {
                        return DropdownMenuItem<String>(value: value, child: Text(value));
                      }).toList(),
                      onChanged: (String? newValue) {
                        if (newValue != null) {
                          oneVizcayaState.selectedMunicipality.value = newValue;
                        }
                      },
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.notifications),
                onPressed: () => Navigator.of(context).pushNamed('/notifications'),
              ),
              IconButton(
                icon: const Icon(Icons.account_circle),
                onPressed: () => Navigator.of(context).pushNamed('/profile'),
              ),
            ],
          ),
          body: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  color: appBarColor.withOpacity(0.1),
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                  child: Column(
                    children: [
                      Text(
                        welcomeMsg,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: appBarColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Tap an option below to engage with your municipality.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      HomeGridItem(
                        title: 'Report a Problem',
                        subtitle: 'Local problem? Report it now.',
                        icon: Icons.report_problem,
                        backgroundColor: const Color(0xFF35A551),
                        textColor: const Color(0xFF004A6D),
                        onTap: () => Navigator.of(context).pushNamed('/report'),
                      ),
                      HomeGridItem(
                        title: 'My Reports Status',
                        subtitle: 'Track status of your local reports.',
                        icon: Icons.history,
                        backgroundColor: const Color(0xFFFFBE26),
                        textColor: const Color(0xFF004A6D),
                        onTap: () => Navigator.of(context).pushNamed('/status'),
                      ),
                      HomeGridItem(
                        title: 'Emergency Contacts',
                        subtitle: 'Tap to call $municipality emergency services.',
                        icon: Icons.local_hospital,
                        backgroundColor: const Color(0xFF004A6D),
                        textColor: Colors.white,
                        onTap: () => Navigator.of(context).pushNamed('/contacts'),
                      ),
                      HomeGridItem(
                        title: 'Announcements',
                        subtitle: 'Latest news for $municipality.',
                        icon: Icons.campaign,
                        backgroundColor: const Color(0xFF006B3A),
                        textColor: Colors.white,
                        onTap: () => Navigator.of(context).pushNamed('/announcements'),
                      ),
                      HomeGridItem(
                        title: 'Support & FAQs',
                        subtitle: 'Get app help and LGU support info.',
                        icon: Icons.help_outline,
                        backgroundColor: const Color(0xFF00796B),
                        textColor: Colors.white,
                        onTap: () => Navigator.of(context).pushNamed('/support'),
                      ),
                      HomeGridItem(
                        title: 'Admin Dashboard',
                        subtitle: 'View & manage all $municipality reports.',
                        icon: Icons.admin_panel_settings,
                        backgroundColor: const Color(0xFF5C2D91),
                        textColor: Colors.white,
                        onTap: () => Navigator.of(context).pushNamed('/admin'),
                      ),
                      HomeGridItem(
                        title: 'Log Out',
                        subtitle: 'Sign out and return to login screen.',
                        icon: Icons.logout,
                        backgroundColor: const Color(0xFFFFBE26),
                        textColor: const Color(0xFF004A6D),
                        onTap: () {
                          FirebaseAuth.instance.signOut();
                          Navigator.of(context).pushReplacementNamed('/login');
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
