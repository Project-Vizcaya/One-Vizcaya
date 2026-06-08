import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../data/services/admin_service.dart';
import '../../data/services/profile_service.dart';
import '../../domain/models/user_profile.dart';
import '../../features/auth/domain/entities/app_user.dart';
import '../../core/constants/app_constants.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/utils/toast_utils.dart';
import '../../core/widgets/profile_qr_sheet.dart';

class ProfileManagementScreen extends StatefulWidget {
  const ProfileManagementScreen({super.key});

  @override
  State<ProfileManagementScreen> createState() =>
      _ProfileManagementScreenState();
}

class _ProfileManagementScreenState extends State<ProfileManagementScreen> {
  final _auth = FirebaseAuth.instance;
  bool _isAdmin = false;
  UserRole _userRole = UserRole.citizen;
  UserProfile? _profile;
  bool _isLoading = true;

  // POLISH 4: Citizen report statistics
  bool _statsLoading = true;
  int _totalReports = 0;
  int _resolvedReports = 0;
  int _pendingReports = 0;

  // Shimmer state
  bool _shimmer = false;
  Timer? _shimmerTimer;

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _loadStats();
    // Start shimmer pulsing while loading
    _shimmerTimer = Timer.periodic(const Duration(milliseconds: 700), (_) {
      if (mounted && _statsLoading) {
        setState(() => _shimmer = !_shimmer);
      }
    });
  }

  @override
  void dispose() {
    _shimmerTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    adminService.clearCache();
    final user = _auth.currentUser;
    if (user == null) return;

    debugPrint('═══ YOUR FIREBASE UID: ${user.uid} ═══');
    final role = await adminService.getUserRole(user.uid);
    final isAdmin = role != UserRole.citizen;

    UserProfile? profile = await profileService.getProfile(user.uid);
    profile ??= UserProfile(uid: user.uid, phoneNumber: user.phoneNumber ?? '');

    if (mounted) {
      setState(() {
        _userRole = role;
        _isAdmin = isAdmin;
        _profile = profile;
        _isLoading = false;
      });
    }
  }

  // FEATURE 6: Load citizen report statistics
  Future<void> _loadStats() async {
    final user = _auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _statsLoading = false);
      return;
    }
    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('reports')
          .get();
      int total = snapshot.docs.length;
      int resolved = 0;
      int pending = 0;
      for (final doc in snapshot.docs) {
        final status = doc.data()['status'] as String? ?? '';
        if (status == 'solved') {
          resolved++;
        } else {
          pending++;
        }
      }
      if (mounted) {
        setState(() {
          _totalReports = total;
          _resolvedReports = resolved;
          _pendingReports = pending;
          _statsLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _statsLoading = false);
    }
  }

  void _showEditProfileSheet() {
    if (_profile == null) return;

    final nameController = TextEditingController(text: _profile!.name);
    final emailController = TextEditingController(text: _profile!.email);
    final locationController = TextEditingController(text: _profile!.location);
    final formKey = GlobalKey<FormState>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom +
              MediaQuery.of(context).padding.bottom + 16,
          left: 24,
          right: 24,
          top: 16,
        ),
        child: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Edit Profile',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 24),
                TextFormField(
                  controller: nameController,
                  decoration: InputDecoration(
                    labelText: 'Full Name',
                    labelStyle: TextStyle(color: Colors.grey.shade600),
                    prefixIcon: Icon(
                      Icons.person_outline,
                      color: Colors.grey.shade500,
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF7F7F7),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(
                        color: Color(0xFF4CAF50),
                        width: 1.5,
                      ),
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty)
                      return 'Please enter your name';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: 'Email Address',
                    labelStyle: TextStyle(color: Colors.grey.shade600),
                    prefixIcon: Icon(
                      Icons.email_outlined,
                      color: Colors.grey.shade500,
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF7F7F7),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(
                        color: Color(0xFF4CAF50),
                        width: 1.5,
                      ),
                    ),
                    helperText: 'Used for report status notifications',
                    helperStyle: TextStyle(
                      color: Colors.grey.shade500,
                      fontSize: 11,
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return null;
                    final emailRegex = RegExp(
                        r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$');
                    if (!emailRegex.hasMatch(v.trim())) {
                      return 'Please enter a valid email address';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue:
                      locationController.text.isNotEmpty &&
                          AppConstants.municipalities.contains(
                            locationController.text,
                          )
                      ? locationController.text
                      : null,
                  decoration: InputDecoration(
                    labelText: 'Municipality',
                    labelStyle: TextStyle(color: Colors.grey.shade600),
                    prefixIcon: Icon(
                      Icons.location_on_outlined,
                      color: Colors.grey.shade500,
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF7F7F7),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(
                        color: Color(0xFF4CAF50),
                        width: 1.5,
                      ),
                    ),
                  ),
                  items: AppConstants.municipalities.map((m) {
                    return DropdownMenuItem(value: m, child: Text(m));
                  }).toList(),
                  onChanged: (v) => locationController.text = v ?? '',
                ),
                const SizedBox(height: 28),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (!formKey.currentState!.validate()) return;
                      final updated = _profile!.copyWith(
                        name: nameController.text.trim(),
                        email: emailController.text.trim(),
                        location: locationController.text.trim(),
                      );
                      try {
                        await profileService.saveProfile(updated);
                        if (mounted) {
                          setState(() => _profile = updated);
                          Navigator.of(context).pop();
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Failed to save profile: $e')),
                          );
                        }
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4CAF50),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Save Profile',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    ).whenComplete(() {
      nameController.dispose();
      emailController.dispose();
      locationController.dispose();
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = _auth.currentUser;
    final phoneNumber = user?.phoneNumber ?? 'Not available';

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF4CAF50)),
            )
          : CustomScrollView(
              slivers: [
                // ── Top app bar ──
                SliverAppBar(
                  backgroundColor: Theme.of(context).scaffoldBackgroundColor,
                  foregroundColor: Theme.of(context).colorScheme.onSurface,
                  elevation: 0,
                  pinned: true,
                  centerTitle: true,
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  title: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5E9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.check_circle,
                          color: Color(0xFF4CAF50),
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _isAdmin
                              ? _userRole.displayName
                              : 'Verified Account',
                          style: const TextStyle(
                            color: Color(0xFF4CAF50),
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  actions: [
                    // ── QR Code Button — NOW WORKING ──
                    IconButton(
                      icon: const Icon(Icons.qr_code_rounded, size: 22),
                      tooltip: 'Show Citizen QR Code',
                      onPressed: () => ProfileQrSheet.show(context),
                    ),
                  ],
                ),

                // ── Profile Header ──
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 8,
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: const Color(0xFF4CAF50),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: const Color(
                                  0xFF4CAF50,
                                ).withValues(alpha: 0.3),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              _profile?.name.isNotEmpty == true
                                  ? _profile!.name[0].toUpperCase()
                                  : 'V',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          _profile?.name.isNotEmpty == true
                              ? _profile!.name.toUpperCase()
                              : 'ONE VIZCAYA USER',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 4),
                        GestureDetector(
                          onLongPress: () {
                            final uid = user?.uid ?? '';
                            Clipboard.setData(ClipboardData(text: uid));
                            ToastUtils.showSuccess('UID copied: $uid');
                          },
                          child: Column(
                            children: [
                              Text(
                                phoneNumber,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              Text(
                                'Long-press to copy UID',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey.shade400,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (_profile?.email.isNotEmpty == true) ...[
                          const SizedBox(height: 2),
                          Text(
                            _profile!.email,
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                        if (_profile?.location.isNotEmpty == true) ...[
                          const SizedBox(height: 2),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.location_on,
                                size: 14,
                                color: Colors.grey.shade500,
                              ),
                              const SizedBox(width: 2),
                              Flexible(
                                child: Text(
                                  _profile!.location,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade500,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1,
                                ),
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: OutlinedButton.icon(
                            onPressed: _showEditProfileSheet,
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            label: Text(AppStrings.get('editProfile')),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF4CAF50),
                              side: const BorderSide(color: Color(0xFFE0E0E0)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),

                // ── POLISH 4: Citizen Report Statistics ──
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(12, 14, 12, 16),
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 12,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Card header
                          Row(
                            children: [
                              const Icon(Icons.bar_chart,
                                  color: Color(0xFF4CAF50), size: 18),
                              const SizedBox(width: 6),
                              Text(
                                'Your Contribution',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 18),
                          // Stats area
                          if (_statsLoading)
                            // Shimmer placeholders
                            Row(
                              children: List.generate(3, (i) {
                                return Expanded(
                                  child: Padding(
                                    padding: EdgeInsets.only(
                                        right: i < 2 ? 8.0 : 0),
                                    child: AnimatedOpacity(
                                      opacity: _shimmer ? 0.3 : 0.8,
                                      duration: const Duration(
                                          milliseconds: 700),
                                      child: Container(
                                        height: 60,
                                        decoration: BoxDecoration(
                                          color: Colors.grey.shade300,
                                          borderRadius:
                                              BorderRadius.circular(12),
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }),
                            )
                          else if (_totalReports == 0)
                            // Empty state
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                  vertical: 12),
                              child: Row(
                                children: [
                                  Icon(Icons.info_outline,
                                      size: 18,
                                      color: Colors.grey.shade500),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      AppStrings.get('noReportsEmptyState'),
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey.shade600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          else ...[
                            // Count-up stat boxes
                            Row(
                              children: [
                                _StatBox(
                                  label: 'Total',
                                  value: _totalReports,
                                  bgColor: const Color(0xFFE3F2FD),
                                  valueColor: const Color(0xFF1565C0),
                                ),
                                const SizedBox(width: 8),
                                _StatBox(
                                  label: 'Resolved',
                                  value: _resolvedReports,
                                  bgColor: const Color(0xFFE8F5E9),
                                  valueColor: const Color(0xFF2E7D32),
                                ),
                                const SizedBox(width: 8),
                                _StatBox(
                                  label: 'Pending',
                                  value: _pendingReports,
                                  bgColor: const Color(0xFFFFF3E0),
                                  valueColor: const Color(0xFFE65100),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            // Resolved percentage progress bar
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: _totalReports > 0
                                    ? _resolvedReports / _totalReports
                                    : 0.0,
                                backgroundColor: Colors.grey.shade200,
                                color: const Color(0xFF4CAF50),
                                minHeight: 6,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${_totalReports > 0 ? ((_resolvedReports / _totalReports) * 100).round() : 0}% resolved',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey.shade500,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),

                // ── Profile Menu ──
                SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardColor,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 12,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(
                            left: 20,
                            top: 20,
                            bottom: 4,
                          ),
                          child: Text(
                            'PROFILE MENU',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey.shade500,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                        _ProfileMenuItem(
                          icon: Icons.description_outlined,
                          label: 'My Reports',
                          onTap: () =>
                              Navigator.of(context).pushNamed('/status'),
                        ),
                        _menuDivider(),
                        _ProfileMenuItem(
                          icon: Icons.local_hospital_outlined,
                          label: 'Emergency Contacts',
                          onTap: () =>
                              Navigator.of(context).pushNamed('/contacts'),
                        ),
                        _menuDivider(),
                        _ProfileMenuItem(
                          icon: Icons.campaign_outlined,
                          label: 'Announcements',
                          onTap: () =>
                              Navigator.of(context).pushNamed('/announcements'),
                        ),
                        _menuDivider(),
                        _ProfileMenuItem(
                          icon: Icons.help_outline,
                          label: 'Support & FAQs',
                          onTap: () =>
                              Navigator.of(context).pushNamed('/support'),
                        ),
                        _menuDivider(),

                        // ── Settings — NOW WORKING ──
                        _ProfileMenuItem(
                          icon: Icons.settings_outlined,
                          label: 'Settings',
                          onTap: () =>
                              Navigator.of(context).pushNamed('/settings'),
                        ),

                        if (_isAdmin) ...[
                          _menuDivider(),
                          _ProfileMenuItem(
                            icon: Icons.admin_panel_settings,
                            label: 'Admin Dashboard',
                            badgeText: _userRole.displayName,
                            badgeColor: _userRole == UserRole.provincialAdmin
                                ? const Color(0xFF4A148C)
                                : _userRole == UserRole.municipalAdmin
                                    ? Colors.green.shade700
                                    : const Color(0xFF5C2D91),
                            onTap: () =>
                                Navigator.of(context).pushNamed('/admin'),
                          ),
                        ],
                        _menuDivider(),
                        _ProfileMenuItem(
                          icon: Icons.logout,
                          label: 'Log Out',
                          textColor: Colors.red.shade400,
                          onTap: () async {
                            adminService.clearCache();
                            await FirebaseAuth.instance.signOut();
                            if (context.mounted) {
                              Navigator.of(context).pushNamedAndRemoveUntil(
                                '/login',
                                (route) => false,
                              );
                            }
                          },
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                ),

                // ── Bottom: QR Code shortcut ──
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                    child: GestureDetector(
                      onTap: () => ProfileQrSheet.show(context),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.qr_code_rounded,
                              size: 18,
                              color: Colors.grey.shade600,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Show My Citizen QR Code',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),

                SliverToBoxAdapter(
                  child: SizedBox(
                    height: MediaQuery.of(context).padding.bottom + 32,
                  ),
                ),
              ],
            ),
    );
  }

  Widget _menuDivider() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Divider(height: 1, color: Theme.of(context).dividerColor),
    );
  }
}

// ── POLISH 4: Stat box widget with count-up animation ────────────────────
class _StatBox extends StatelessWidget {
  final String label;
  final int value;
  final Color bgColor;
  final Color valueColor;

  const _StatBox({
    required this.label,
    required this.value,
    required this.bgColor,
    required this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TweenAnimationBuilder<int>(
              tween: IntTween(begin: 0, end: value),
              duration: const Duration(milliseconds: 800),
              curve: Curves.easeOut,
              builder: (_, animatedValue, __) => Text(
                '$animatedValue',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: valueColor,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: valueColor.withValues(alpha: 0.8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileMenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? badgeText;
  final Color? badgeColor;
  final Color? textColor;

  const _ProfileMenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.badgeText,
    this.badgeColor,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        child: Row(
          children: [
            Icon(icon,
                size: 22,
                color: textColor ?? Theme.of(context).colorScheme.onSurface),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: textColor ?? Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ),
            if (badgeText != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: badgeColor ?? Colors.green,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  badgeText!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8),
            ],
            Icon(Icons.chevron_right, size: 20, color: Colors.grey.shade400),
          ],
        ),
      ),
    );
  }
}
