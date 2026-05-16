import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../state/municipality_state.dart';
import '../../features/announcements/presentation/widgets/announcements_carousel.dart';
import '../../features/reports/presentation/widgets/community_feed.dart';
import '../../core/widgets/weather_widget.dart';

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
        final secondaryColor = (activeTheme['secondaryColor'] as Color?) ?? appBarColor;
        final welcomeMsg = activeTheme['welcomeMsg'] as String;

        return Scaffold(
          backgroundColor: Color.lerp(Colors.white, appBarColor, 0.06)!,
          body: SafeArea(
            child: _selectedNavIndex == 0
                ? _buildHomePage(context, municipality, appBarColor, secondaryColor, welcomeMsg)
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
    Color secondaryColor,
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
                Expanded(
                  child: GestureDetector(
                    onTap: () => _showMunicipalityPicker(
                      context,
                      municipality,
                      appBarColor,
                    ),
                    child: Row(
                      children: [
                        _buildSealImage(municipality, size: 28),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            municipality,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF333333),
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          Icons.keyboard_arrow_down,
                          color: Colors.grey.shade600,
                          size: 22,
                        ),
                      ],
                    ),
                  ),
                ),
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
                    icon: const Icon(
                      Icons.notifications_outlined,
                      color: Color(0xFF333333),
                      size: 22,
                    ),
                    onPressed: () =>
                        Navigator.of(context).pushNamed('/notifications'),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => Navigator.of(context).pushNamed('/profile'),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: appBarColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: appBarColor.withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.person,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Welcome Card ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
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
                  // Colored accent strip
                  Container(
                    height: 6,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [appBarColor, secondaryColor],
                      ),
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(20),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                    child: Column(
                      children: [
                        _buildSealImage(municipality, size: 72),
                        const SizedBox(height: 10),
                        Text(
                          municipality,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: appBarColor,
                            letterSpacing: 0.5,
                          ),
                          textAlign: TextAlign.center,
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
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // ── Announcements Section ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Announcements',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: appBarColor,
                  ),
                ),
                GestureDetector(
                  onTap: () =>
                      Navigator.of(context).pushNamed('/announcements'),
                  child: Text(
                    'See all',
                    style: TextStyle(
                      fontSize: 13,
                      color: appBarColor.withValues(alpha: 0.7),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          AnnouncementsCarousel(municipality: municipality),

          const SizedBox(height: 20),

          // ── Live Weather Widget ──
          WeatherWidget(municipality: municipality),

          const SizedBox(height: 24),

          // ── Citizen Services Header ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'Citizen Services',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: appBarColor,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // ── Service Grid Row 1 ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _ServiceGridItem(
                  icon: Icons.report_problem_rounded,
                  label: 'Report\nProblem',
                  iconColor: Colors.white,
                  bgColor: appBarColor,
                  onTap: () => Navigator.of(context).pushNamed('/report'),
                ),
                _ServiceGridItem(
                  icon: Icons.history_rounded,
                  label: 'My\nReports',
                  iconColor: Colors.white,
                  bgColor: secondaryColor,
                  onTap: () => Navigator.of(context).pushNamed('/status'),
                ),
                _ServiceGridItem(
                  icon: Icons.local_hospital_rounded,
                  label: 'Emergency\nContacts',
                  iconColor: Colors.white,
                  bgColor: const Color(0xFFE53935),
                  onTap: () => Navigator.of(context).pushNamed('/contacts'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ── Information & Support Header ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'Information & Support',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: appBarColor,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // ── Service Grid Row 2 ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _ServiceGridItem(
                  icon: Icons.campaign_rounded,
                  label: 'Announce\nments',
                  iconColor: Colors.white,
                  bgColor: appBarColor,
                  onTap: () =>
                      Navigator.of(context).pushNamed('/announcements'),
                ),
                _ServiceGridItem(
                  icon: Icons.help_outline_rounded,
                  label: 'Support\n& FAQs',
                  iconColor: Colors.white,
                  bgColor: const Color(0xFF00897B),
                  onTap: () => Navigator.of(context).pushNamed('/support'),
                ),
                _ServiceGridItem(
                  icon: Icons.settings_rounded,
                  label: 'App\nSettings',
                  iconColor: Colors.white,
                  bgColor: const Color(0xFF546E7A),
                  onTap: () => Navigator.of(context).pushNamed('/settings'),
                ),
              ],
            ),
          ),

          const SizedBox(height: 28),

          // ── Community Feed ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recently Resolved',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: appBarColor,
                  ),
                ),
                Text(
                  'Live',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.green.shade600,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: CommunityFeed(municipality: municipality),
              ),
            ),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildReportsPage(
    BuildContext context,
    String municipality,
    Color appBarColor,
  ) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _selectedNavIndex = 0);
      Navigator.of(context).pushNamed('/status');
    });
    return const Center(
      child: CircularProgressIndicator(color: Color(0xFF4CAF50)),
    );
  }

  Widget _buildProfileRedirect(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _selectedNavIndex = 0);
      Navigator.of(context).pushNamed('/profile');
    });
    return const Center(
      child: CircularProgressIndicator(color: Color(0xFF4CAF50)),
    );
  }

  Color _getMunicipalityColor(String name) {
    final theme = AppConstants.municipalityThemes[name];
    if (theme != null) return theme['appBarColor'] as Color;
    return const Color(0xFF616161);
  }

  static const Map<String, String> _muniSealAssets = {
    'Alfonso Castañeda': 'assets/images/seals/alfonso-castaneda.png',
    'Ambaguio': 'assets/images/seals/ambaguio.png',
    'Aritao': 'assets/images/seals/aritao.png',
    'Bagabag': 'assets/images/seals/bagabag.png',
    'Bambang': 'assets/images/seals/bambang.png',
    'Bayombong': 'assets/images/seals/bayombong.png',
    'Diadi': 'assets/images/seals/diadi.png',
    'Dupax del Norte': 'assets/images/seals/dupax-del-norte.png',
    'Dupax del Sur': 'assets/images/seals/dupax-del-sur.png',
    'Kasibu': 'assets/images/seals/kasibu.png',
    'Kayapa': 'assets/images/seals/kayapa.png',
    'Quezon': 'assets/images/seals/quezon.png',
    'Santa Fe': 'assets/images/seals/santa-fe.png',
    'Solano': 'assets/images/seals/solano.png',
    'Villaverde': 'assets/images/seals/villaverde.png',
  };

  Widget _buildSealImage(String municipality, {double size = 40}) {
    final asset = _muniSealAssets[municipality];
    if (asset == null) return const SizedBox.shrink();
    return Image.asset(
      asset,
      width: size,
      height: size,
      fit: BoxFit.contain,
      errorBuilder: (_, __, ___) => const SizedBox.shrink(),
    );
  }

  void _showMunicipalityPicker(
    BuildContext context,
    String current,
    Color appBarColor,
  ) {
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
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF333333),
              ),
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
                    leading: Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? mColor.withValues(alpha: 0.12)
                                : Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: _buildSealImage(m, size: 36),
                          ),
                        ),
                        if (isSelected)
                          Container(
                            width: 16,
                            height: 16,
                            decoration: BoxDecoration(
                              color: mColor,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.check, color: Colors.white, size: 10),
                          ),
                      ],
                    ),
                    title: Text(
                      m,
                      style: TextStyle(
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.normal,
                        color: isSelected ? mColor : const Color(0xFF333333),
                      ),
                    ),
                    tileColor: isSelected
                        ? mColor.withValues(alpha: 0.05)
                        : null,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
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
                  selectedColor: appBarColor,
                ),
                _BottomNavItem(
                  icon: Icons.camera_alt_rounded,
                  isSelected: false,
                  onTap: () => Navigator.of(context).pushNamed('/report'),
                  selectedColor: appBarColor,
                ),
                _BottomNavItem(
                  icon: Icons.grid_view_rounded,
                  isSelected: _selectedNavIndex == 2,
                  onTap: () => setState(() => _selectedNavIndex = 2),
                  selectedColor: appBarColor,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

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

class _BottomNavItem extends StatelessWidget {
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;
  final Color selectedColor;

  const _BottomNavItem({
    required this.icon,
    required this.isSelected,
    required this.onTap,
    required this.selectedColor,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isSelected ? selectedColor : Colors.transparent,
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
