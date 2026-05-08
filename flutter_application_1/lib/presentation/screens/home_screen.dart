import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../state/municipality_state.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedNavIndex = 0;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: oneVizcayaState.selectedMunicipality,
      builder: (context, municipality, child) {
        final activeTheme = oneVizcayaState.activeTheme;
        final appBarColor = activeTheme['appBarColor'] as Color;
        final welcomeMsg = activeTheme['welcomeMsg'] as String;

        return Scaffold(
          backgroundColor: Color.lerp(Colors.white, appBarColor, 0.06)!,
          body: SafeArea(
            child: _selectedNavIndex == 0
                ? _buildHomePage(context, municipality, appBarColor, welcomeMsg)
                : _selectedNavIndex == 1
                    ? _buildReportsPage(context, municipality, appBarColor)
                    : _buildProfileRedirect(context),
          ),
          bottomNavigationBar: _buildBottomNav(appBarColor),
        );
      },
    );
  }

  Widget _buildHomePage(
    BuildContext context,
    String municipality,
    Color appBarColor,
    String welcomeMsg,
  ) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Top bar ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                // Municipality selector
                Expanded(
                  child: GestureDetector(
                    onTap: () => _showMunicipalityPicker(context, municipality, appBarColor),
                    child: Row(
                      children: [
                        Text(
                          municipality,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF333333),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(Icons.keyboard_arrow_down, color: Colors.grey.shade600, size: 22),
                      ],
                    ),
                  ),
                ),
                // Notification icon
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.notifications_outlined, color: Color(0xFF333333), size: 22),
                    onPressed: () => Navigator.of(context).pushNamed('/notifications'),
                  ),
                ),
                const SizedBox(width: 8),
                // Profile icon
                GestureDetector(
                  onTap: () => Navigator.of(context).pushNamed('/profile'),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFF4CAF50),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF4CAF50).withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.person, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ),

          // ── Welcome Card ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: appBarColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        municipality,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: appBarColor,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    welcomeMsg,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF555555),
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // ── Services Section ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Services',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF333333),
                  ),
                ),
                GestureDetector(
                  onTap: () {},
                  child: Text(
                    'See all',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade500,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Service Grid (row 1) ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _ServiceGridItem(
                  icon: Icons.report_problem_rounded,
                  label: 'Report\nProblem',
                  iconColor: Colors.white,
                  bgColor: const Color(0xFF4CAF50),
                  onTap: () => Navigator.of(context).pushNamed('/report'),
                ),
                _ServiceGridItem(
                  icon: Icons.history_rounded,
                  label: 'My\nReports',
                  iconColor: Colors.white,
                  bgColor: const Color(0xFFFF9800),
                  onTap: () => Navigator.of(context).pushNamed('/status'),
                ),
                _ServiceGridItem(
                  icon: Icons.local_hospital_rounded,
                  label: 'Emergency\nContacts',
                  iconColor: Colors.white,
                  bgColor: const Color(0xFFE53935),
                  onTap: () => Navigator.of(context).pushNamed('/contacts'),
                ),
                _ServiceGridItem(
                  icon: Icons.campaign_rounded,
                  label: 'Announce\nments',
                  iconColor: Colors.white,
                  bgColor: const Color(0xFF1565C0),
                  onTap: () => Navigator.of(context).pushNamed('/announcements'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Service Grid (row 2) ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _ServiceGridItem(
                  icon: Icons.help_outline_rounded,
                  label: 'Support\n& FAQs',
                  iconColor: Colors.white,
                  bgColor: const Color(0xFF00897B),
                  onTap: () => Navigator.of(context).pushNamed('/support'),
                ),
                _ServiceGridItem(
                  icon: Icons.notifications_rounded,
                  label: 'Notifi\ncations',
                  iconColor: Colors.white,
                  bgColor: const Color(0xFF7B1FA2),
                  onTap: () => Navigator.of(context).pushNamed('/notifications'),
                ),
                _ServiceGridItem(
                  icon: Icons.settings_rounded,
                  label: 'App\nSettings',
                  iconColor: Colors.white,
                  bgColor: const Color(0xFF546E7A),
                  onTap: () {},
                ),
                const SizedBox(width: 72), // Spacer for alignment
              ],
            ),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildReportsPage(BuildContext context, String municipality, Color appBarColor) {
    // Quick redirect to the reports status screen
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.of(context).pushNamed('/status');
      setState(() => _selectedNavIndex = 0);
    });
    return const Center(child: CircularProgressIndicator(color: Color(0xFF4CAF50)));
  }

  Widget _buildProfileRedirect(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.of(context).pushNamed('/profile');
      setState(() => _selectedNavIndex = 0);
    });
    return const Center(child: CircularProgressIndicator(color: Color(0xFF4CAF50)));
  }

  /// Get a municipality's theme color
  Color _getMunicipalityColor(String name) {
    final theme = AppConstants.municipalityThemes[name];
    if (theme != null) return theme['appBarColor'] as Color;
    return const Color(0xFF616161);
  }

  void _showMunicipalityPicker(BuildContext context, String current, Color appBarColor) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Select Municipality',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF333333)),
            ),
            const SizedBox(height: 8),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: AppConstants.municipalities.length,
                itemBuilder: (context, index) {
                  final m = AppConstants.municipalities[index];
                  final isSelected = m == current;
                  final mColor = _getMunicipalityColor(m);
                  return ListTile(
                    leading: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: isSelected ? mColor : mColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: isSelected
                          ? const Icon(Icons.check, color: Colors.white, size: 18)
                          : null,
                    ),
                    title: Text(
                      m,
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        color: isSelected ? mColor : const Color(0xFF333333),
                      ),
                    ),
                    tileColor: isSelected ? mColor.withValues(alpha: 0.05) : null,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    onTap: () {
                      oneVizcayaState.selectedMunicipality.value = m;
                      Navigator.of(context).pop();
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNav(Color appBarColor) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF333333),
              borderRadius: BorderRadius.circular(28),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _BottomNavItem(
                  icon: Icons.home_rounded,
                  isSelected: _selectedNavIndex == 0,
                  onTap: () => setState(() => _selectedNavIndex = 0),
                ),
                _BottomNavItem(
                  icon: Icons.camera_alt_rounded,
                  isSelected: false,
                  onTap: () => Navigator.of(context).pushNamed('/report'),
                ),
                _BottomNavItem(
                  icon: Icons.grid_view_rounded,
                  isSelected: _selectedNavIndex == 2,
                  onTap: () => setState(() => _selectedNavIndex = 2),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}



// ── Service grid icon item (circular icon + label) ──
class _ServiceGridItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color iconColor;
  final Color bgColor;
  final VoidCallback onTap;

  const _ServiceGridItem({
    required this.icon,
    required this.label,
    required this.iconColor,
    required this.bgColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 72,
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: bgColor.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Icon(icon, color: iconColor, size: 24),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: Color(0xFF555555),
                height: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Bottom nav item ──
class _BottomNavItem extends StatelessWidget {
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _BottomNavItem({
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF4CAF50) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Icon(
          icon,
          color: isSelected ? Colors.white : Colors.grey.shade500,
          size: 24,
        ),
      ),
    );
  }
}
