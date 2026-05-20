import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/l10n/app_strings.dart';
import '../state/municipality_state.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/toast_utils.dart';

class AppSettingsScreen extends StatefulWidget {
  const AppSettingsScreen({super.key});

  @override
  State<AppSettingsScreen> createState() => _AppSettingsScreenState();
}

class _AppSettingsScreenState extends State<AppSettingsScreen> {
  bool _notificationsEnabled = true;
  bool _locationEnabled = true;
  bool _offlineModeEnabled = false;
  bool _highContrastMode = false;
  String _selectedLanguage = 'English';
  // Internal sort order key stored in prefs (language-independent)
  String _reportSortKey = 'newestFirst';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;
      _locationEnabled = prefs.getBool('location_enabled') ?? true;
      _offlineModeEnabled = prefs.getBool('offline_mode') ?? false;
      _highContrastMode = prefs.getBool('high_contrast') ?? false;
      _selectedLanguage = prefs.getString('language') ?? 'English';
      _reportSortKey = prefs.getString('report_sort') ?? 'newestFirst';
    });
  }

  Future<void> _saveSetting(String key, dynamic value) async {
    final prefs = await SharedPreferences.getInstance();
    if (value is bool) await prefs.setBool(key, value);
    if (value is String) await prefs.setString(key, value);
    ToastUtils.showSuccess('Setting saved');
  }

  Color get _lguColor => oneVizcayaState.activeTheme['appBarColor'] as Color;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F7),
      appBar: AppBar(
        backgroundColor: _lguColor,
        foregroundColor: Colors.white,
        title: const Text(
          'App Settings',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Notifications ──
            _SectionHeader(label: 'NOTIFICATIONS'),
            _SettingsCard(
              children: [
                _ToggleTile(
                  icon: Icons.notifications_outlined,
                  iconColor: const Color(0xFF7B1FA2),
                  title: AppStrings.get('pushNotifications'),
                  subtitle: AppStrings.get('pushNotifSubtitle'),
                  value: _notificationsEnabled,
                  onChanged: (val) {
                    setState(() => _notificationsEnabled = val);
                    _saveSetting('notifications_enabled', val);
                  },
                ),
              ],
            ),

            // ── Location & Privacy ──
            _SectionHeader(label: 'LOCATION & PRIVACY'),
            _SettingsCard(
              children: [
                _ToggleTile(
                  icon: Icons.location_on_outlined,
                  iconColor: const Color(0xFF1565C0),
                  title: AppStrings.get('locationServices'),
                  subtitle: AppStrings.get('locationSubtitle'),
                  value: _locationEnabled,
                  onChanged: (val) {
                    setState(() => _locationEnabled = val);
                    _saveSetting('location_enabled', val);
                  },
                ),
                _DividerLine(),
                _NavigationTile(
                  icon: Icons.privacy_tip_outlined,
                  iconColor: const Color(0xFF2E7D32),
                  title: AppStrings.get('privacyPolicy'),
                  subtitle: AppStrings.get('privacyPolicySubtitle'),
                  onTap: () => Navigator.of(context).pushNamed('/privacy'),
                ),
                _DividerLine(),
                _NavigationTile(
                  icon: Icons.delete_outline,
                  iconColor: const Color(0xFFE53935),
                  title: AppStrings.get('deleteAccount'),
                  subtitle: AppStrings.get('deleteAccountSubtitle'),
                  onTap: () => _showDeleteAccountDialog(context),
                ),
              ],
            ),

            // ── Offline & Data ──
            _SectionHeader(label: 'OFFLINE & DATA'),
            _SettingsCard(
              children: [
                _ToggleTile(
                  icon: Icons.offline_bolt_outlined,
                  iconColor: const Color(0xFFE65100),
                  title: AppStrings.get('offlineModeLabel'),
                  subtitle: AppStrings.get('offlineModeSubtitle'),
                  value: _offlineModeEnabled,
                  onChanged: (val) {
                    setState(() => _offlineModeEnabled = val);
                    _saveSetting('offline_mode', val);
                  },
                ),
                _DividerLine(),
                _NavigationTile(
                  icon: Icons.cleaning_services_outlined,
                  iconColor: const Color(0xFF546E7A),
                  title: AppStrings.get('clearCache'),
                  subtitle: AppStrings.get('clearCacheSubtitle'),
                  onTap: () => _showClearCacheDialog(context),
                ),
              ],
            ),

            // ── Reports ──
            _SectionHeader(label: 'REPORTS'),
            _SettingsCard(
              children: [
                _DropdownTile(
                  icon: Icons.sort,
                  iconColor: const Color(0xFF00897B),
                  title: AppStrings.get('defaultSortOrder'),
                  subtitle: AppStrings.get('sortSubtitle'),
                  value: _reportSortKey,
                  // FIX 8: Must match sort logic in home_screen.dart / report_status_screen.dart
                  options: const ['newestFirst', 'oldestFirst', 'highestPriority'],
                  displayLabels: {
                    'newestFirst': AppStrings.get('newestFirst'),
                    'oldestFirst': AppStrings.get('oldestFirst'),
                    'highestPriority': AppStrings.get('highestPriority'),
                  },
                  onChanged: (val) {
                    if (val != null) {
                      setState(() => _reportSortKey = val);
                      _saveSetting('report_sort', val);
                    }
                  },
                  lguColor: _lguColor,
                ),
              ],
            ),

            // ── Accessibility ──
            _SectionHeader(label: 'ACCESSIBILITY'),
            _SettingsCard(
              children: [
                _ToggleTile(
                  icon: Icons.contrast,
                  iconColor: const Color(0xFF333333),
                  title: AppStrings.get('highContrast'),
                  subtitle: AppStrings.get('highContrastSubtitle'),
                  value: _highContrastMode,
                  onChanged: (val) {
                    setState(() => _highContrastMode = val);
                    _saveSetting('high_contrast', val);
                    ToastUtils.showInfo(
                      'Restart the app to apply contrast changes',
                    );
                  },
                ),
                _DividerLine(),
                _DropdownTile(
                  icon: Icons.language,
                  iconColor: const Color(0xFF1565C0),
                  title: AppStrings.get('language'),
                  subtitle: AppStrings.get('languageSubtitle'),
                  value: _selectedLanguage,
                  options: const ['English', 'Tagalog'],
                  onChanged: (newValue) {
                    if (newValue != null) {
                      oneVizcayaState.setLanguage(newValue);
                      setState(() => _selectedLanguage = newValue);
                    }
                  },
                  lguColor: _lguColor,
                ),
              ],
            ),

            // ── About ──
            _SectionHeader(label: 'ABOUT'),
            _SettingsCard(
              children: [
                _InfoTile(
                  icon: Icons.info_outline,
                  iconColor: _lguColor,
                  title: 'App Version',
                  value: AppConstants.appVersionDisplay,
                ),
                _DividerLine(),
                _InfoTile(
                  icon: Icons.person_outline,
                  iconColor: _lguColor,
                  title: 'Developer',
                  value: 'Aaron Anthony A. Gano II',
                ),
                _DividerLine(),
                _InfoTile(
                  icon: Icons.school_outlined,
                  iconColor: _lguColor,
                  title: 'Institution',
                  value: 'Nueva Vizcaya State University',
                ),
                _DividerLine(),
                _NavigationTile(
                  icon: Icons.star_outline,
                  iconColor: const Color(0xFFFFB300),
                  title: 'Rate One Vizcaya',
                  subtitle: 'Leave a review on the Play Store',
                  onTap: () =>
                      ToastUtils.showInfo('Play Store listing coming soon'),
                ),
              ],
            ),

            const SizedBox(height: 32),

            // ── Reset Button ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: OutlinedButton.icon(
                onPressed: () => _showResetDialog(context),
                icon: const Icon(Icons.restart_alt, color: Color(0xFFE53935)),
                label: const Text(
                  'Reset All Settings',
                  style: TextStyle(color: Color(0xFFE53935)),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFE53935)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 64),
          ],
        ),
      ),
    );
  }

  void _showClearCacheDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Clear Cache'),
        content: const Text(
          'This will clear all locally cached data. Your reports and account will not be affected.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.remove('last_sms_sent');
              Navigator.pop(ctx);
              ToastUtils.showSuccess('Cache cleared successfully');
            },
            style: ElevatedButton.styleFrom(backgroundColor: _lguColor),
            child: const Text('Clear', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Account'),
        content: const Text(
          'To delete your account and all associated data, please contact the LGU administrator. '
          'Your request will be processed within 30 days per RA 10173.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ToastUtils.showInfo(
                'Contact PDRRMO at 09178500670 to request deletion',
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE53935),
            ),
            child: const Text('Got it', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showResetDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Reset Settings'),
        content: const Text(
          'This will restore all settings to their default values. Your account and reports will not be affected.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.remove('notifications_enabled');
              await prefs.remove('location_enabled');
              await prefs.remove('offline_mode');
              await prefs.remove('high_contrast');
              await prefs.remove('language');
              await prefs.remove('report_sort');
              Navigator.pop(ctx);
              _loadSettings();
              ToastUtils.showSuccess('Settings reset to defaults');
            },
            style: ElevatedButton.styleFrom(backgroundColor: _lguColor),
            child: const Text('Reset', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════
// REUSABLE SETTINGS WIDGETS
// ═══════════════════════════════════════════

class _SectionHeader extends StatelessWidget {
  final String label;
  const _SectionHeader({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: Colors.grey.shade500,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  final List<Widget> children;
  const _SettingsCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }
}

class _DividerLine extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Divider(height: 1, indent: 56, color: Colors.grey.shade100);
  }
}

class _ToggleTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _ToggleTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: iconColor, size: 18),
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeColor: oneVizcayaState.activeTheme['appBarColor'] as Color,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }
}

class _NavigationTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _NavigationTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: iconColor, size: 18),
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Icon(
        Icons.arrow_forward_ios,
        size: 14,
        color: Colors.grey.shade400,
      ),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String value;

  const _InfoTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: iconColor, size: 18),
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
      trailing: Text(
        value,
        style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }
}

class _DropdownTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final String value;
  final List<String> options;
  // Optional map of option value → display label (for translated options)
  final Map<String, String>? displayLabels;
  final ValueChanged<String?> onChanged;
  final Color lguColor;

  const _DropdownTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.options,
    this.displayLabels,
    required this.onChanged,
    required this.lguColor,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: iconColor, size: 18),
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
      ),
      trailing: DropdownButton<String>(
        value: value,
        underline: const SizedBox(),
        style: TextStyle(
          fontSize: 12,
          color: lguColor,
          fontWeight: FontWeight.w600,
        ),
        items: options
            .map((o) => DropdownMenuItem(
                  value: o,
                  child: Text(displayLabels?[o] ?? o),
                ))
            .toList(),
        onChanged: onChanged,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }
}
