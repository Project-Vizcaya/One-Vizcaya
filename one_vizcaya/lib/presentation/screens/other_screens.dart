import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/l10n/app_strings.dart';
import '../state/municipality_state.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/toast_utils.dart';

class OtherScreens extends StatelessWidget {
  const OtherScreens({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: Text('Other Screens')));
  }
}

// ═══════════════════════════════════════════
// SUPPORT & FAQs SCREEN
// ═══════════════════════════════════════════

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  int? _expandedIndex;

  List<Map<String, String>> get _faqs => [
    {'q': AppStrings.get('faq1q'), 'a': AppStrings.get('faq1a')},
    {'q': AppStrings.get('faq2q'), 'a': AppStrings.get('faq2a')},
    {'q': AppStrings.get('faq3q'), 'a': AppStrings.get('faq3a')},
    {'q': AppStrings.get('faq4q'), 'a': AppStrings.get('faq4a')},
    {'q': AppStrings.get('faq5q'), 'a': AppStrings.get('faq5a')},
    {'q': AppStrings.get('faq6q'), 'a': AppStrings.get('faq6a')},
    {'q': AppStrings.get('faq7q'), 'a': AppStrings.get('faq7a')},
    {'q': AppStrings.get('faq8q'), 'a': AppStrings.get('faq8a')},
    {'q': AppStrings.get('faq9q'), 'a': AppStrings.get('faq9a')},
    {'q': AppStrings.get('faq10q'), 'a': AppStrings.get('faq10a')},
  ];

  static const List<Map<String, dynamic>> _contactOptions = [
    {
      'icon': Icons.phone,
      'label': 'PDRRMO Nueva Vizcaya',
      'value': '09178500670',
      'type': 'phone',
      'color': Color(0xFF2E7D32),
    },
    {
      'icon': Icons.email,
      'label': 'Provincial Email',
      'value': 'pdrrmonuevavizcaya@gmail.com',
      'type': 'email',
      'color': Color(0xFF1565C0),
    },
    {
      'icon': Icons.language,
      'label': 'Official Website',
      'value': 'https://nuevavizcaya.gov.ph',
      'type': 'url',
      'color': Color(0xFF00796B),
    },
  ];

  Future<void> _launchContact(String type, String value) async {
    Uri uri;
    switch (type) {
      case 'phone':
        uri = Uri(scheme: 'tel', path: value);
        break;
      case 'email':
        uri = Uri(scheme: 'mailto', path: value);
        break;
      case 'url':
        uri = Uri.parse(value);
        break;
      default:
        return;
    }
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        ToastUtils.showError('Could not open $value');
      }
    } catch (e) {
      ToastUtils.showError('Failed to open: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final municipality = oneVizcayaState.selectedMunicipality.value;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: Colors.white,
        title: Text(
          AppStrings.get('faqTitle'),
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        elevation: 0,
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: AppConstants.kContentMaxWidth),
          child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Header Banner ──
            Container(
              color: lguColor,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      municipality,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppStrings.get('howCanWeHelp'),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    AppStrings.get('findAnswers'),
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            // ── Contact Us Section ──
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Text(
                AppStrings.get('contactUs'),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade500,
                  letterSpacing: 1.2,
                ),
              ),
            ),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: List.generate(_contactOptions.length, (i) {
                  final item = _contactOptions[i];
                  final isLast = i == _contactOptions.length - 1;
                  return Column(
                    children: [
                      ListTile(
                        leading: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: (item['color'] as Color).withValues(
                              alpha: 0.1,
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            item['icon'] as IconData,
                            color: item['color'] as Color,
                            size: 20,
                          ),
                        ),
                        title: Text(
                          item['label'] as String,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Text(
                          item['value'] as String,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        trailing: ExcludeSemantics(
                          child: Icon(
                            Icons.arrow_forward_ios,
                            size: 14,
                            color: Colors.grey.shade400,
                          ),
                        ),
                        onTap: () => _launchContact(
                          item['type'] as String,
                          item['value'] as String,
                        ),
                      ),
                      if (!isLast)
                        Divider(
                          height: 1,
                          indent: 68,
                          color: Theme.of(context).dividerColor,
                        ),
                    ],
                  );
                }),
              ),
            ),

            // ── FAQ Section ──
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
              child: Text(
                AppStrings.get('faqHeader'),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade500,
                  letterSpacing: 1.2,
                ),
              ),
            ),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: List.generate(_faqs.length, (i) {
                  final faq = _faqs[i];
                  final isExpanded = _expandedIndex == i;
                  final isLast = i == _faqs.length - 1;

                  return Column(
                    children: [
                      InkWell(
                        onTap: () => setState(() {
                          _expandedIndex = isExpanded ? null : i;
                        }),
                        borderRadius: BorderRadius.vertical(
                          top: i == 0 ? const Radius.circular(16) : Radius.zero,
                          bottom: isLast
                              ? const Radius.circular(16)
                              : Radius.zero,
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: isExpanded
                                      ? lguColor
                                      : lguColor.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: ExcludeSemantics(
                                  child: Icon(
                                    isExpanded ? Icons.remove : Icons.add,
                                    size: 14,
                                    color: isExpanded ? Colors.white : lguColor,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  faq['q']!,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                    color: isExpanded
                                        ? lguColor
                                        : Theme.of(context).colorScheme.onSurface,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      AnimatedCrossFade(
                        firstChild: const SizedBox.shrink(),
                        secondChild: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.fromLTRB(52, 0, 16, 14),
                          child: Text(
                            faq['a']!,
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade600,
                              height: 1.6,
                            ),
                          ),
                        ),
                        crossFadeState: isExpanded
                            ? CrossFadeState.showSecond
                            : CrossFadeState.showFirst,
                        duration: const Duration(milliseconds: 200),
                      ),
                      if (!isLast)
                        Divider(
                          height: 1,
                          indent: 52,
                          color: Theme.of(context).dividerColor,
                        ),
                    ],
                  );
                }),
              ),
            ),

            // ── Footer ──
            Padding(
              padding: EdgeInsets.fromLTRB(24, 16, 24, MediaQuery.of(context).padding.bottom + 48),
              child: Column(
                children: [
                  const Divider(),
                  const SizedBox(height: 12),
                  Text(
                    'One Vizcaya v${AppConstants.appVersion}',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Developed by Aaron Anthony A. Gano II\nNueva Vizcaya State University',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade500,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'In compliance with RA 10173 (Data Privacy Act of 2012)',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade400,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
          ),
        ),
    );
  }
}
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  String _formatTime(dynamic ts) {
    if (ts == null) return '';
    final dt = ts is Timestamp ? ts.toDate() : DateTime.now();
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return AppStrings.get('justNow');
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.month}/${dt.day}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final lguColor = oneVizcayaState.activeTheme['appBarColor'] as Color;
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: lguColor,
        foregroundColor: Colors.white,
        title: Text(AppStrings.get('notificationsTitle')),
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: AppConstants.kContentMaxWidth),
          child: user == null
          ? Center(child: Text(AppStrings.get('loginForNotifications')))
          : StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('users')
                  .doc(user.uid)
                  .collection('notifications')
                  .orderBy('timestamp', descending: true)
                  .limit(50)
                  .snapshots(),
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snap.hasError) {
                  return Center(
                    child: Text(
                      'Could not load notifications.',
                      style: TextStyle(color: Colors.grey.shade500),
                    ),
                  );
                }
                final docs = snap.data?.docs ?? [];
                if (docs.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.notifications_none,
                            size: 64,
                            color: Colors.grey.shade300,
                            semanticLabel: 'No notifications'),
                        const SizedBox(height: 16),
                        Text(
                          AppStrings.get('allCaughtUp'),
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w500,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          AppStrings.get('notifyWhenChanged'),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade400,
                          ),
                        ),
                      ],
                    ),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.symmetric(
                      vertical: 12, horizontal: 16),
                  itemCount: docs.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final data = docs[i].data() as Map<String, dynamic>;
                    final isRead = data['read'] == true;
                    final statusColors = {
                      'solved':   const Color(0xFF2E7D32),
                      'success':  const Color(0xFF2E7D32),
                      'ongoing':  const Color(0xFFE65100),
                      'reported': const Color(0xFF1565C0),
                      'info':     const Color(0xFF1565C0),
                    };
                    final notifStatus = data['status'] as String? ?? 'info';
                    final statusColor = statusColors[notifStatus] ?? lguColor;
                    return Container(
                      decoration: BoxDecoration(
                        color: isRead
                            ? Theme.of(context).cardColor
                            : lguColor.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isRead
                              ? Theme.of(context).dividerColor
                              : lguColor.withValues(alpha: 0.25),
                        ),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        leading: CircleAvatar(
                          backgroundColor: statusColor.withValues(alpha: 0.15),
                          child: Icon(
                            (notifStatus == 'solved' || notifStatus == 'success')
                                ? Icons.check_circle
                                : notifStatus == 'ongoing'
                                    ? Icons.construction
                                    : notifStatus == 'info'
                                        ? Icons.send
                                        : Icons.flag,
                            color: statusColor,
                            size: 20,
                          ),
                        ),
                        title: Text(
                          data['title'] ?? 'Update',
                          style: TextStyle(
                            fontWeight: isRead
                                ? FontWeight.normal
                                : FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text(data['body'] ?? '',
                                style: const TextStyle(fontSize: 13)),
                            const SizedBox(height: 4),
                            Text(
                              _formatTime(data['timestamp']),
                              style: const TextStyle(
                                  fontSize: 11, color: Colors.grey),
                            ),
                          ],
                        ),
                        trailing: !isRead
                            ? Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                    color: lguColor,
                                    shape: BoxShape.circle),
                              )
                            : null,
                        onTap: () {
                          if (!isRead) {
                            docs[i].reference.update({'read': true});
                          }
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ),
    );
  }
}
