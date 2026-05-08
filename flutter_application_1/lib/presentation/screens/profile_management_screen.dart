import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../data/services/admin_service.dart';
import '../../data/services/profile_service.dart';
import '../../domain/models/user_profile.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/toast_utils.dart';

class ProfileManagementScreen extends StatefulWidget {
  const ProfileManagementScreen({super.key});

  @override
  State<ProfileManagementScreen> createState() => _ProfileManagementScreenState();
}

class _ProfileManagementScreenState extends State<ProfileManagementScreen> {
  final _auth = FirebaseAuth.instance;
  bool _isAdmin = false;
  UserProfile? _profile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final user = _auth.currentUser;
    if (user == null) return;

    // Check admin status
    debugPrint('═══ YOUR FIREBASE UID: ${user.uid} ═══');
    final isAdmin = await adminService.isAdmin(user.uid);

    // Load profile from Firestore
    UserProfile? profile = await profileService.getProfile(user.uid);

    // If no profile exists yet, create one with phone number from Auth
    profile ??= UserProfile(
      uid: user.uid,
      phoneNumber: user.phoneNumber ?? '',
    );

    if (mounted) {
      setState(() {
        _isAdmin = isAdmin;
        _profile = profile;
        _isLoading = false;
      });
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
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
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
                // Drag handle
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
                const Text(
                  'Edit Profile',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF333333),
                  ),
                ),
                const SizedBox(height: 24),
                // Name
                TextFormField(
                  controller: nameController,
                  decoration: InputDecoration(
                    labelText: 'Full Name',
                    labelStyle: TextStyle(color: Colors.grey.shade600),
                    prefixIcon: Icon(Icons.person_outline, color: Colors.grey.shade500),
                    filled: true,
                    fillColor: const Color(0xFFF7F7F7),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFF4CAF50), width: 1.5),
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Please enter your name';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                // Email
                TextFormField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: 'Email Address',
                    labelStyle: TextStyle(color: Colors.grey.shade600),
                    prefixIcon: Icon(Icons.email_outlined, color: Colors.grey.shade500),
                    filled: true,
                    fillColor: const Color(0xFFF7F7F7),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFF4CAF50), width: 1.5),
                    ),
                    helperText: 'Used for report status notifications',
                    helperStyle: TextStyle(color: Colors.grey.shade500, fontSize: 11),
                  ),
                  validator: (v) {
                    if (v != null && v.isNotEmpty && !v.contains('@')) {
                      return 'Please enter a valid email';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                // Location
                DropdownButtonFormField<String>(
                  initialValue: locationController.text.isNotEmpty &&
                          AppConstants.municipalities.contains(locationController.text)
                      ? locationController.text
                      : null,
                  decoration: InputDecoration(
                    labelText: 'Municipality',
                    labelStyle: TextStyle(color: Colors.grey.shade600),
                    prefixIcon: Icon(Icons.location_on_outlined, color: Colors.grey.shade500),
                    filled: true,
                    fillColor: const Color(0xFFF7F7F7),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFF4CAF50), width: 1.5),
                    ),
                  ),
                  items: AppConstants.municipalities.map((m) {
                    return DropdownMenuItem(value: m, child: Text(m));
                  }).toList(),
                  onChanged: (v) => locationController.text = v ?? '',
                ),
                const SizedBox(height: 28),
                // Save button
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

                      await profileService.saveProfile(updated);

                      if (mounted) {
                        setState(() => _profile = updated);
                        Navigator.of(context).pop();
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
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = _auth.currentUser;
    final phoneNumber = user?.phoneNumber ?? 'Not available';

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF4CAF50)))
          : CustomScrollView(
              slivers: [
                // ── Top app bar ──
                SliverAppBar(
                  backgroundColor: const Color(0xFFF5F5F5),
                  foregroundColor: const Color(0xFF333333),
                  elevation: 0,
                  pinned: true,
                  centerTitle: true,
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  title: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5E9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle, color: Color(0xFF4CAF50), size: 16),
                        const SizedBox(width: 6),
                        Text(
                          _isAdmin ? 'Admin Account' : 'Verified Account',
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
                    IconButton(
                      icon: const Icon(Icons.qr_code_rounded, size: 22),
                      onPressed: () => ToastUtils.showInfo('QR code feature coming soon'),
                    ),
                  ],
                ),

                // ── Profile Header ──
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                    child: Column(
                      children: [
                        // Avatar
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: const Color(0xFF4CAF50),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF4CAF50).withValues(alpha: 0.3),
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
                        // Name
                        Text(
                          _profile?.name.isNotEmpty == true
                              ? _profile!.name.toUpperCase()
                              : 'ONE VIZCAYA USER',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF333333),
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 4),
                        // Phone (tap to copy UID)
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
                        // Email
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
                        // Location
                        if (_profile?.location.isNotEmpty == true) ...[
                          const SizedBox(height: 2),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.location_on, size: 14, color: Colors.grey.shade500),
                              const SizedBox(width: 2),
                              Text(
                                _profile!.location,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade500,
                                ),
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 16),
                        // Edit Profile button
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: OutlinedButton.icon(
                            onPressed: _showEditProfileSheet,
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            label: const Text('Edit Profile'),
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

                // ── Profile Menu ──
                SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
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
                        // Section label
                        Padding(
                          padding: const EdgeInsets.only(left: 20, top: 20, bottom: 4),
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

                        // ── Menu items ──

                        // My Reports
                        _ProfileMenuItem(
                          icon: Icons.description_outlined,
                          label: 'My Reports',
                          onTap: () => Navigator.of(context).pushNamed('/status'),
                        ),
                        _menuDivider(),

                        // Emergency Contacts
                        _ProfileMenuItem(
                          icon: Icons.local_hospital_outlined,
                          label: 'Emergency Contacts',
                          onTap: () => Navigator.of(context).pushNamed('/contacts'),
                        ),
                        _menuDivider(),

                        // Announcements
                        _ProfileMenuItem(
                          icon: Icons.campaign_outlined,
                          label: 'Announcements',
                          onTap: () => Navigator.of(context).pushNamed('/announcements'),
                        ),
                        _menuDivider(),

                        // Support
                        _ProfileMenuItem(
                          icon: Icons.help_outline,
                          label: 'Support & FAQs',
                          onTap: () => Navigator.of(context).pushNamed('/support'),
                        ),
                        _menuDivider(),

                        // Settings
                        _ProfileMenuItem(
                          icon: Icons.settings_outlined,
                          label: 'Settings',
                          onTap: () => ToastUtils.showInfo('Settings coming soon'),
                        ),

                        // ── Admin Dashboard (admin only) ──
                        if (_isAdmin) ...[
                          _menuDivider(),
                          _ProfileMenuItem(
                            icon: Icons.admin_panel_settings,
                            label: 'Admin Dashboard',
                            badgeText: 'Admin',
                            badgeColor: const Color(0xFF5C2D91),
                            onTap: () => Navigator.of(context).pushNamed('/admin'),
                          ),
                        ],

                        _menuDivider(),

                        // Log Out
                        _ProfileMenuItem(
                          icon: Icons.logout,
                          label: 'Log Out',
                          textColor: Colors.red.shade400,
                          onTap: () {
                            adminService.clearCache();
                            FirebaseAuth.instance.signOut();
                            Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
                          },
                        ),

                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                ),

                // Bottom spacing
                const SliverToBoxAdapter(
                  child: SizedBox(height: 40),
                ),
              ],
            ),
    );
  }

  Widget _menuDivider() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Divider(height: 1, color: Colors.grey.shade200),
    );
  }
}

/// A single row in the profile menu list.
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
            Icon(icon, size: 22, color: textColor ?? Colors.grey.shade700),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: textColor ?? const Color(0xFF333333),
                ),
              ),
            ),
            if (badgeText != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
