import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/constants/app_constants.dart';
import '../../core/l10n/app_strings.dart';
import '../state/municipality_state.dart';
import '../../features/announcements/presentation/widgets/announcements_carousel.dart';
import '../../features/reports/presentation/widgets/community_feed.dart';
import '../../core/widgets/weather_widget.dart';
import '../../data/services/offline_queue_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedNavIndex = 0;
  bool _isOffline = false;
  int _queuedReportCount = 0;

  // Municipality theme state — updated via listener instead of ValueListenableBuilder
  late String _municipality;
  late Color _appBarColor;
  late Color _secondaryColor;
  late String _welcomeMsg;

  void _syncMunicipalityTheme() {
    final theme = oneVizcayaState.activeTheme;
    _municipality = oneVizcayaState.selectedMunicipality.value;
    _appBarColor = theme['appBarColor'] as Color;
    _secondaryColor = (theme['secondaryColor'] as Color?) ?? _appBarColor;
    _welcomeMsg = theme['welcomeMsg'] as String;
  }

  void _onMunicipalityChanged() {
    if (mounted) setState(_syncMunicipalityTheme);
  }

  @override
  void initState() {
    super.initState();
    _syncMunicipalityTheme();
    oneVizcayaState.selectedMunicipality.addListener(_onMunicipalityChanged);
    _checkConnectivity();
    _refreshQueueCount();
  }

  Future<void> _onRefresh() async {
    await Future.wait([
      _checkConnectivity(),
      _refreshQueueCount(),
    ]);
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    oneVizcayaState.selectedMunicipality.removeListener(_onMunicipalityChanged);
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _refreshQueueCount();
  }

  Future<void> _checkConnectivity() async {
    try {
      await FirebaseFirestore.instance
          .collection('_ping')
          .doc('ping')
          .get(const GetOptions(source: Source.server))
          .timeout(const Duration(seconds: 5));
      if (mounted) setState(() => _isOffline = false);
    } catch (_) {
      if (mounted) setState(() => _isOffline = true);
    }
  }

  Future<void> _refreshQueueCount() async {
    final queue = await OfflineQueueService().getQueue();
    if (mounted) setState(() => _queuedReportCount = queue.length);
  }

  void _showQueueBottomSheet(BuildContext context) async {
    final queue = await OfflineQueueService().getQueue();
    if (!context.mounted) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => _QueueBottomSheet(
        queue: queue,
        onClearQueue: () async {
          await OfflineQueueService().clearQueue();
          if (ctx.mounted) Navigator.of(ctx).pop();
          _refreshQueueCount();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color.lerp(Theme.of(context).scaffoldBackgroundColor, _appBarColor, 0.10)!,
      body: SafeArea(
        child: Column(
          children: [
            // ── Offline banner ──
            if (_isOffline)
              Container(
                width: double.infinity,
                color: const Color(0xFFF57F17),
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                child: Row(
                  children: [
                    const Icon(Icons.wifi_off, color: Colors.white, size: 16, semanticLabel: 'No internet connection'),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        AppStrings.get('offlineBanner'),
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, color: Colors.white, size: 16, semanticLabel: 'Retry connection'),
                      onPressed: _checkConnectivity,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),

            // ── Queued reports banner ──
            if (_queuedReportCount > 0)
              GestureDetector(
                onTap: () => _showQueueBottomSheet(context),
                child: Container(
                  width: double.infinity,
                  color: const Color(0xFFFFF3E0),
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                  child: Row(
                    children: [
                      const Text('📤', style: TextStyle(fontSize: 14)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '$_queuedReportCount ${_queuedReportCount == 1 ? 'report' : 'reports'} queued — will submit when you\'re back online',
                          style: const TextStyle(
                            color: Color(0xFFE65100),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: Color(0xFFE65100), size: 16),
                    ],
                  ),
                ),
              ),

            Expanded(
              child: _selectedNavIndex == 0
                  ? _buildHomePage(context)
                  : _selectedNavIndex == 1
                  ? _buildReportsPage(context, _municipality, _appBarColor)
                  : _buildProfileRedirect(context),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(_appBarColor),
    );
  }

  Widget _buildHomePage(BuildContext context) {
    final municipality = _municipality;
    final appBarColor = _appBarColor;
    final secondaryColor = _secondaryColor;
    final welcomeMsg = _welcomeMsg;
    const double iconSize = 52.0;
    return SingleChildScrollView(
      physics: const ClampingScrollPhysics(),
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
                    onTap: () => _showMunicipalityPicker(context, municipality, appBarColor),
                    child: Row(
                      children: [
                        _buildSealImage(municipality, size: 28),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            municipality,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).textTheme.titleLarge?.color,
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(Icons.keyboard_arrow_down, color: Colors.grey.shade600, size: 22),
                      ],
                    ),
                  ),
                ),
                Tooltip(
                  message: 'Notifications',
                  child: Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardColor,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
                    ),
                    child: IconButton(
                      icon: Icon(Icons.notifications_outlined, color: Theme.of(context).textTheme.bodyLarge?.color, size: 22),
                      onPressed: () => Navigator.of(context).pushNamed('/notifications'),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Tooltip(
                  message: 'Profile',
                  child: GestureDetector(
                    onTap: () => Navigator.of(context).pushNamed('/profile'),
                    child: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: appBarColor,
                        shape: BoxShape.circle,
                        boxShadow: [BoxShadow(color: appBarColor.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2))],
                      ),
                      child: const Icon(Icons.person, color: Colors.white, size: 20),
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
                color: Color.lerp(Theme.of(context).cardColor, appBarColor, 0.03),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: appBarColor.withValues(alpha: 0.08), blurRadius: 16, offset: const Offset(0, 4))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    height: 6,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [appBarColor, secondaryColor]),
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                    child: Column(
                      children: [
                        _buildSealImage(municipality, size: 72),
                        const SizedBox(height: 10),
                        Text(municipality, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: appBarColor, letterSpacing: 0.5), textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        Text(welcomeMsg, textAlign: TextAlign.center, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: Theme.of(context).textTheme.bodyMedium?.color, height: 1.4)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // ── Announcements ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(AppStrings.get('announcements'), style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: appBarColor)),
                GestureDetector(
                  onTap: () => Navigator.of(context).pushNamed('/announcements'),
                  child: Text(AppStrings.get('seeAll'), style: TextStyle(fontSize: 13, color: appBarColor.withValues(alpha: 0.7), fontWeight: FontWeight.w500)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          AnnouncementsCarousel(municipality: municipality),

          const SizedBox(height: 20),

          WeatherWidget(municipality: municipality),

          const SizedBox(height: 8),

          // ── Citizen Services ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(AppStrings.get('citizenServices'), style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: appBarColor)),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(child: Center(child: _ServiceGridItem(iconContainerSize: iconSize, icon: Icons.report_problem_rounded, label: AppStrings.get('reportProblemLabel'), iconColor: Colors.white, bgColor: const Color(0xFF4CAF50), onTap: () => Navigator.of(context).pushNamed('/report')))),
                Expanded(child: Center(child: _ServiceGridItem(iconContainerSize: iconSize, icon: Icons.history_rounded, label: AppStrings.get('myReportsLabel'), iconColor: Colors.white, bgColor: const Color(0xFFFF9800), onTap: () => Navigator.of(context).pushNamed('/status')))),
                Expanded(child: Center(child: _ServiceGridItem(iconContainerSize: iconSize, icon: Icons.local_hospital_rounded, label: AppStrings.get('emergencyContactsLabel'), iconColor: Colors.white, bgColor: const Color(0xFFE53935), onTap: () => Navigator.of(context).pushNamed('/contacts')))),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // ── Information & Support ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(AppStrings.get('informationSupport'), style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: appBarColor)),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(child: Center(child: _ServiceGridItem(iconContainerSize: iconSize, icon: Icons.campaign_rounded, label: AppStrings.get('announcementsLabel'), iconColor: Colors.white, bgColor: const Color(0xFF1565C0), onTap: () => Navigator.of(context).pushNamed('/announcements')))),
                Expanded(child: Center(child: _ServiceGridItem(iconContainerSize: iconSize, icon: Icons.help_outline_rounded, label: AppStrings.get('supportFaqsLabel'), iconColor: Colors.white, bgColor: const Color(0xFF00897B), onTap: () => Navigator.of(context).pushNamed('/support')))),
                Expanded(child: Center(child: _ServiceGridItem(iconContainerSize: iconSize, icon: Icons.settings_rounded, label: AppStrings.get('appSettingsLabel'), iconColor: Colors.white, bgColor: const Color(0xFF546E7A), onTap: () => Navigator.of(context).pushNamed('/settings')))),
              ],
            ),
          ),

          const SizedBox(height: 28),

          // ── Recently Resolved ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(AppStrings.get('recentlyResolved'), style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: appBarColor)),
                Text(AppStrings.get('liveLabel'), style: TextStyle(fontSize: 13, color: Colors.green.shade600, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              decoration: BoxDecoration(
                color: Color.lerp(Theme.of(context).cardColor, appBarColor, 0.03),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: appBarColor.withValues(alpha: 0.08), blurRadius: 12, offset: const Offset(0, 4))],
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
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => Align(
        alignment: Alignment.bottomCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: AppConstants.kContentMaxWidth),
          child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).padding.bottom,
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
            Text(
              AppStrings.get('selectMunicipality'),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.titleLarge?.color,
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
                        color: isSelected
                            ? mColor
                            : Theme.of(context).textTheme.bodyLarge?.color,
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
        ),
      ),
    );
  }

  Widget _buildBottomNav(Color appBarColor) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
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
          child: Align(
            alignment: Alignment.center,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
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
        ),
      ),
    );
  }
}

// ── Queue bottom sheet ──
class _QueueBottomSheet extends StatelessWidget {
  final List<Map<String, dynamic>> queue;
  final VoidCallback onClearQueue;

  const _QueueBottomSheet({
    required this.queue,
    required this.onClearQueue,
  });

  IconData _categoryIcon(String? category) {
    switch (category?.toLowerCase()) {
      case 'road':
        return Icons.construction;
      case 'flood':
        return Icons.water;
      case 'waste':
        return Icons.delete_outline;
      case 'electricity':
        return Icons.bolt;
      default:
        return Icons.report_problem_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).padding.bottom + 16,
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
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                const Text('📤', style: TextStyle(fontSize: 18)),
                const SizedBox(width: 8),
                Text(
                  'Queued Reports (${queue.length})',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          if (queue.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'No queued reports',
                style: TextStyle(color: Colors.grey),
              ),
            )
          else
            ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.4,
              ),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: queue.length,
                itemBuilder: (context, index) {
                  final item = queue[index];
                  final category = item['category'] as String? ?? 'Report';
                  final description = item['description'] as String? ?? '';
                  return ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE65100).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        _categoryIcon(category),
                        color: const Color(0xFFE65100),
                        size: 20,
                      ),
                    ),
                    title: Text(
                      category,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    subtitle: description.isNotEmpty
                        ? Text(
                            description,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          )
                        : null,
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF9800).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: const Color(0xFFFF9800).withValues(alpha: 0.4),
                        ),
                      ),
                      child: const Text(
                        'Pending',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFE65100),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          const Divider(height: 1),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              onPressed: queue.isEmpty ? null : onClearQueue,
              icon: const Icon(Icons.delete_outline, color: Color(0xFFE53935)),
              label: const Text(
                'Clear Queue',
                style: TextStyle(color: Color(0xFFE53935)),
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 48),
                side: const BorderSide(color: Color(0xFFE53935)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
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
  final double iconContainerSize;

  const _ServiceGridItem({
    required this.icon,
    required this.label,
    required this.iconColor,
    required this.bgColor,
    required this.onTap,
    this.iconContainerSize = 52.0,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 92),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: iconContainerSize,
              height: iconContainerSize,
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
              child: ExcludeSemantics(child: Icon(icon, color: iconColor, size: iconContainerSize * 0.46)),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: Theme.of(context).textTheme.bodySmall?.color,
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
